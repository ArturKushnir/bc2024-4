const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const superagent = require('superagent');
const { program } = require('commander');

// Налаштування командного рядка
program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <cache>', 'cache directory');

program.parse(process.argv);
const options = program.opts();

// Перевірка наявності кешу
(async () => {
  try {
    await fs.access(options.cache);
  } catch (err) {
    console.error(`Cache directory "${options.cache}" does not exist.`);
    process.exit(1);
  }
})();

// Логіка роботи сервера
const server = http.createServer(async (req, res) => {
  let urlParts = req.url.split('/');
  let code = urlParts[1]; // Отримуємо код зі шляху (наприклад, /200 -> 200)

  // Якщо шлях порожній або некоректний, встановлюємо код 404
  if (!code || isNaN(Number(code))) {
    code = '404';
  }

  const filePath = path.join(options.cache, `${code}.jpg`);

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(filePath, code, res);
        break;
      case 'PUT':
        await handlePut(filePath, req, res);
        break;
      case 'DELETE':
        await handleDelete(filePath, res);
        break;
      default:
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// Функція для обробки GET-запиту
async function handleGet(filePath, code, res) {
  try {
    // Перевірка наявності картинки в кеші
    try {
      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Картинка відсутня в кеші, запитуємо з http.cat
        console.log(`Image not found in cache, fetching from http.cat: ${code}`);
        await fetchAndCacheImage(code, filePath, res);
      } else {
        throw err;
      }
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// Функція для запиту картинки з http.cat та кешування
async function fetchAndCacheImage(code, filePath, res) {
  try {
    const response = await superagent.get(`https://http.cat/${code}`);
    
    // Якщо запит успішний, збережемо картинку в кеш
    await fs.writeFile(filePath, response.body);
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(response.body);
  } catch (err) {
    // Якщо сталася помилка під час запиту, повернемо 404
    console.error(`Failed to fetch image from http.cat: ${err.message}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// Функція для обробки PUT-запиту
async function handlePut(filePath, req, res) {
  let body = [];

  req.on('data', (chunk) => {
    body.push(chunk);
  });

  req.on('end', async () => {
    try {
      body = Buffer.concat(body);
      await fs.writeFile(filePath, body);
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('Created');
    } catch (err) {
      throw err;
    }
  });
}

// Функція для обробки DELETE-запиту
async function handleDelete(filePath, res) {
  try {
    await fs.unlink(filePath);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      throw err;
    }
  }
}

// Запуск сервера
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});
