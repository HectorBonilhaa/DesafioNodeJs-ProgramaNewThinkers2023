const { conexao, abrirConexao, fecharConexao } = require('../database/conexao');

async function verificarCodigoUFExistenteDelete(codigoUF) {
    const conexaoAberta = await abrirConexao();

    let sql = 'SELECT COUNT(*) FROM TB_UF WHERE CODIGO_UF = :codigoUF';
    let resultado = await conexaoAberta.execute(sql, { codigoUF });
    let quantidadeRegistros = resultado.rows[0][0];
    return quantidadeRegistros;
}
// async function verificarCodigoUFExistenteDelete(codigoUF) {
//     const conexaoAberta = await abrirConexao();

//     let sql = 'SELECT COUNT(*) FROM TB_MUNICIPIO WHERE CODIGO_MUNICIPIO = :codigoMunicipio';
//     let resultado = await conexaoAberta.execute(sql, { codigoMunicipio });
//     let quantidadeRegistros = resultado.rows[0][0];
//     return quantidadeRegistros;
// }

async function verificarCodigoUFExistente(dto) {
    const conexaoAberta = await abrirConexao();

    let sqlUFExistente = `SELECT COUNT(*) FROM TB_UF WHERE CODIGO_UF = :codigoUF`;
    let resultado = await conexaoAberta.execute(sqlUFExistente, { codigoUF: dto.codigoUF });
    let quantidadeRegistros = resultado.rows[0][0];
    return quantidadeRegistros;
}
async function verificarCodigoMunicipio(dto) {
    const conexaoAberta = await abrirConexao();

    let sqlMunicipioExistente = `SELECT COUNT(*) FROM TB_MUNICIPIO WHERE CODIGO_MUNICIPIO = :codigoMunicipio`;
    let resultado = await conexaoAberta.execute(sqlMunicipioExistente, { codigoMunicipio: dto.codigoMunicipio });
    let quantidadeRegistros = resultado.rows[0][0];
    return quantidadeRegistros;
}
async function verificarCodigoBairro(dto) {
    const conexaoAberta = await abrirConexao();

    let sqlBairroExistente = `SELECT COUNT(*) FROM TB_BAIRRO WHERE CODIGO_BAIRRO = :codigoBairro`;
    let resultado = await conexaoAberta.execute(sqlBairroExistente, { codigoBairro: dto.codigoBairro });
    let quantidadeRegistros = resultado.rows[0][0];
    return quantidadeRegistros;
}

async function verificarCodigoPessoa(dto) {
    const conexaoAberta = await abrirConexao();

    let sqlPessoaExistente = `SELECT COUNT(*) FROM TB_PESSOA WHERE CODIGO_PESSOA = :codigoPessoa`;
    let resultado = await conexaoAberta.execute(sqlPessoaExistente, { codigoPessoa: dto.codigoPessoa });
    let quantidadeRegistros = resultado.rows[0][0];
    return quantidadeRegistros;
}

async function verificarCodigoEndereco(dto) {
    const conexaoAberta = await abrirConexao();

    let sqlEnderecoExistente = `SELECT COUNT(*) FROM TB_ENDERECO WHERE CODIGO_ENDERECO = :codigoEndereco`;
    let resultado = await conexaoAberta.execute(sqlEnderecoExistente, { codigoEndereco: dto.codigoEndereco });
    let quantidadeRegistros = resultado.rows[0][0];
    return quantidadeRegistros;
}

async function buscarEnderecos(dto) {
    const conexaoAberta = await abrirConexao();
    const sqlTodosEnderecos = `SELECT * FROM TB_ENDERECO WHERE CODIGO_PESSOA = :codigoPessoa`;
    const resultado = await conexaoAberta.execute(sqlTodosEnderecos, { codigoPessoa: dto.codigoPessoa });
    const listaEnderecos = resultado.rows;

    // Utiliza a função flat() para transformar a matriz em um único array
    
    return listaEnderecos;
}


module.exports = {
    verificarCodigoUFExistenteDelete,
    verificarCodigoUFExistente,
    verificarCodigoMunicipio,
    verificarCodigoBairro,
    verificarCodigoPessoa,
    verificarCodigoEndereco,
    buscarEnderecos

}
