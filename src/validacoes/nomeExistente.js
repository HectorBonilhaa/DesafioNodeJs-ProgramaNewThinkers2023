const { conexao, abrirConexao } = require('../database/conexao');

// Função para verificar se já existe um registro com o mesmo nome na tabela TB_UF
async function verificarNomeExistente(dto, tabela) {
    let conexaoAberta = await abrirConexao();

    let sqlNomeExistente = `SELECT COUNT(*) FROM ${tabela} WHERE LOWER(NOME) = LOWER(:nome)`;
    let resultadoNomeExistente = await conexaoAberta.execute(sqlNomeExistente, { nome: dto.nome });
    let nomeExistente = resultadoNomeExistente.rows[0][0];
    return nomeExistente;
}

async function verificarRegistroNomeExistente(dto, tabela, dto) {

    let conexaoAberta = await abrirConexao();

    // Verifica se a sigla existe na tabela, excluindo o registro em atualização pelo ID
    let sqlRegistroExistente = `SELECT COUNT(*) FROM ${tabela}
                                WHERE LOWER(NOME) = LOWER(:nome)
                                AND (CODIGO_UF IS NULL OR CODIGO_UF != :codigoUF)`;
    let resultadoRegistroExistente = await conexaoAberta.execute(sqlRegistroExistente, { nome: dto.nome, codigoUF: dto.codigoUF });
    let registroExistente = resultadoRegistroExistente.rows[0][0];

    return registroExistente > 0;

}

module.exports = {
    verificarNomeExistente,
    verificarRegistroNomeExistente
}