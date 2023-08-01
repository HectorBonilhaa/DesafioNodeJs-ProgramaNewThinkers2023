const { conexao, abrirConexao } = require('../database/conexao');

async function verificarLoginExistente(dto, tabela) {
    let conexaoAberta = await abrirConexao();

    let sqlLoginExistente = `SELECT COUNT(*) FROM ${tabela} WHERE LOWER(LOGIN) = LOWER(:login)`;
    let resultadoLoginExistente = await conexaoAberta.execute(sqlLoginExistente, { login: dto.login });
    let loginExistente = resultadoLoginExistente.rows[0][0];
    return loginExistente;
}

async function verificarRegistroLoginExistente(dto, tabela, dto) {

    let conexaoAberta = await abrirConexao();

    // Verifica se a sigla existe na tabela, excluindo o registro em atualização pelo ID
    let sqlRegistroExistente = `SELECT COUNT(*) FROM ${tabela}
                                WHERE LOWER(LOGIN) = LOWER(:login)
                                AND (CODIGO_PESSOA IS NULL OR CODIGO_PESSOA != :codigoPessoa)`;
    let resultadoRegistroExistente = await conexaoAberta.execute(sqlRegistroExistente, { login: dto.login, codigoPessoa: dto.codigoPessoa });
    let registroExistente = resultadoRegistroExistente.rows[0][0];

    return registroExistente > 0;

}

module.exports = {
    verificarLoginExistente,
    verificarRegistroLoginExistente
}