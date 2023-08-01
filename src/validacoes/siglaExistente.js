const { conexao, abrirConexao } = require('../database/conexao');

// Função para verificar se já existe um registro com a mesma sigla na tabela TB_UF
async function verificarSiglaExistente(dto, tabela) {
    let conexaoAberta = await abrirConexao();

    let sqlSiglaExistente = `SELECT COUNT(*) FROM ${tabela} WHERE LOWER(SIGLA) = LOWER(:sigla)`;
    let resultadoSiglaExistente = await conexaoAberta.execute(sqlSiglaExistente, { sigla: dto.sigla });
    let siglaExistente = resultadoSiglaExistente.rows[0][0];
    return siglaExistente;
}

async function verificarRegistroSiglaExistente(dto, tabela, dto) {

    let conexaoAberta = await abrirConexao();

    // Verifica se a sigla existe na tabela, excluindo o registro em atualização pelo ID
    let sqlRegistroExistente = `SELECT COUNT(*) FROM ${tabela}
                                WHERE LOWER(SIGLA) = LOWER(:sigla)
                                AND (CODIGO_UF IS NULL OR CODIGO_UF != :codigoUF)`;
    let resultadoRegistroExistente = await conexaoAberta.execute(sqlRegistroExistente, { sigla: dto.sigla, codigoUF: dto.codigoUF });
    let registroExistente = resultadoRegistroExistente.rows[0][0];

    return registroExistente > 0;

}
module.exports = {
    verificarSiglaExistente,
    verificarRegistroSiglaExistente
}