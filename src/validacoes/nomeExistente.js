const { conexao, abrirConexao } = require('../database/conexao');

// Função para verificar se já existe um registro com o mesmo nome na tabela TB_UF
async function verificarNomeExistente(dto, tabela) {
    let conexaoAberta = await abrirConexao();

    let sqlNomeExistente = `SELECT COUNT(*) FROM ${tabela} WHERE LOWER(NOME) = LOWER(:nome)`;
    let resultadoNomeExistente = await conexaoAberta.execute(sqlNomeExistente, { nome: dto.nome });
    let nomeExistente = resultadoNomeExistente.rows[0][0];
    return nomeExistente;
}

module.exports = {
    verificarNomeExistente
}