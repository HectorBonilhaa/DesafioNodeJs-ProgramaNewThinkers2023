const { Router } = require("express");
const { abrirConexao, conexao, fecharConexao, rollback, gerarSequence, commit, } = require('../database/conexao');
const { verificarCodigoUFExistente, verificarCodigoMunicipio } = require('../validacoes/codigoExistente');


const municipio = Router();

// FUNÇÃO GET QUE PERMITE UTILIZAR FILTROS (codigoMunicipio, codigoUF, nome, status).
municipio.get('/', consultarMunicipio)
async function consultarMunicipio(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Chama o método abrir conexão para estabelecer a ligação com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Inicializa uma variável sql com uma consulta SQL que seleciona os campos da tabela Municipio.
        let sql = 'SELECT CODIGO_MUNICIPIO, NOME, STATUS, CODIGO_UF FROM TB_MUNICIPIO';
        // Cria um objeto dto vazio para armazenar os valores dos parâmetros de filtro.
        let dto = {};
        // Define uma 'Lista' filtroParametros contendo os nomes dos parâmetros que podem ser usados como filtragem da tabela Municipio.
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
        // Faz a verifição se o codigoMunicipio é do tipo Number.
        if (request.query.codigoMunicipio) {
            const codigoMunicipio = Number(request.query.codigoMunicipio);
            if (isNaN(codigoMunicipio)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo município aceita apenas números e vc pesquisou por: ${request.query.codigoMunicipio}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Contatena o sql para que seja filtrado por codigoMunicipio
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_MUNICIPIO = :codigoMunicipio';
            dto.codigoMunicipio = codigoMunicipio;
        }
        // Faz a verifição se o código UF é do tipo Number.
        if (request.query.codigoUF) {
            const codigoUF = Number(request.query.codigoUF);
            if (isNaN(codigoUF)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo UF aceita apenas números e vc pesquisou por: ${request.query.codigoUF}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Contatena o sql para que seja filtrado por codigoUF
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_UF = :codigoUF';
            dto.codigoUF = request.query.codigoUF;
        }
        // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
        let resultado = await conexaoAberta.execute(sql, dto);
        // Mapeia o resultado da consulta para um array listaMunicipio, onde cada objeto e sua posição é representado.
        let listaMunicipio = resultado.rows.map(row => ({
            codigoMunicipio: row[0],
            nome: row[1],
            status: row[2],
            codigoUF: row[3],
        }));
        // Método do Javascript para ordenar uma lista.
        // após a arrow function, ao utilizar "b" antes do "a" faz com que a lista seja ordenada de forma decrescente.
        listaMunicipio.sort((a, b) => b.codigoMunicipio - a.codigoMunicipio);
        // Gera o log com os possíveis dados que podem ou não existir na tabela Municipio.
        console.log(resultado.rows);
        // Gera o status 200 e gera a lista em formato json caso ocorra tudo certo!
        response.status(200).json(listaMunicipio);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // A função rollback consegue desfazer uma ação, caso ocorra um erro ele retorna a um ponto sem erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível consultar a Lista de Municípios.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação fecharia a conexao com o banco
    } finally {
        // Fecha a conexão com o banco de dados!
        await fecharConexao();
    }
}

// FUNÇÃO QUE PERMITE ADICIONAR UM MUNICÍPIO ATRAVÉS DE UMA REQUISIÇÃO POST
municipio.post('/', adicionaMunicipio)
async function adicionaMunicipio(request, response) {
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
        // Variável responsável por chamar o método de validação de codigoUF já existente no banco de dados.
        let codigoUFExistente = await verificarCodigoUFExistente(dto);
        // Verifica se já existe um registro com o mesmo codigoUF.
        if (!codigoUFExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não É possível adicionar o munícipio visto que não existe uma UF com o código: ${dto.codigoUF}`,
            };
            return response.status(400).json(jsonRetorno);
        }
        // Gera um código de forma crescente por meio de uma sequência para o atributo codigoMunicipio(Primary Key).
        dto.codigoMunicipio = await gerarSequence('SEQUENCE_MUNICIPIO');
        // Gera o SQL para inserir os valores digitados na request em seus respectivos campos.
        let sql = 'INSERT INTO TB_MUNICIPIO (CODIGO_MUNICIPIO, NOME, STATUS, CODIGO_UF) VALUES (:codigoMunicipio, :nome, :status, :codigoUF)';
        // Executa o SQL para gravar os dados no banco de dados.
        let resultSet = await conexaoAberta.execute(sql, dto);
        // Gera um log para sabermos se os registros foram inseridos com sucesso
        console.log('FORAM INSERIDOS ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS');
        // Confirma as inserções feitas e salva no banco de dados!
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas os Municípios presentes no banco de dados.
        await consultarMunicipio(request, response);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível incluir o Município no banco de dados!'
        };
        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação será fechado a conexao com o banco de dados.
    } finally {
        // Fecha a conexão com o banco de dados
        await fecharConexao();
    }
}

// FUNÇÃO QUE PERMITE ALTERAR UM MUNICÍPIO ATRAVÉS DE UMA REQUISIÇÃO PUT
municipio.put('/', alterarMunicipio)
async function alterarMunicipio(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Captura os dados enviados na requisição
        let dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Variável responsável por chamar o método que verifica se existe o codigoMunicipio passado no corpo da requisição.
        let codigoMunicipioExistente = await verificarCodigoMunicipio(dto)
        // Faz a validação utilizando o método citado anteriormente.
        if (!codigoMunicipioExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar o Município, visto que não existe um município com o código: ${dto.codigoMunicipio}`,
            };
            return response.status(400).json(jsonRetorno);
        }

        // Variável responsável por chamar o método que verifica se existe o codigoUF passado no corpo da requisição.
        let codigoUfExistente = await verificarCodigoUFExistente(dto)
        // Faz a validação utilizando o método citado anteriormente.
        if (!codigoUfExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível alterar o Município, visto que não existe uma UF com o código: ${dto.codigoUF}`,
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
        // Gera o SQL para alterar os valores de um Municipio no banco de dados.
        let sql = 'UPDATE TB_MUNICIPIO SET CODIGO_UF = :codigoUF, NOME = :nome, STATUS = :status WHERE CODIGO_MUNICIPIO = :codigoMunicipio';
        // Executa o SQL citado anteriormente.
        let resultSet = await conexaoAberta.execute(sql, dto);
        // Gera um log para sabermos se os registros foram alterados com sucesso.
        console.log('FORAM ALTERADOS: ' + resultSet.rowsAffected + ' REGISTROS NO BANCO DE DADOS.');
        // Confirma as inserções feitas no banco de dados e salva.
        await commit();
        // Ao final da requisição com status 200 (OK), retorna a lista com todas os Municipios presentes no banco de dados.
        await consultarMunicipio(request, response);

        // Capta os possíveis erros gerados.
    } catch (err) {
        // Gera um log com os possíveis erros da requisição.
        console.log(err);
        // Método responsável por desfazer uma ação caso ocorra um erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível fazer a alteração na tabela Município'
        };

        // retorna o status e a mensagem de erro para o usuário.
        return response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que uma ação seja realizada independente de erros na aplicação.
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
};

module.exports = municipio;
