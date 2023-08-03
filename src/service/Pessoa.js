const { Router } = require("express");
const { abrirConexao, fecharConexao, conexao, commit, rollback, gerarSequence } = require('../database/conexao')
const { verificarCodigoPessoa, verificarCodigoBairro, verificarCodigoEndereco, buscarEnderecos } = require("../validacoes/codigoExistente");
const { verificarLoginExistente, verificarRegistroLoginExistente } = require("../validacoes/loginExistente");

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

        // Verifica se o parâmetro codigoPessoa está presente na requisição.
        if (parametros.codigoPessoa) {
            // Faz a verifição se o codigoPessoa é do tipo Number.
            if (isNaN(parametros.codigoPessoa)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo pessoa aceita apenas números e você pesquisou por: ${parametros.codigoPessoa}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Realiza a consulta SQL específica para obter apenas um objeto que corresponda ao filtro codigoPessoa.
            const sql = `SELECT *
                FROM TB_PESSOA
                JOIN TB_ENDERECO ON TB_PESSOA.CODIGO_PESSOA = TB_ENDERECO.CODIGO_PESSOA
                JOIN TB_BAIRRO ON TB_ENDERECO.CODIGO_BAIRRO = TB_BAIRRO.CODIGO_BAIRRO
                JOIN TB_MUNICIPIO ON TB_BAIRRO.CODIGO_MUNICIPIO = TB_MUNICIPIO.CODIGO_MUNICIPIO
                JOIN TB_UF ON TB_MUNICIPIO.CODIGO_UF = TB_UF.CODIGO_UF
                WHERE TB_PESSOA.CODIGO_PESSOA = :codigoPessoa`;

            // Adiciona o valor do parâmetro ao atributo codigoPessoa do objeto Dto.
            dto.codigoPessoa = parametros.codigoPessoa;

            // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
            const resultado = await conexaoAberta.execute(sql, dto);

            // Se houver resultado, retorna apenas um objeto correspondente ao filtro codigoPessoa.
            if (resultado.rows.length > 0) {
                const row = resultado.rows[0];

                const mapEnderecos = new Map();

                // Loop para iterar sobre os endereços encontrados na consulta SQL e adicionar ao Map
                for (let i = 0; i < resultado.rows.length; i++) {
                    // Variável para armazenar o índice inicial da coluna dos dados do endereço atual
                    const indiceInicioEndereco = 0; // Cada endereço ocupa 19 posições no resultado (7 colunas da pessoa + 18 colunas do endereço)

                    // Criar o objeto de endereço
                    const endereco = {
                        codigoEndereco: resultado.rows[i][indiceInicioEndereco + 7],
                        codigoPessoa: resultado.rows[i][indiceInicioEndereco + 8],
                        codigoBairro: resultado.rows[i][indiceInicioEndereco + 9],
                        nomeRua: resultado.rows[i][indiceInicioEndereco + 10],
                        numero: resultado.rows[i][indiceInicioEndereco + 11],
                        complemento: resultado.rows[i][indiceInicioEndereco + 12],
                        cep: resultado.rows[i][indiceInicioEndereco + 13],
                        bairro: {
                            codigoBairro: resultado.rows[i][indiceInicioEndereco + 14],
                            codigoMunicipio: resultado.rows[i][indiceInicioEndereco + 15],
                            nome: resultado.rows[i][indiceInicioEndereco + 16],
                            status: resultado.rows[i][indiceInicioEndereco + 17],
                            municipio: {
                                codigoMunicipio: resultado.rows[i][indiceInicioEndereco + 18],
                                codigoUF: resultado.rows[i][indiceInicioEndereco + 19],
                                nome: resultado.rows[i][indiceInicioEndereco + 20],
                                status: resultado.rows[i][indiceInicioEndereco + 21],
                                uf: {
                                    codigoUF: resultado.rows[i][indiceInicioEndereco + 22],
                                    sigla: resultado.rows[i][indiceInicioEndereco + 23],
                                    nome: resultado.rows[i][indiceInicioEndereco + 24],
                                    status: resultado.rows[i][indiceInicioEndereco + 25]
                                }
                            }
                        },
                    };

                    // Adicionar o endereço criado ao Map, utilizando o codigoEndereco como chave
                    mapEnderecos.set(endereco.codigoEndereco, endereco);
                }

                const pessoa = {
                    codigoPessoa: row[0],
                    nome: row[1],
                    sobrenome: row[2],
                    idade: row[3],
                    login: row[4],
                    senha: row[5],
                    status: row[6],
                    endereco: Array.from(mapEnderecos.values()) // Transformar os valores do Map em um array
                };

                // Gera o status 200 e gera o objeto em formato json.
                response.status(200).json(pessoa);
            } else {
                // Se não houver resultado para o filtro codigoPessoa, retorna uma lista vazia.
                response.status(200).json([]);
            }


        } else {
            // Caso contrário, itera sobre cada parâmetro de filtro e, se estiver presente na solicitação(request.query[param]), adiciona uma cláusula WHERE na consulta sql e adiciona o valor do parâmetro ao objeto dto.
            let sql = `SELECT "CODIGO_PESSOA", "NOME", "SOBRENOME", "IDADE", "LOGIN", "SENHA", "STATUS"
                FROM "TB_PESSOA"`;

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

            if (request.query.status) {
                const status = Number(request.query.status);
                if (isNaN(status)) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível realizar a consulta, pois o status aceita apenas números!! E vc pesquisou por: ${request.query.status}`
                    };
                    return response.status(400).json(jsonRetorno);
                }
            }

            // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
            const resultado = await conexaoAberta.execute(sql, dto);
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
            })

            // Converter o map em um array de pessoas e os ordena pelo codigoPessoa em ordem decrescente.
            listaPessoas = Array.from(pessoaMap.values()).sort((a, b) => b.codigoPessoa - a.codigoPessoa);
            // Gera o log com os possíveis dados que podem ou não existir na tabela Pessoa.
            console.log(resultado.rows);
            // Gera o status 200 e gera a lista em formato json caso ocorra tudo certo!
            response.status(200).json(listaPessoas);
        }

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


        const status = Number(dto.status);
        if (isNaN(status)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível inserir a Pessoa, pois o status aceita apenas números!! E vc tentou inserir: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }
        // Valida apenas inserções do status com valor 1.
        if (dto.status != 1) {
            return response.status(400).json({
                status: 400,
                mensagem: `Não é possível adicionar um status com um número diferente de 1!  Status inserido: ${dto.status}`
            });
        }

        let loginExistente = await verificarLoginExistente(dto, "TB_PESSOA");

        if (loginExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Já existe um registro com o mesmo login: ${dto.login}`
            };
            return response.status(400).json(jsonRetorno);
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

            const codigoBairro = Number(endereco.codigoBairro);
            if (isNaN(codigoBairro)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível cadastar a pessoa, pois o codigo bairro aceita apenas números!! E vc pesquisou por: ${endereco.codigoBairro}`
                };
                return response.status(400).json(jsonRetorno);
            }

            let codigoBairroExistente = await verificarCodigoBairro(endereco)
            // Faz a validação utilizando o método citado anteriormente.
            if (!codigoBairroExistente) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível inserir a Pessoa, visto que não existe um bairro com o código: ${endereco.codigoBairro}`,
                };
                return response.status(400).json(jsonRetorno);
            }
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
    try {
        const dto = request.body;
        const conexaoAberta = await abrirConexao();

        const codigoPessoa = Number(request.body.codigoPessoa);
        if (isNaN(codigoPessoa)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a Pessoa, pois o codigo Pessoa aceita apenas números!! E vc tentou inserir: ${dto.codigoPessoa}`
            };
            return response.status(400).json(jsonRetorno);
        }

        let codigoPessoaExistente = await verificarCodigoPessoa(dto);
        if (!codigoPessoaExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a Pessoa, visto que não existe uma pessoa com o código: ${dto.codigoPessoa}`,
            };
            return response.status(400).json(jsonRetorno);
        }

        const status = Number(request.body.status);
        if (isNaN(status)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a Pessoa, pois o status aceita apenas números!! E vc tentou inserir: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }

        if (dto.status < 1 || dto.status > 2) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não é possível adicionar um status menor que 1 ou maior que 2!  Status inserido: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }

        let loginExistente = await verificarLoginExistente(dto, "TB_PESSOA");
        let registroLoginExistente = await verificarRegistroLoginExistente(dto, "TB_PESSOA", dto);

        if (loginExistente && registroLoginExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Já existe um registro com o mesmo login: ${dto.login}`
            };
            return response.status(400).json(jsonRetorno);
        }

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

        const pessoaDto = {
            codigoPessoa: dto.codigoPessoa,
            nome: dto.nome,
            sobrenome: dto.sobrenome,
            idade: dto.idade,
            login: dto.login,
            senha: dto.senha,
            status: dto.status
        };

        let resultSet = await conexaoAberta.execute(updatePessoaSql, pessoaDto);
        console.log('FORAM ALTERADOS: ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS.');

        const enderecos = dto.enderecos || [];


        listaEnderecos = await buscarEnderecos(dto);

        console.log(`LISTA COM TODOS OS ENDEREÇOS DE ${dto.nome} ${dto.sobrenome}:`, listaEnderecos);

        const enderecosParaExcluir = [];
        for (let i = 0; i < listaEnderecos.length; i++) {
            const endereco = listaEnderecos[i][0];
            const enderecoEncontrado = enderecos.find(
                (e) => e.codigoEndereco == endereco
            );
            console.log("ENDEREÇO PRESENTE NA REQUISIÇÃO:", enderecoEncontrado);
            if (!enderecoEncontrado) {
                enderecosParaExcluir.push(endereco);
            }
        }

        console.log("ENDEREÇOS A SEREM EXCLUÍDOS:", enderecosParaExcluir);

        for (const endereco of enderecosParaExcluir) {
            const deleteEnderecoSql = `
                DELETE FROM TB_ENDERECO
                WHERE "CODIGO_ENDERECO" = :codigoEndereco
            `;

            const enderecoDto = {
                codigoEndereco: endereco
            };

            resultSet = await conexaoAberta.execute(deleteEnderecoSql, enderecoDto);
            console.log('FORAM EXCLUÍDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        }


        for (const endereco of enderecos) {
            if (endereco.codigoEndereco) {
                const updateEnderecoSql = `
                    UPDATE TB_ENDERECO
                    SET "CODIGO_PESSOA" = :codigoPessoa,
                        "CODIGO_BAIRRO" = :codigoBairro,
                        "NOME_RUA" = :nomeRua,
                        "NUMERO" = :numero,
                        "COMPLEMENTO" = :complemento,
                        "CEP" = :cep
                    WHERE "CODIGO_ENDERECO" = :codigoEndereco
                `;

                const enderecoDto = {
                    codigoEndereco: endereco.codigoEndereco,
                    codigoPessoa: endereco.codigoPessoa,
                    codigoBairro: endereco.codigoBairro || null,
                    nomeRua: endereco.nomeRua || null,
                    numero: endereco.numero || null,
                    complemento: endereco.complemento || null,
                    cep: endereco.cep || null
                };

                const codigoPessoa = Number(enderecoDto.codigoPessoa);
                if (isNaN(codigoPessoa)) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, pois o codigo Pessoa aceita apenas números e vc tentou inserir: ${enderecoDto.codigoPessoa}`
                    };
                    return response.status(400).json(jsonRetorno);
                }

                let codigoPessoaExistente = await verificarCodigoPessoa(enderecoDto);
                if (!codigoPessoaExistente) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, visto que não existe uma Pessoa com o código: ${enderecoDto.codigoPessoa}`,
                    };
                    return response.status(400).json(jsonRetorno);
                }

                const codigoEndereco = Number(enderecoDto.codigoEndereco);
                if (isNaN(codigoEndereco)) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, pois o codigo Endereco aceita apenas números e vc tentou inserir: ${enderecoDto.codigoEndereco}`
                    };
                    return response.status(400).json(jsonRetorno);
                }

                let codigoEnderecoExistente = await verificarCodigoEndereco(enderecoDto)
                // Faz a validação utilizando o método citado anteriormente.
                if (!codigoEnderecoExistente) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, visto que não existe um codigo Endereço com o código: ${enderecoDto.codigoEndereco}`,
                    };
                    return response.status(400).json(jsonRetorno);
                }

                const codigoBairro = Number(enderecoDto.codigoBairro);
                if (isNaN(codigoBairro)) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, pois o codigo Bairro aceita apenas números e vc tentou inserir: ${enderecoDto.codigoBairro}`
                    };
                    return response.status(400).json(jsonRetorno);
                }

                let codigoBairroExistente = await verificarCodigoBairro(enderecoDto)
                // Faz a validação utilizando o método citado anteriormente.
                if (!codigoBairroExistente) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, visto que não existe um bairro com o código: ${enderecoDto.codigoBairro}`,
                    };
                    return response.status(400).json(jsonRetorno);
                }


                resultSet = await conexaoAberta.execute(updateEnderecoSql, enderecoDto);
                console.log('FORAM ALTERADOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');

            } else {

                const codigoPessoa = Number(endereco.codigoPessoa);
                if (isNaN(codigoPessoa)) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, pois o codigo Pessoa aceita apenas números e vc tentou inserir: ${endereco.codigoPessoa}`
                    };
                    return response.status(400).json(jsonRetorno);
                }

                let codigoPessoaExistente = await verificarCodigoPessoa(endereco);
                if (!codigoPessoaExistente) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, visto que não existe uma Pessoa com o código: ${endereco.codigoPessoa}`,
                    };
                    return response.status(400).json(jsonRetorno);
                }

                dto.codigoEndereco = await gerarSequence('SEQUENCE_ENDERECO');

                const insertEnderecoSql = `
                    INSERT INTO TB_ENDERECO ("CODIGO_ENDERECO", "CODIGO_PESSOA", "CODIGO_BAIRRO", "NOME_RUA", "NUMERO", "COMPLEMENTO", "CEP")
                    VALUES (:codigoEndereco, :codigoPessoa, :codigoBairro, :nomeRua, :numero, :complemento, :cep)
                `;

                const enderecoDto = {
                    codigoEndereco: dto.codigoEndereco,
                    codigoPessoa: dto.codigoPessoa,
                    codigoBairro: endereco.codigoBairro || null,
                    nomeRua: endereco.nomeRua || null,
                    numero: endereco.numero || null,
                    complemento: endereco.complemento || null,
                    cep: endereco.cep || null
                };

                const codigoBairro = Number(enderecoDto.codigoBairro);
                if (isNaN(codigoBairro)) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, pois o codigo Bairro aceita apenas números e vc tentou inserir: ${enderecoDto.codigoBairro}`
                    };
                    return response.status(400).json(jsonRetorno);
                }

                let codigoBairroExistente = await verificarCodigoBairro(enderecoDto)
                // Faz a validação utilizando o método citado anteriormente.
                if (!codigoBairroExistente) {
                    let jsonRetorno = {
                        status: 400,
                        mensagem: `Não foi possível alterar a Pessoa, visto que não existe um bairro com o código: ${enderecoDto.codigoBairro}`,
                    };
                    return response.status(400).json(jsonRetorno);
                }


                let resultSet = await conexaoAberta.execute(insertEnderecoSql, enderecoDto);
                console.log('FORAM INSERIDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
            }
        }

        await commit();
        await consultarPessoa(request, response);

    } catch (err) {
        console.log(err);
        await rollback();
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível alterar a pessoa no banco de dados!'
        };
        response.status(400).json(jsonRetorno);
    } finally {
        await fecharConexao();
    }
};

pessoa.delete('/', deletarPessoa)

async function deletarPessoa(request, response) {
    try {
        // Captura os dados enviados na requisição
        const dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();

        const codigoPessoa = Number(dto.codigoPessoa);
        if (isNaN(codigoPessoa)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível realizar a requisição, pois o codigo Pessoa aceita apenas números. E vc pesquisou por: '${dto.codigoPessoa}' `
            };
            return response.status(400).json(jsonRetorno);
        }

        // Verifica se a pessoa com o códigoPessoa informado existe no banco de dados.
        const codigoPessoaExistente = await verificarCodigoPessoa(dto);
        if (!codigoPessoaExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível excluir a Pessoa, pois não existe uma pessoa com o código: ${dto.codigoPessoa} `,
            };
            return response.status(400).json(jsonRetorno);
        }


        // Gera o SQL para excluir a pessoa da tabela TB_PESSOA.
        const deletePessoaSql = `
            DELETE FROM TB_PESSOA
            WHERE "CODIGO_PESSOA" = :codigoPessoa
        `;
        const pessoaDto = {
            codigoPessoa: dto.codigoPessoa,
        };
        // Executa o SQL de exclusão da pessoa.
        let resultSetPessoa = await conexaoAberta.execute(deletePessoaSql, pessoaDto);
        console.log('FORAM EXCLUÍDOS: ' + resultSetPessoa.rowsAffected + ' REGISTROS DE ENDEREÇO NO BANCO DE DADOS.'); // Registros de endereço excluídos.

        // Gera o SQL para excluir os endereços associados à pessoa da tabela TB_ENDERECO.
        const deleteEnderecosSql = `
            DELETE FROM TB_ENDERECO
            WHERE "CODIGO_PESSOA" = :codigoPessoa
        `;
        // Executa o SQL de exclusão dos endereços associados à pessoa.
        let resultSet = await conexaoAberta.execute(deleteEnderecosSql, pessoaDto);
        console.log('FORAM EXCLUÍDOS: ' + resultSet.rowsAffected + ' REGISTROS DE ENDEREÇO NO BANCO DE DADOS.'); // Registros de endereço excluídos.

        // Confirma as exclusões feitas e salva no banco de dados!
        await commit();

        // Ao final da requisição com status 200 (OK), retorna a lista com todas as Pessoas presentes no banco de dados.
        await consultarPessoa(request, response);

    } catch (err) {
        // Tratamento de erros.
        console.log(err);
        await rollback();
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível excluir a pessoa do banco de dados!',
        };
        response.status(400).json(jsonRetorno);
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
}

module.exports = pessoa;
