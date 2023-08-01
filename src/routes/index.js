const Router = require("express");
const routes = Router();

const uf = require('../service/UF');
const municipio = require('../service/Municipio');
const bairro = require('../service/Bairro');
const pessoa = require('../service/Pessoa');
const endereco = require('../service/Endereco');


routes.use('/uf/', uf);
routes.use('/municipio', municipio);
routes.use('/bairro', bairro);
routes.use('/pessoa', pessoa);
routes.use('/endereco', endereco);

module.exports = routes;