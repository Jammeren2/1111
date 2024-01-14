const express = require('express');
const path = require('path');
const mineflayer = require('mineflayer');
const http = require('http');
const socketIO = require('socket.io');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

const dataFilePath = path.join(__dirname, 'data.json');
const initialData = [["00:00:00", 0]];

// Чтение текущих данных из файла (если файл существует)
let existingData = [];
if (fs.existsSync(dataFilePath)) {
  try {
    existingData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
  } catch (error) {
    console.error('Error parsing existing data:', error);
    existingData = [];
  }
}

// Очистка и запись новых данных в файл
fs.writeFileSync(dataFilePath, JSON.stringify(initialData), 'utf-8');

app.use(express.static(path.join(__dirname, 'public')));

let bot;
// Парсер JSON-тела запроса
app.use(bodyParser.json());

app.get('/data', (req, res) => {
  const filePath = path.join(__dirname, 'data.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Ошибка сервера');
      return;
    }

    const jsonData = JSON.parse(data);
    res.json([['время', 'Игроков'], ...jsonData]); // Ensure it has the required format
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
  
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/login', (req, res) => {
  const { email, pass } = req.body;
  // Здесь вам нужно добавить логику проверки логина и пароля
  if (email === 'admin' && pass === 'maga') {
    res.status(200).json({ message: 'Login successful' });  
  } else {
    res.status(401).json({ message: 'Login failed' });
  }
});
// Добавьте обратно функцию /onlinePlayers
app.get('/onlinePlayers', (req, res) => {
  if (bot) {
    const onlinePlayersCount = Object.keys(bot.players).length;
    res.json({ count: onlinePlayersCount });
  } else {
    res.json({ count: 0 });
  }
});
// Маршрут для изменения ника игрока
app.post('/changePlayer', (req, res) => {
  const { playerName, playerNumber } = req.body;
  if (!playerName || !playerNumber) {
    return res.status(400).json({ message: 'Введите ник и номер строки' });
  }

  const coordinatesPath = path.join(__dirname, 'public', 'playerCoordinates.json');
  const fs = require('fs');

  try {
    let playerCoordinates = JSON.parse(fs.readFileSync(coordinatesPath, 'utf8'));

    // Проверка наличия строки
    const matchingIndex = playerCoordinates.findIndex(row => row.number === playerNumber);

    if (matchingIndex === -1) {
      return res.status(400).json({ message: 'Строка с указанным номером не найдена' });
    }

    // Изменяем ник в строке
    playerCoordinates[matchingIndex].name = playerName;

    // Переписываем файл
    fs.writeFileSync(coordinatesPath, JSON.stringify(playerCoordinates, null, 2));

    return res.json({ message: `Комнота ${playerNumber} успешно изменена на игрока ${playerName}` });
  } catch (error) {
    console.error('Error changing player:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});
app.post('/saveMessages', async (req, res) => {
  const messages = req.body.messages;

  try {
    const filePath = path.join(__dirname, 'messages', 'consoleMessages.json');
    const existingMessages = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : [];
    const updatedMessages = existingMessages.concat(messages);

    await fs.promises.writeFile(filePath, JSON.stringify(updatedMessages, null, 2));

    console.log('Messages saved successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving messages:', error);
    res.status(500).json({ error: 'Error saving messages' });
  }
});

app.get('/getMessages', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'messages', 'consoleMessages.json');
    const messages = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : [];

    res.json({ messages: messages });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Error getting messages' });
  }
});




app.get('/startBot', (req, res) => {
  if (!bot) {
    bot = mineflayer.createBot({
      host: 'localhost',
      username: 'ChatGPT_Bot',
      auth: 'offline'
    });

    // Добавляем плагин для работы с путевыми точками
    bot.loadPlugin(pathfinder);
    bot.on('message', (jsonMsg) => {
      // console.log('Raw message from bot:', jsonMsg.toString());

      try {
        const message = JSON.parse(jsonMsg.toString());

      } catch (error) {
        const currentTime = new Date().toLocaleString();
        console.log(`${currentTime} - System (Raw):`, jsonMsg.toString());
        const msg = jsonMsg.toString();
        // Ваш код обработки сообщений чата и выполнения команд
        io.emit('chatMessage', msg);

        // Define player coordinates and names
        const coordinatesPath = path.join(__dirname, 'public', 'playerCoordinates.json');
        const fs = require('fs');
        const playerCoordinates = JSON.parse(fs.readFileSync(coordinatesPath, 'utf8'));
        if (msg.includes('joined the game')) {
          updateOnlineChartData(); // добавим вызов функции при присоединении игрока
        }
        if (msg.includes('left the game')) {
          updateOnlineChartData(); // добавим вызов функции при присоединении игрока
        }
        // работа с лс
        if (msg.includes('->')) {
          if (!msg.includes('напиши')) {
            const playerName = getPlayerName(msg);
            if (playerName) {
              // Используем метод find для поиска объекта по имени игрока
              const playerData = playerCoordinates.find(player => player.name === playerName);
              if (playerData) {
                const coordinates = playerData.coordinates;
                if (coordinates) {
                  teleportAndRetreat(coordinates, playerName);
                } else {
                  console.log(`Player ${playerName} not found in the coordinates list.`);
                }
              }
            }
          } else if (msg.includes('напиши')) {
            const messageToWrite = msg.split('напиши ')[1];
            if (messageToWrite) {
              bot.chat(messageToWrite);
            } else {
              console.log(`Invalid usage of "напиши" command. Example: напиши Привет`);
            }
          }
        }
      }
    });


    res.json({ message: 'Bot started' });
  } else {
    res.json({ message: 'Bot is already running' });
  }
});

app.get('/stopBot', (req, res) => {
  if (bot) {
    bot.end();
    bot = null;
    res.json({ message: 'Bot stopped' });
  } else {
    res.json({ message: 'Bot is not running' });
  }
});

// Подключаем сокет для обмена сообщениями между сервером и клиентом
io.on('connection', (socket) => {
  console.log('A user connected');

  // Обработка отключения пользователя
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// Вспомогательные функции

const teleportAndRetreat = (coordsList, playerName) => {
  console.log(`Телепортирую: ${playerName}...`);

  // Создаем массив целей на основе переданных координат
  const goalsList = coordsList.map(coords => new goals.GoalBlock(coords[0], coords[1], coords[2]));

  // Устанавливаем первую цель
  bot.pathfinder.setGoal(goalsList[0]);

  // Ждем, пока бот достигнет первой цели
  setTimeout(() => {
    // После задержки переходим к следующей цели
    bot.pathfinder.setGoal(goalsList[1]);

    // Ждем, пока бот достигнет второй цели
    setTimeout(() => {
      // Возвращаем бота к первой цели
      bot.pathfinder.setGoal(goalsList[0]);

      // Ждем, пока бот достигнет первой цели
      setTimeout(() => {
        // Устанавливаем цель для отступления
        const retreatGoal = new goals.GoalBlock(-60, 83, 20);
        bot.pathfinder.setGoal(retreatGoal);
      }, 2000);
    }, 2000);
  }, 2000 * (goalsList.length - 1));
};

function getPlayerName(msg) {
  const arrowIndex = msg.indexOf('->');
  const playerNameIndex = msg.indexOf('✉') + 1;

  if (arrowIndex !== -1 && playerNameIndex !== -1) {
    return msg.substring(playerNameIndex, arrowIndex).trim();
  }

  return null;
}


function updateOnlineChartData() {
  // Fetch the current time and online players count
  const currentTime = new Date().toLocaleTimeString();
  const onlinePlayersCount = bot.players ? Object.keys(bot.players).length : 0;

  // Read the existing data from data.json
  const filePath = path.join(__dirname, 'data.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    try {
      // Parse the existing data
      const jsonData = JSON.parse(data);

      // Add the new data to jsonData
      jsonData.push([currentTime, onlinePlayersCount]);

      // Write the updated data back to data.json
      fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log('Data updated and written to data.json');
        }
      });

      // Notify connected clients about the update
      io.emit('updateOnlineChartData', { time: currentTime, count: onlinePlayersCount });
    } catch (parseError) {
      console.error('Error parsing data.json:', parseError);
    }
  });
}
