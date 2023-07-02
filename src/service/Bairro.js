const { Router } = require("express");
const { abrirConexao, fecharConexao, rollback, gerarSequence, commit } = require('../database/conexao');
const { verificarCodigoMunicipio, verificarCodigoBairro } = require("../validacoes/codigoExistente");

const bairro = Router();

// FUNÇÃO GET QUE PERMITE UTILIZAR FILTROS (codigoBairo, codigoMunicipio, nome, status).
bairro.get('/', consultarBairro)
async function consultarBairro(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Chama o método abrir conexão para estabelecer a ligação com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Inicializa uma variável sql com uma consulta SQL que seleciona os campos da tabela Bairro.
        let sql = 'SELECT CODIGO_BAIRRO, CODIGO_MUNICIPIO, NOME, STATUS FROM TB_BAIRRO';
        // Cria um objeto dto vazio para armazenar os valores dos parâmetros de filtro.
        let dto = {};
        // Define uma 'Lista' filtroParametros contendo os nomes dos parâmetros que podem ser usados como filtragem da tabela Bairro.
        const filtroParametros = ['nome', 'status'];
        // Itera sobre cada parâmetro de filtro e, se estiver presente na solicitação(request.query[param]), adiciona uma cláusula WHERE na consulta sql e adiciona o valor do parâmetro ao objeto dto.
        filtroParametros.forEach((parametro, index) => {
            // Verifica se os parâmetros da constante filtroParametros estão presentes na query.
            if (request.query[parametro]) {
                // Adiciona as condições WHERE e AND à consulta SQL conforme os parâmetros informados
                sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
                // Concatena os parametros utilizados para a filtragem.
                sql += ` ${parametro.toUpperCase()} = :${parametro}${index}`;
                // Gera um objeto que será preenchido com os valroes filtrados
                dto[`${parametro}${index}`] = request.query[parametro];
            }
        });

        // Faz a verifição se o codigoBairro é do tipo Number.
        if (request.query.codigoBairro) {
            const codigoBairro = Number(request.query.codigoBairro);
            if (isNaN(codigoBairro)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo bairro aceita apenas números!! E vc pesquisou por: ${request.query.codigoBairro}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Contatena o sql para que seja filtrado por codigoBairro.
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_BAIRRO = :codigoBairro';
            dto.codigoBairro = request.query.codigoBairro;
        }

        // Faz a verifição se o codigoMunicipio é do tipo Number.
        if (request.query.codigoMunicipio) {
            const codigoMunicipio = Number(request.query.codigoMunicipio);
            if (isNaN(codigoMunicipio)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo município aceita apenas números!! E vc pesquisou por: ${request.query.codigoMunicipio}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Contatena o sql para que seja filtrado por codigoMunicipio.
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_MUNICIPIO = :codigoMunicipio';
            dto.codigoMunicipio = codigoMunicipio;
        }

        // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
        let resultado = await conexaoAberta.execute(sql, dto);
        // Mapeia o resultado da consulta para um array listaBairro, onde cada objeto e sua posição é representado.
        let listaBairros = resultado.rows.map(row => ({
            codigoBairro: row[0],
            codigoMunicipio: row[1],
            nome: row[2],
            status: row[3]
        }));

        // Método do Javascript para ordenar uma lista.
        // após a arrow function, ao utilizar "b" antes do "a" faz com que a lista seja ordenada de forma decrescente.
        listaBairros.sort((a, b) => b.codigoBairro - a.codigoBairro);
        // Gera o log com os possíveis dados que podem ou não existir na tabela Bairro.
        console.log(resultado.rows);
        // Gera o status 200 e gera a lista em formato json caso ocorra tudo certo!
        response.status(200).json(listaBairros);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // A função rollback consegue desfazer uma ação, caso ocorra um erro ele retorna a um ponto sem erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível consultar a tabela Bairro no banco de dados.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação fecharia a conexao com o banco
    } finally {
        // Fecha a conexão com o banco de dados!
        await fecharConexao();
    }
};

// FUNÇÃO QUE PERMITE ADICIONAR UM BAIRRO ATRAVÉS DE UMA REQUISIÇÃO POST.
bairro.post('/', adicionarBairro)
async function adicionarBairro(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Captura os dados enviados na requisição
        let dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Valida apenas inserções do status com valor 1.
        if (dto.status !== 1) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não é possível adicionar um status com um número diferente de 1!  Status inserido: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }
        // Variável responsável por chamar o método de validação de codigoMunicipio já existente no banco de dados.
        let codigoMunicipioExistente = await verificarCodigoMunicipio(dto);
        // Verifica se já existe um registro com o mesmo codigoMunicipio.
        if (!codigoMunicipioExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar o bairro, visto que não existe um município com o código: ${dto.codigoMunicipio}`,
            };
            return response.status(400).json(jsonRetorno);
        }
        // Gera um código de forma crescente por meio de uma sequência para o atributo codigoBairro(Primary Key).
        dto.codigoBairro = await gerarSequence('SEQUENCE_BAIRRO');
        // Gera o SQL para inserir os valores digitados na request em seus respectivos campos.
        let sql = 'INSERT INTO TB_BAIRRO (CODIGO_BAIRRO, CODIGO_MUNICIPIO, NOME, STATUS) VALUES (:codigoBairro, :codigoMunicipio, :nome, :status)';
        // Executa o SQL para gravar os dados no banco de dados.
        let resultSet = await conexaoAberta.execute(sql, dto);
        // Gera um log para sabermos se os registros foram inseridos com sucesso
        console.log('FORAM INSERIDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        // Confirma as inserções feitas e salva no banco de dados!
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas os Bairros presentes no banco de dados.
        await consultarBairro(request, response);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível incluir o Bairro no banco de dados!'
        };
        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação será fechado a conexao com o banco de dados.
    } finally {
        // Fecha a conexão com o banco de dados
        await fecharConexao();
    }
}

// FUNÇÃO QUE PERMITE ALTERAR UM BAIRRO ATRAVÉS DE UMA REQUISIÇÃO PUT
bairro.put('/', alterarBairro)
async function alterarBairro(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Captura os dados enviados na requisição
        let dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Variável responsável por chamar o método que verifica se existe o codigoBairro passado no corpo da requisição.
        let codigoBairroExistente = await verificarCodigoBairro(dto)
        // Faz a validação utilizando o método citado anteriormente.
        if (!codigoBairroExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar o Bairro, visto que não existe um bairro com o código: ${dto.codigoBairro}`,
            };
            return response.status(400).json(jsonRetorno);
        }
        // Variável responsável por chamar o método que verifica se existe o codigoMunicipio passado no corpo da requisição.
        let codigoMunicipioExistente = await verificarCodigoMunicipio(dto)
        // Faz a validação utilizando o método citado anteriormente.
        if (!codigoMunicipioExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar o Bairro, visto que não existe um município com o código: ${dto.codigoMunicipio}`,
            };
            return response.status(400).json(jsonRetorno);
        }

        // Valida apenas inserções do status = 1 ou 2.
        if (dto.status < 1 || dto.status > 2) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não é possível adicionar um status menor que 1 ou maior que 2!  Status inserido: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }
        // Gera o SQL para alterar os valores de um Bairro no banco de dados.
        let sql = 'UPDATE TB_BAIRRO SET CODIGO_MUNICIPIO = :codigoMunicipio, NOME = :nome, STATUS = :status WHERE CODIGO_BAIRRO = :codigoBairro';
        // Executa o SQL citado anteriormente.
        let resultSet = await conexaoAberta.execute(sql, dto);
        // Gera um log para sabermos se os registros foram alterados com sucesso.
        console.log('FORAM ALTERADOS: ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS.');
        // Confirma as inserções feitas no banco de dados e salva.
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas os Bairros presentes no banco de dados.
        await consultarBairro(request, response);

        // Capta os possíveis erros gerados.
    } catch (err) {
        // Gera um log com os possíveis erros da requisição.
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível fazer a alteração na tabela Bairro'
        };
        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que uma ação seja realizada independente de erros na aplicação.
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
}

module.exports = bairro;