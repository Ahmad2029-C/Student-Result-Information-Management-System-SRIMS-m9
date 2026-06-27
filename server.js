'use strict';

const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT || 3000);
const publicPath = path.join(__dirname, '..', 'public');

function readHomeData() {
  const file = path.join(publicPath, 'data', 'products.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function startExpressServer() {
  require('dotenv').config();
  const express = require('express');
  const helmet = require('helmet');
  const cors = require('cors');
  const compression = require('compression');
  const cookieParser = require('cookie-parser');
  const rateLimit = require('express-rate-limit');

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(process.env.COOKIE_SECRET || 'educational-secret'));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(express.static(publicPath, { maxAge: '1h', etag: true }));

  app.get('/api/health', (request, response) => {
    response.json({ status: 'ok', app: 'Infotech International', module: 'homepage' });
  });

  app.get('/api/home', (request, response, next) => {
    try {
      response.json(readHomeData());
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/products', (request, response, next) => {
    try {
      const data = readHomeData();
      const { category, q } = request.query;
      let products = data.products;
      if (category) products = products.filter((product) => product.category === category);
      if (q) {
        const query = String(q).toLowerCase();
        products = products.filter((product) => product.name.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query));
      }
      response.json({ products });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/categories', (request, response, next) => {
    try {
      response.json({ categories: readHomeData().categories });
    } catch (error) {
      next(error);
    }
  });

  app.get('*', (request, response) => {
    response.sendFile(path.join(publicPath, 'index.html'));
  });

  app.use((error, request, response, next) => {
    console.error(error);
    response.status(500).json({ message: 'Server error', detail: process.env.NODE_ENV === 'development' ? error.message : undefined });
  });

  app.listen(PORT, () => {
    console.log('Infotech International running at http://localhost:' + PORT);
  });
}

function startNoInstallPreview() {
  const http = require('http');
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8'
  };

  http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost:' + PORT);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok', preview: true }));
      return;
    }
    if (pathname === '/api/home') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(readHomeData()));
      return;
    }
    if (pathname === '/') pathname = '/index.html';
    const safePath = path.normalize(path.join(publicPath, pathname));
    if (!safePath.startsWith(publicPath)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    fs.readFile(safePath, (error, content) => {
      if (error) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(safePath)] || 'application/octet-stream' });
      response.end(content);
    });
  }).listen(PORT, () => {
    console.log('No-install preview running at http://localhost:' + PORT);
    console.log('Install dependencies with npm install to run the Express version.');
  });
}

try {
  require.resolve('express');
  startExpressServer();
} catch (error) {
  startNoInstallPreview();
}
