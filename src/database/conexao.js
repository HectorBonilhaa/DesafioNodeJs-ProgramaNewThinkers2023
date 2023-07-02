const oracledb = require("oracledb");
const app = require('./server');

let conexao = null;

// Abre a conexão com o banco de dados.
async function abrirConexao() {
    if (conexao === null) {
        console.log("Tentando abrir conexão...");
        conexao = await oracledb.getConnection({
            user: "C##NODE",
            password: "node",
            connectionString: "localhost:1521/XE"
        });
        console.log("Conexão aberta com sucesso!");
    }
    return conexao;
}

// Fecha a conexão com o banco de dados.
async function fecharConexao() {
    if (conexao !== null) {
        console.log("Tentando fechar conexão...");
        await conexao.close();
        conexao = null;
        console.log("Conexão fechada com sucesso!");
    }
    // return conexao;
}
// Gera uma sequence para a inserção das primary keys de forma automatatizada.
async function gerarSequence(nomeSequence) {
    let sqlSequence = `SELECT ${nomeSequence}.NEXTVAL AS CODIGO FROM DUAL`;
    let resultSet = await conexao.execute(sqlSequence);
    let sequence = resultSet.rows[0][0];
    console.log(`SEQUENCE GERADA PARA ${nomeSequence} - ${sequence}`);
    return sequence;
}
// Commita para realizar de fato a gravação no banco de dados.
async function commit() {
    if (conexao !== null) {
        await conexao.commit();
        await fecharConexao();
    }
}

// Desfaz todas as alterações feitas em uma transação restaurando ao estado anterior ao início da transação.
async function rollback() {
    if (conexao !== null) {
        await conexao.rollback();
        await fecharConexao();
    }
}



module.exports = {
    abrirConexao,
    fecharConexao,
    rollback,
    gerarSequence,
    commit,
    conexao,
};
