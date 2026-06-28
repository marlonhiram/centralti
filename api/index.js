// Adaptador Vercel Function → Express
//
// O vercel.json reescreve /api/:path* → /api?path=:path*
// O Vercel injeta o caminho capturado em req.query.path.
// Este adaptador reconstrói a URL correta antes de passar ao Express.

const app = require("../server");

module.exports = (req, res) => {
  const pathSegment = req.query.path;
  const routePath = "/" + (Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "");

  // Remove o parâmetro 'path' injetado pelo Vercel da query string
  const qs = new URLSearchParams(req.url.split("?")[1] || "");
  qs.delete("path");
  const queryString = qs.toString();

  req.url = routePath + (queryString ? "?" + queryString : "");
  delete req.query.path;

  app(req, res);
};
