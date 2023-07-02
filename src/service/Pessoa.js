const { Router } = require("express");
const { abrirConexao, fecharConexao, conexao, commit, rollback, gerarSequence } = require('../database/conexao')
const { verificarCodigoPessoa } = require("../validacoes/codigoExistente");

const pessoa = Router();

// FUNÇÃO GET QUE PERMITE UTILIZAR FILTROS (codigoPessoa, nome, sobrenome, idade, login, senha, status).
pessoa.get('/', consultarPessoa);

async function consultarPessoa(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Chama o método abrir conexão para estabelecer a ligação com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Capta os parâmetros da requisição.
        const parametros = request.query;
        // Define uma 'Lista' filtroParametros contendo os nomes dos parâmetros que podem ser usados como filtragem da tabela Bairro.
        const filtroParametros = ['nome', 'sobrenome', 'idade', 'login', 'senha', 'status'];
        // Cria um objeto dto vazio para armazenar os valores dos parâmetros de filtro.
        let dto = {};
        // Inicializa uma variável sql com uma consulta SQL que seleciona os campos da tabela Pessoa, caso não seja usado o filtro de codigoPessoa.
        let sql = `SELECT "CODIGO_PESSOA", "NOME", "SOBRENOME", "IDADE", "LOGIN", "SENHA", "STATUS"
           FROM "TB_PESSOA"`;

        // Verifica se o parâmetro codigoPessoa está presente na requisição.
        if (parametros.codigoPessoa) {
            // Faz a verifição se o codigoPessoa é do tipo Number.
            if (isNaN(parametros.codigoPessoa)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo pessoa aceita apenas números e vc pesquisou por: ${parametros.codigoPessoa}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Realiza a  consulta SQL para incluir o join com outras tabelas, caso seja passado o parâmetro codigoPessoa na query.
            sql = `SELECT *
         FROM TB_PESSOA
         JOIN TB_ENDERECO ON TB_PESSOA.CODIGO_PESSOA = TB_ENDERECO.CODIGO_PESSOA
         JOIN TB_BAIRRO ON TB_ENDERECO.CODIGO_BAIRRO = TB_BAIRRO.CODIGO_BAIRRO
         JOIN TB_MUNICIPIO ON TB_BAIRRO.CODIGO_MUNICIPIO = TB_MUNICIPIO.CODIGO_MUNICIPIO
         JOIN TB_UF ON TB_MUNICIPIO.CODIGO_UF = TB_UF.CODIGO_UF
         WHERE TB_PESSOA.CODIGO_PESSOA = :codigoPessoa`;

            // Adiciona o valor do parâmetro ao atributo codigoPessoa do objeto Dto.
            dto.codigoPessoa = parametros.codigoPessoa;

        } else {
            // Se o parâmetro codigoPessoa não esteja presente na query, itera sobre cada parâmetro de filtro e, se estiver presente na solicitação(request.query[param]), adiciona uma cláusula WHERE na consulta sql e adiciona o valor do parâmetro ao objeto dto.
            filtroParametros.forEach((parametro, index) => {
                if (parametros[parametro]) {
                    // Adiciona as condições WHERE e AND à consulta SQL conforme os parâmetros informados
                    sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
                    // Concatena os parametros utilizados para filtro
                    sql += ` ${parametro.toUpperCase()} = :${parametro}${index}`;
                    // Gera um objeto que será preenchido com os valroes filtrados
                    dto[`${parametro}${index}`] = parametros[parametro];
                }
            });
        }
        // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
        let resultado = await conexaoAberta.execute(sql, dto);
        // Cria uma lista vazia de pessoas.
        let listaPessoas = [];
        // Cria um map para armazenar as pessoas e seus endereços.
        let pessoaMap = new Map();

        // Percorre as linhas de resultado da consulta
        resultado.rows.forEach((row) => {
            const codigoPessoa = row[0];
            // Se a pessoa ainda não existe no map, cria um novo objeto de pessoa e o adiciona ao map.
            if (!pessoaMap.has(codigoPessoa)) {
                pessoaMap.set(codigoPessoa, {
                    codigoPessoa: row[0],
                    nome: row[1],
                    sobrenome: row[2],
                    idade: row[3],
                    login: row[4],
                    senha: row[5],
                    status: row[6],
                    enderecos: []
                });
            }
            // Obtem a referência da pessoa no map
            const pessoa = pessoaMap.get(codigoPessoa);
            // Se o parâmetro codigoPessoa estiver presente na requisição, concatena os dados de endereço à pessoa.
            if (parametros.codigoPessoa) {
                pessoa.enderecos.push({
                    codigoEndereco: row[7],
                    codigoPessoa: row[8],
                    codigoBairro: row[9],
                    nomeRua: row[10],
                    numero: row[11],
                    complemento: row[12],
                    cep: row[13],
                    bairro: {
                        codigoBairro: row[14],
                        codigoMunicipio: row[15],
                        nome: row[16],
                        status: row[17],
                    },
                    municipio: {
                        codigoMunicipio: row[18],
                        codigoUF: row[19],
                        nome: row[20],
                        status: row[21],
                        uf: {
                            codigoUF: row[22],
                            sigla: row[23],
                            nome: row[24],
                            status: row[25]
                        }
                    }
                });
            }
        });
        // Converter o map em um array de pessoas e os ordena pelo codigoPessoa em ordem decrescente.
        listaPessoas = Array.from(pessoaMap.values()).sort((a, b) => b.codigoPessoa - a.codigoPessoa);
        // Gera o log com os possíveis dados que podem ou não existir na tabela Pessoa.
        console.log(resultado.rows);
        // Gera o status 200 e gera a lista em formato json caso ocorra tudo certo!
        response.status(200).json(listaPessoas);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // A função rollback consegue desfazer uma ação, caso ocorra um erro ele retorna a um ponto sem erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível consultar a tabela de Pessoas no banco de dados.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação fecharia a conexao com o banco
    } finally {
        // Fecha a conexão com o banco de dados!
        await fecharConexao();
    }
}

// FUNÇÃO QUE PERMITE ADICIONAR UMA PESSOA ATRAVÉS DE UMA REQUISIÇÃO POST
pessoa.post('/', postPessoa);

async function postPessoa(request, response) {
    // Envolve o código para o tratamento de erros.
    try {
        // Captura os dados enviados na requisição.
        const dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();

        // Valida apenas inserções do status com valor 1.
        if (dto.status !== 1) {
            return response.status(400).json({
                status: 400,
                mensagem: `Não é possível adicionar um status com um número diferente de 1!  Status inserido: ${dto.status}`
            });
        }
        // Gera um código de forma crescente por meio de uma sequência para o atributo codigoPessoa(Primary Key).
        const codigoPessoa = await gerarSequence('SEQUENCE_PESSOA');
        // Adiciona o código de pessoa ao DTO.
        dto.codigoPessoa = codigoPessoa;
        // Consulta SQL para inserir uma pessoa na tabela de pessoa.
        const sqlPessoa = `
      INSERT INTO TB_PESSOA ("CODIGO_PESSOA", "NOME", "SOBRENOME", "IDADE", "LOGIN", "SENHA", "STATUS")
      VALUES (:codigoPessoa, :nome, :sobrenome, :idade, :login, :senha, :status)
    `;
        // Objeto Dto para a pessoa.
        const pessoaDto = {
            codigoPessoa: dto.codigoPessoa,
            nome: dto.nome,
            sobrenome: dto.sobrenome,
            idade: dto.idade,
            login: dto.login,
            senha: dto.senha,
            status: dto.status
        };

        // Executa o SQL para gravar os dados no banco de dados.
        await conexaoAberta.execute(sqlPessoa, pessoaDto);
        // Gera um log para sabermos se os registros foram inseridos com sucesso.
        console.log('FOI INSERIDO 1 REGISTRO NA TABELA TB_PESSOA');
        // Obtem a lista de endereços do Dto caso ela exista.
        const enderecos = dto.enderecos || [];
        // Percorre a lista de endereços e insere cada um na tabela de endereco.
        for (const endereco of enderecos) {
            // Gera um código de forma crescente por meio de uma sequência para o atributo codigoEndereco(Foreign Key).
            const codigoEndereco = await gerarSequence('SEQUENCE_ENDERECO');
            // Adiciona o codigoEndereco e o codigoPessoa ao objeto de endereço.
            endereco.codigoEndereco = codigoEndereco;
            endereco.codigoPessoa = codigoPessoa;

            // Gera o SQL para inserir os valores digitados na request em seus respectivos campos.
            const enderecoSql = `
        INSERT INTO TB_ENDERECO ("CODIGO_ENDERECO", "CODIGO_PESSOA", "CODIGO_BAIRRO", "NOME_RUA", "NUMERO", "COMPLEMENTO", "CEP")
        VALUES (:codigoEndereco, :codigoPessoa, :codigoBairro, :nomeRua, :numero, :complemento, :cep)
      `;
            // Objeto Dto para o endereço.
            const enderecoDto = {
                codigoEndereco: endereco.codigoEndereco,
                codigoPessoa: endereco.codigoPessoa,
                codigoBairro: endereco.codigoBairro,
                nomeRua: endereco.nomeRua,
                numero: endereco.numero,
                complemento: endereco.complemento,
                cep: endereco.cep
            };
            // Executa o SQL para gravar os dados no banco de dados.
            let resultSet = await conexaoAberta.execute(enderecoSql, enderecoDto);
            // Gera um log para sabermos se os registros foram inseridos com sucesso.
            console.log('FORAM INSERIDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        }
        // Confirma as inserções feitas e salva no banco de dados!
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas as Pessoas presentes no banco de dados.
        await consultarPessoa(request, response);

        // Capta os possíveis erros gerados.
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição.
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível incluir a pessoa no banco de dados.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação será fechado a conexao com o banco de dados.
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
};

// FUNÇÃO QUE PERMITE ALTERAR UMA PESSOA ATRAVÉS DE UMA REQUISIÇÃO PUT
pessoa.put('/', atualizarPessoa)

async function atualizarPessoa(request, response) {
    // Envolve o código para o tratamento de erros.
    try {
        // Captura os dados enviados na requisição
        const dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Variável responsável por chamar o método que verifica se existe o codigoPessoa passado no corpo requisição.
        let codigoPessoaExistente = await verificarCodigoPessoa(dto)
        // Faz a validação utilizando o método citado anteriormente.
        if (!codigoPessoaExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a Pessoa, visto que não existe uma pessoa com o código: ${dto.codigoPessoa}`,
            };
            return response.status(400).json(jsonRetorno);
        }
        // Atribui o valor de codigoPessoa = dto.codigoPessoa
        const codigoPessoa = dto.codigoPessoa;

        // Valida apenas inserções do status = 1 ou 2.
        if (dto.status < 1 || dto.status > 2) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não é possível adicionar um status menor que 1 ou maior que 2!  Status inserido: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }

        // Gera o SQL para alterar os valores de uma pessoa no banco de dados.
        const updatePessoaSql = `
      UPDATE TB_PESSOA
      SET "NOME" = :nome,
          "SOBRENOME" = :sobrenome,
          "IDADE" = :idade,
          "LOGIN" = :login,
          "SENHA" = :senha,
          "STATUS" = :status
      WHERE "CODIGO_PESSOA" = :codigoPessoa
    `;
        // Objeto Dto para a pessoa.
        const pessoaDto = {
            codigoPessoa: dto.codigoPessoa,
            nome: dto.nome,
            sobrenome: dto.sobrenome,
            idade: dto.idade,
            login: dto.login,
            senha: dto.senha,
            status: dto.status
        };
        // Executa o SQL citado anteriormente.
        let resultSet = await conexaoAberta.execute(updatePessoaSql, pessoaDto);
        // Gera um log para sabermos se os registros foram alterados com sucesso.
        console.log('FORAM ALTERADOS: ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS.');
        // Obtem a lista de endereços do dto caso ela exista.
        const enderecos = dto.enderecos || [];
        // Percorre a lista de endereços e insere cada um na tabela de enderecos.
        for (const endereco of enderecos) {
            // Gera um código de forma crescente por meio de uma sequência para o atributo codigoEndereco(Foreign Key).
            const codigoEndereco = await gerarSequence('SEQUENCE_ENDERECO');
            // Adicionar o codigoEndereco e o codigoPessoa ao objeto de endereço.
            endereco.codigoEndereco = codigoEndereco;
            endereco.codigoPessoa = codigoPessoa;

            // Consulta SQL para inserir o endereço na tabela de enderecos.
            const insertEnderecoSql = `
        INSERT INTO TB_ENDERECO ("CODIGO_ENDERECO", "CODIGO_PESSOA", "CODIGO_BAIRRO", "NOME_RUA", "NUMERO", "COMPLEMENTO", "CEP")
        VALUES (:codigoEndereco, :codigoPessoa, :codigoBairro, :nomeRua, :numero, :complemento, :cep)
      `;
            // Objeto Dto para o endereço.
            const enderecoDto = {
                codigoEndereco: endereco.codigoEndereco,
                codigoPessoa: endereco.codigoPessoa,
                codigoBairro: endereco.codigoBairro || null,
                nomeRua: endereco.nomeRua || null,
                numero: endereco.numero || null,
                complemento: endereco.complemento || null,
                cep: endereco.cep || null
            };
            // Executa o SQL para inserir o endereço na tabela de enderecos.
            let resultSet = await conexaoAberta.execute(insertEnderecoSql, enderecoDto);
            // Gera um log para sabermos se os registros foram inseridos com sucesso.
            console.log('FORAM INSERIDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        }
        // Confirma as inserções feitas e salva no banco de dados!
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas as Pessoas presentes no banco de dados.
        await consultarPessoa(request, response);

        // Capta os possíveis erros gerados.
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição.
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível alterar a pessoa no banco de dados!'
        };
        // retorna o status e a mensagem de erro para o usuário.
        response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação será fechado a conexao com o banco de dados.
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
};





module.exports = pessoa;
