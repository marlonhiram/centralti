// Adaptador Vercel Function → Express
// A Vercel roteia /api/* para este arquivo.
// Strips o prefixo /api antes de passar ao Express,
// que tem suas rotas definidas como /chamados, /equipamentos, etc.

const app = require("../server");

module.exports = (req, res) => {
  if (req.url && req.url.startsWith("/api")) {
    req.url = req.url.slice(4) || "/";
  }
  app(req, res);
};
