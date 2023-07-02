const { conexao, abrirConexao } = require('../database/conexao');

// Função para verificar se já existe um registro com a mesma sigla na tabela TB_UF
async function verificarSiglaExistente(dto, tabela) {
    let conexaoAberta = await abrirConexao();

    let sqlSiglaExistente = `SELECT COUNT(*) FROM ${tabela} WHERE LOWER(SIGLA) = LOWER(:sigla)`;
    let resultadoSiglaExistente = await conexaoAberta.execute(sqlSiglaExistente, { sigla: dto.sigla });
    let siglaExistente = resultadoSiglaExistente.rows[0][0];
    return siglaExistente;
}

module.exports = {
    verificarSiglaExistente
}