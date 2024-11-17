//Імпорт модулів commander та налаштування обробки аргументів командного рядка.
const { Command } = require('commander');
const http = require('http');
const fs = require('fs');

const program = new Command();

//встановлення --host, --port, і --cache обов’язковими параметрами.
program
  .requiredOption('-h, --host <host>', 'address of the server')
  .requiredOption('-p, --port <port>', 'port of the server')
  .requiredOption('-c, --cache <path>', 'path to the cache directory')
  .parse(process.argv);

const options = program.opts();

// Перевірка на існування директорії для кешування
if (!fs.existsSync(options.cache)) {
  console.error(`Error: Cache directory "${options.cache}" does not exist.`);
  process.exit(1);
}

console.log(`Starting server at http://${options.host}:${options.port}`);
console.log(`Cache directory: ${options.cache}`);


//модуль http для створення сервера, який слухає задані host та port.
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running');
  });
  
  server.listen(options.port, options.host, () => {
    console.log(`Server is listening at http://${options.host}:${options.port}`);
  });
