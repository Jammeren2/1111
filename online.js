const mineflayer = require('mineflayer');

const serverHost = 'localhost'; // Замените на IP вашего сервера
const serverPort = 25565; // Замените на порт вашего сервера
const botUsername = 'YourBotName'; // Замените на имя вашего бота

const bot = mineflayer.createBot({
  host: serverHost,
  port: serverPort,
  username: botUsername,
});

bot.on('login', () => {
  console.log(`Бот ${botUsername} успешно подключен к серверу.`);
  setInterval(() => {
    printOnlinePlayers();
  }, 1000); // Выводить онлайн каждую минуту (60 000 миллисекунд)
});

function printOnlinePlayers() {
  const onlinePlayers = Object.keys(bot.players).length;
  console.log(`Игроков онлайн: ${onlinePlayers}`);
}

bot.on('playerJoined', (player) => {
  console.log(`Игрок ${player.username} присоединился к игре.`);
});

bot.on('playerLeft', (player) => {
  console.log(`Игрок ${player.username} покинул игру.`);
});

// Обработка ошибок подключения
bot.on('error', (err) => {
  console.error('Произошла ошибка:', err);
});

// Обработка отключения от сервера
bot.on('end', () => {
  console.log('Бот был отключен от сервера.');
  process.exit(1);
});
