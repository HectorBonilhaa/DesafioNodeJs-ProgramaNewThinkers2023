const { Router } = require("express");
const { abrirConexao, fecharConexao, rollback, conexao, commit, gerarSequence } = require("../database/conexao");
const { verificarNomeExistente, verificarRegistroNomeExistente } = require('../validacoes/nomeExistente');
const { verificarSiglaExistente, verificarRegistroSiglaExistente } = require('../validacoes/siglaExistente');
const { verificarCodigoUFExistenteDelete, verificarCodigoUFExistente } = require('../validacoes/codigoExistente');

const uf = Router();

// FUNÇÃO GET QUE PERMITE UTILIZAR FILTROS (codigoUF, sigla, nome, status).
uf.get('/', consultarUF)
async function consultarUF(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Chama o método abrir conexão para estabelecer a ligação com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Inicializa uma variável sql com uma consulta SQL que seleciona os campos da tabela UF.
        let sql = 'SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF';
        // Cria um objeto dto vazio para armazenar os valores dos parâmetros de filtro.
        let dto = {};
        // Define uma 'Lista' filtroParametros contendo os nomes dos parâmetros que podem ser usados como filtragem da tabela UF.
        const filtroParametros = ['status'];
        // Itera sobre cada parâmetro de filtro e, se estiver presente na solicitação(request.query[param]), adiciona uma cláusula WHERE na consulta sql e adiciona o valor do parâmetro ao objeto dto.
        filtroParametros.forEach((parametro, index) => {
            // Verifica se os parâmetros da constante filtroParametros estão presentes na query.
            if (request.query[parametro]) {
                // Adiciona as condições WHERE e AND à consulta SQL conforme os parâmetros informados
                sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
                // Concatena os parametros utilizados para filtro
                sql += ` ${parametro.toUpperCase()} = :${parametro}${index}`;
                // Gera um objeto que será preenchido com os valroes filtrados
                dto[`${parametro}${index}`] = request.query[parametro];
            }
        });
        // Faz a verifição se o código UF é do tipo Number.
        if (request.query.codigoUF) {
            const codigoUF = Number(request.query.codigoUF);
            if (isNaN(codigoUF)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo UF aceita apenas números!! E vc pesquisou por: ${request.query.codigoUF}`
                };
                return response.status(400).json(jsonRetorno);
            }
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_UF = :codigoUF';
            dto.codigoUF = request.query.codigoUF;
        }
    
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

        if (request.query.sigla) {
            const sigla = String(request.query.sigla);

            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' SIGLA = :sigla';
            dto.sigla = request.query.sigla;
        }

        if (request.query.nome) {
            const nome = String(request.query.nome);

            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' NOME = :nome';
            dto.nome = request.query.nome;
        }

        // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
        let resultado = await conexaoAberta.execute(sql, dto);
        let listaUFs = []

        if (request.query.sigla) {
            if (resultado.rows.length > 0) {
                const row1 = resultado.rows[0];
                listaUFs = {
                    codigoUF: row1[0],
                    sigla: row1[1],
                    nome: row1[2],
                    status: row1[3]
                };
            }
        }

        if (request.query.nome) {
            if (resultado.rows.length > 0) {
                const row1 = resultado.rows[0];
                listaUFs = {
                    codigoUF: row1[0],
                    sigla: row1[1],
                    nome: row1[2],
                    status: row1[3]
                };
            }
        }

        if (!request.query.codigoUF && !request.query.sigla && !request.query.nome) {

            // Mapeia o resultado da consulta para um array listaUFs, onde cada objeto e sua posição é representado.
            listaUFs = resultado.rows.map(row => ({
                codigoUF: row[0],
                sigla: row[1],
                nome: row[2],
                status: row[3]
            }));
            listaUFs.sort((a, b) => b.codigoUF - a.codigoUF);

        } else {
            if (request.query.codigoUF) {
                if (resultado.rows.length > 0) {
                    const row = resultado.rows[0];
                    listaUFs = {
                        codigoUF: row[0],
                        sigla: row[1],
                        nome: row[2],
                        status: row[3]
                    };
                }
            }
        }

        console.log(resultado.rows);
        // Gera o status 200 e gera a lista em formato json caso ocorra tudo certo!
        response.status(200).json(listaUFs);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // A função rollback consegue desfazer uma ação, caso ocorra um erro ele retorna a um ponto sem erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível consultar a tabela UF no banco de dados.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação fecharia a conexao com o banco
    } finally {
        // Fecha a conexão com o banco de dados!
        await fecharConexao();
    }
};

// FUNÇÃO QUE PERMITE ADICIONAR UMA UF(UNIDADE FEDERATIVA) ATRAVÉS DE UMA REQUISIÇÃO POST
uf.post('/', async (request, response) => {
    // Envolve o código para o tratamento de erros
    try {
        // Captura os dados enviados na requisição
        let dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Variável responsável por chamar o método de validação de nome já existente no banco de dados.
        let nomeExistente = await verificarNomeExistente(dto, 'TB_UF');
        // Verifica se já existe um registro com o mesmo nome
        if (nomeExistente > 0) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Já existe um registro com o mesmo nome: ${dto.nome}`
            };
            return response.status(400).json(jsonRetorno);
        }

            const status = Number(request.body.status);
            if (isNaN(status)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível inserir a UF, pois o status aceita apenas números!! E você tentou inserir: ${dto.status}`
                };
                return response.status(400).json(jsonRetorno);
            }
        
        // Valida apenas inserções do status com valor 1.
        if (dto.status != 1) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não é possível adicionar um status com um número diferente de 1!  Status inserido: ${dto.status}`
            };
            return response.status(400).json(jsonRetorno);
        }
        // Variável responsável por chamar o método de validação de sigla já existente no banco de dados.
        let siglaExistente = await verificarSiglaExistente(dto, 'TB_UF');
        // Verifica se já existe um registro com a mesma sigla
        if (siglaExistente > 0) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Já existe um registro com a mesma sigla: ${dto.sigla}`
            };
            return response.status(400).json(jsonRetorno);
        }

        // Gera um código de forma crescente por meio de uma sequência para o atributo codigoUF(Primary Key).
        dto.codigoUF = await gerarSequence('SEQUENCE_UF');
        // Gera o SQL para inserir os valores digitados na request em seus respectivos campos.
        let sql = 'INSERT INTO TB_UF (CODIGO_UF, SIGLA, NOME, STATUS) VALUES (:codigoUF, :sigla, :nome, :status)';
        // Executa o SQL para gravar os dados no banco de dados
        let resultSet = await conexaoAberta.execute(sql, dto);
        // Gera um log para sabermos se os registros foram inseridos com sucesso
        console.log('FORAM INSERIDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        // Confirma as inserções feitas e salva no banco de dados!
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas as UF presentes no banco de dados.
        await consultarUF(request, response);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível incluir UF no banco de dados.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação será fechado a conexao com o banco de dados.
    } finally {
        // Fecha a conexão com o banco de dados
        await fecharConexao();
    }
});

// FUNÇÃO QUE PERMITE ALTERAR UMA UF(UNIDADE FEDERATIVA) ATRAVÉS DE UMA REQUISIÇÃO PUT
uf.put('/', async (request, response) => {
    // Envolve o código para o tratamento de erros
    try {
        // Captura os dados enviados na requisição
        let dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Variável responsável por chamar o método que verifica se existe o códigoUF passado no corpo requisição.
     
        const codigoUF = Number(request.body.codigoUF);
        if (isNaN(codigoUF)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a UF, pois o codigo UF aceita apenas números!! E vc tentou inserir: ${dto.codigoUF}`
            };
            return response.status(400).json(jsonRetorno);
        }
     
        let codigoUFExistente = await verificarCodigoUFExistente(dto);
        // Faz a validação utilizando o método citado anteriormente.
        if (!codigoUFExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a UF, visto que não existe uma UF com o código: ${dto.codigoUF}`,
            };
            return response.status(400).json(jsonRetorno);
        }

        // Variável responsável por chamar o método de validação de nome já existente no banco de dados.
        let nomeExistente = await verificarNomeExistente(dto, 'TB_UF');
        let registroNomeExistente = await verificarRegistroNomeExistente(dto, 'TB_UF', dto);
        // Verifica se já existe um registro com o mesmo nome
        if (nomeExistente && registroNomeExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Já existe um registro com o mesmo nome: ${dto.nome}`
            };
            return response.status(400).json(jsonRetorno);
        }

        // Variável responsável por chamar o método de validação de sigla já existente no banco de dados.
        let siglaExistente = await verificarSiglaExistente(dto, 'TB_UF');
        // Variável responsável por chamar o método de validação de sigla já existente no banco de dados.
        let registroSiglaExistente = await verificarRegistroSiglaExistente(dto, 'TB_UF', dto)
        // Verifica se já existe um registro com a mesma sigla e se o registro é o mesmo que está sendo atualizado
        if (siglaExistente && registroSiglaExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Já existe um registro com a mesma sigla: ${dto.sigla}`
            };
            return response.status(400).json(jsonRetorno);
        }

        const status = Number(request.body.status);
        if (isNaN(status)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar a UF, pois o status aceita apenas números!! E vc tentou inserir: ${dto.status}`
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
        // Gera o SQL para alterar os valores de uma UF no banco de dados.
        let sql = 'UPDATE TB_UF SET SIGLA = :sigla, NOME = :nome, STATUS = :status WHERE CODIGO_UF = :codigoUF';
        // Executa o SQL citado anteriormente.
        let resultSet = await conexaoAberta.execute(sql, dto);
        // Gera um log para sabermos se os registros foram alterados com sucesso.
        console.log('FORAM ALTERADOS: ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS.');
        // Confirma as inserções feitas no banco de dados e salva.
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas as UF presentes no banco de dados.
        await consultarUF(request, response);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Gera um log com os possíveis erros da requisição.
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível fazer a alteração em UF'
        };
        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que uma ação seja realizada independente de erros na aplicação.
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
});

uf.delete('/:codigoUF', deletarUF);

async function deletarUF(request, response) {
    // Envolve o código para o tratamento de erros.
    try {
        // Capta o codigoUF enviado na requisição.
        const { codigoUF } = request.params;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Verifica se existe o códigoUF enviado na requisição.
        let codigoUFExistente = await verificarCodigoUFExistenteDelete(codigoUF);
        if (codigoUFExistente === 0) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não existe uma UF com o código: ${codigoUF}`,
            };
            return response.status(400).json(jsonRetorno);
        }
        // Gera o SQL para a deleção de um codigoUF.
        let sql = 'DELETE FROM TB_UF WHERE CODIGO_UF = :codigoUF';
        // Executa o SQL gerado anteriormente.
        let resultSet = await conexaoAberta.execute(sql, { codigoUF });
        // Gera um log para sabermos se os registros foram deletados com sucesso.
        console.log('FORAM DELETADOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        // Confirma a deleção do codigoUF e salva no banco de dados.
        await commit();
        // Ao final da requisição retorna a lista atualizada de todas as UF presentes no banco de dados.
        await consultarUF(request, response);

        // Capta os possíveis erros gerados na requisição.
    } catch (err) {
        // Gera um log para vizualizarmos os erros gerados.
        console.log(err);
        // Caso ocorra um erro a função rollback ira desfazer as ações feitas no banco de dados.
        await rollback();
        return response.status(404).json({ status: 404, mensagem: 'Não foi possível excluir uma UF no banco de dados.' });

        // Finally serve para realizarmos uma ação na aplicação independente de erros na aplicação.
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
};

module.exports = uf;