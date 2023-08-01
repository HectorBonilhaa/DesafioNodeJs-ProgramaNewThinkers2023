const { Router } = require("express");
const { abrirConexao, fecharConexao, rollback, commit } = require('../database/conexao');
const { verificarCodigoEndereco } = require("../validacoes/codigoExistente");

const endereco = Router();


endereco.get('/', consultarEndereco)
async function consultarEndereco(request, response) {
    // Envolve o código para o tratamento de erros
    try {
        // Chama o método abrir conexão para estabelecer a ligação com o banco de dados.
        const conexaoAberta = await abrirConexao();
        // Inicializa uma variável sql com uma consulta SQL que seleciona os campos da tabela Bairro.
        let sql = 'SELECT CODIGO_ENDERECO, CODIGO_PESSOA, CODIGO_BAIRRO, NOME_RUA, NUMERO, COMPLEMENTO, CEP FROM TB_ENDERECO';
        // Cria um objeto dto vazio para armazenar os valores dos parâmetros de filtro.
        let dto = {};
        // Define uma 'Lista' filtroParametros contendo os nomes dos parâmetros que podem ser usados como filtragem da tabela Bairro.
        const filtroParametros = ['numero', 'complemento', 'cep'];
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

        // Faz a verifição se o codigoEndereco é do tipo Number.
        if (request.query.codigoEndereco) {
            const codigoEndereco = Number(request.query.codigoEndereco);
            if (isNaN(codigoEndereco)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo endereco aceita apenas números!! E vc pesquisou por: ${request.query.codigoEndereco}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Contatena o sql para que seja filtrado por codigoMunicipio.
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_ENDERECO = :codigoEndereco';
            dto.codigoEndereco = codigoEndereco;
        }

        // Faz a verifição se o codigoPessoa é do tipo Number.
        if (request.query.codigoPessoa) {
            const codigoPessoa = Number(request.query.codigoPessoa);
            if (isNaN(codigoPessoa)) {
                let jsonRetorno = {
                    status: 400,
                    mensagem: `Não foi possível realizar a consulta, pois o codigo pessoa aceita apenas números!! E vc pesquisou por: ${request.query.codigoPessoa}`
                };
                return response.status(400).json(jsonRetorno);
            }
            // Contatena o sql para que seja filtrado por codigoMunicipio.
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' CODIGO_PESSOA = :codigoPessoa';
            dto.codigoPessoa = codigoPessoa;
        }

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

        // Faz a filtagem de nomeRua
        if (request.query.nomeRua) {
            const nomeRua = request.query.nomeRua;

            // Contatena o sql para que seja filtrado por codigoBairro.
            sql += Object.keys(dto).length === 0 ? ' WHERE' : ' AND';
            sql += ' NOME_RUA = :nomeRua';
            dto.nomeRua = request.query.nomeRua;
        }


        // Executa a consulta SQL utilizando o objeto conexaoAberta e os valores dos parâmetros de filtro. (sql, dto)
        let resultado = await conexaoAberta.execute(sql, dto);
        let listaEnderecos = []

        if (request.query.codigoEndereco) {
            if (resultado.rows.length > 0) {
                const row = resultado.rows[0];
                listaEnderecos = {
                    codigoEndereco: row[0],
                    codigoPessoa: row[1],
                    codigoBairro: row[2],
                    nomeRua: row[3],
                    numero: row[4],
                    complemento: row[5],
                    cep: row[6]
                };
            }
        } else {

            // Mapeia o resultado da consulta para um array listaBairro, onde cada objeto e sua posição é representado.
            listaEnderecos = resultado.rows.map(row => ({
                codigoEndereco: row[0],
                codigoPessoa: row[1],
                codigoBairro: row[2],
                nomeRua: row[3],
                numero: row[4],
                complemento: row[5],
                cep: row[6]
            }));

            // Método do Javascript para ordenar uma lista.
            // após a arrow function, ao utilizar "b" antes do "a" faz com que a lista seja ordenada de forma decrescente.
            listaEnderecos.sort((a, b) => b.codigoEndereco - a.codigoEndereco);
        }
        // Gera o log com os possíveis dados que podem ou não existir na tabela Bairro.
        console.log(resultado.rows);
        // Gera o status 200 e gera a lista em formato json caso ocorra tudo certo!
        response.status(200).json(listaEnderecos);

        // Capta os possíveis erros gerados
    } catch (err) {
        // Mostra no terminal os possíveis erros gerados na requisição
        console.log(err);
        // A função rollback consegue desfazer uma ação, caso ocorra um erro ele retorna a um ponto sem erro.
        await rollback();
        // Variável criada para o usuário visualizar o status e a mensagem de erro após sua requisição falhar!
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível consultar a tabela Endereco no banco de dados.'
        };
        // retorna o status e a mensagem de erro para o usuário.
        response.status(400).json(jsonRetorno);

        // Finally é usado para garantir que independente de erros a aplicação fecharia a conexao com o banco
    } finally {
        // Fecha a conexão com o banco de dados!
        await fecharConexao();
    }
};

endereco.delete('/', deletarEndereco)

async function deletarEndereco(request, response) {
    try {
        // Captura os dados enviados na requisição
        const dto = request.body;
        // Abre a conexão com o banco de dados.
        const conexaoAberta = await abrirConexao();

        const codigoEndereco = Number(dto.codigoEndereco);
        if (isNaN(codigoEndereco)) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível realizar a requisição, pois o codigo Endereço aceita apenas números. E vc pesquisou por: '${dto.codigoEndereco}' `
            };
            return response.status(400).json(jsonRetorno);
        }

        // Verifica se a pessoa com o códigoPessoa informado existe no banco de dados.
        const codigoEnderecoExistente = await verificarCodigoEndereco(dto);
        if (!codigoEnderecoExistente) {
            let jsonRetorno = {
                status: 400,
                mensagem: `Não foi possível excluir o Endereço, pois não existe um Endereco com o código: ${dto.codigoEndereco} `,
            };
            return response.status(400).json(jsonRetorno);
        }


        // Gera o SQL para excluir a pessoa da tabela TB_PESSOA.
        const deletePessoaSql = `
            DELETE FROM TB_ENDERECO
            WHERE "CODIGO_ENDERECO" = :codigoEndereco
        `;
        const enderecoDto = {
            codigoEndereco: dto.codigoEndereco,
        };
        // Executa o SQL de exclusão da pessoa.
        let resultSetPessoa = await conexaoAberta.execute(deletePessoaSql, enderecoDto);
        console.log('FORAM EXCLUÍDOS: ' + resultSetPessoa.rowsAffected + ' REGISTROS DE ENDEREÇO NO BANCO DE DADOS.'); // Registros de endereço excluídos.

        // Confirma as exclusões feitas e salva no banco de dados!
        await commit();

        // Ao final da requisição com status 200 (OK), retorna a lista com todas as Pessoas presentes no banco de dados.
        await consultarEndereco(request, response);

    } catch (err) {
        // Tratamento de erros.
        console.log(err);
        await rollback();
        let jsonRetorno = {
            status: 400,
            mensagem: 'Não foi possível excluir o Endereço do banco de dados!',
        };
        response.status(400).json(jsonRetorno);
    } finally {
        // Fecha a conexão com o banco de dados.
        await fecharConexao();
    }
}

module.exports = endereco;
