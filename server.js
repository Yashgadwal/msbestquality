const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolveExistingPath(reqPath) {
  const cleanPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const candidates = [
    path.join(__dirname, cleanPath),
    path.join(process.cwd(), cleanPath),
    path.resolve('.', cleanPath.replace(/^\//, ''))
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    } catch (e) {}
  }
  return null;
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/review') reqPath = '/review.html';

  const ext = path.extname(reqPath).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'].includes(ext);

  const existingFile = resolveExistingPath(reqPath);

  if (existingFile) {
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isImage ? 'public, max-age=31536000, immutable' : (ext === '.html' ? 'no-cache' : 'public, max-age=86400')
    });
    fs.createReadStream(existingFile).pipe(res);
    return;
  }

  // If it's an image and not found locally, redirect to public GitHub Raw CDN
  if (isImage) {
    const filename = path.basename(reqPath);
    res.writeHead(302, {
      'Location': 'https://raw.githubusercontent.com/Yashgadwal/msbestquality/main/images/' + filename,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end();
    return;
  }

  // For HTML / routes, fallback to index.html
  const indexPath = resolveExistingPath('/index.html');
  if (indexPath) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

module.exports = server;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Local preview server active on http://localhost:${PORT}`);
  });
}
