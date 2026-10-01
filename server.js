const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const INDEX_HTML_PATH = path.join(__dirname, 'index.html');
const REVIEW_HTML_PATH = path.join(__dirname, 'review.html');

let indexCache = null;
let reviewCache = null;

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

function fetchRemote(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function getFileOnDisk(reqPath) {
  const clean = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const list = [
    path.join(__dirname, clean),
    path.join(process.cwd(), clean),
    path.resolve('.', clean.replace(/^[\/\\]+/, ''))
  ];
  for (const p of list) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (e) {}
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '' || reqPath === '/') reqPath = '/index.html';
  if (reqPath === '/review') reqPath = '/review.html';

  const ext = path.extname(reqPath).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'].includes(ext);

  // Serve Index HTML
  if (reqPath === '/index.html') {
    if (fs.existsSync(INDEX_HTML_PATH)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(INDEX_HTML_PATH).pipe(res);
      return;
    }
    const diskPath = getFileOnDisk('/index.html');
    if (diskPath) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(diskPath).pipe(res);
      return;
    }
    if (indexCache) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexCache);
      return;
    }
    const remoteIndex = await fetchRemote('https://raw.githubusercontent.com/Yashgadwal/msbestquality/main/index.html');
    if (remoteIndex) {
      indexCache = remoteIndex;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(remoteIndex);
      return;
    }
  }

  // Serve Review HTML
  if (reqPath === '/review.html') {
    if (fs.existsSync(REVIEW_HTML_PATH)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(REVIEW_HTML_PATH).pipe(res);
      return;
    }
    const diskPath = getFileOnDisk('/review.html');
    if (diskPath) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(diskPath).pipe(res);
      return;
    }
    if (reviewCache) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(reviewCache);
      return;
    }
    const remoteReview = await fetchRemote('https://raw.githubusercontent.com/Yashgadwal/msbestquality/main/review.html');
    if (remoteReview) {
      reviewCache = remoteReview;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(remoteReview);
      return;
    }
  }

  // Check any local asset
  const existing = getFileOnDisk(reqPath);
  if (existing) {
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isImage ? 'public, max-age=31536000, immutable' : (ext === '.html' ? 'no-cache' : 'public, max-age=86400')
    });
    fs.createReadStream(existing).pipe(res);
    return;
  }

  // Image fallback redirect to raw CDN
  if (isImage) {
    const filename = path.basename(reqPath);
    res.writeHead(302, {
      'Location': 'https://raw.githubusercontent.com/Yashgadwal/msbestquality/main/images/' + filename,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end();
    return;
  }

  // Generic SPA fallback
  if (fs.existsSync(INDEX_HTML_PATH)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(INDEX_HTML_PATH).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

module.exports = server;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('Local preview server active on http://localhost:' + PORT);
  });
}
