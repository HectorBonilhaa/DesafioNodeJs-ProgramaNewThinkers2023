const Router = require("express");
const routes = Router();

const uf = require('../service/UF');
const municipio = require('../service/Municipio');
const bairro = require('../service/Bairro');
const pessoa = require('../service/Pessoa');


routes.use('/uf/', uf);
routes.use('/municipio', municipio);
routes.use('/bairro', bairro);
routes.use('/pessoa', pessoa);

module.exports = routes;