console.log('Client.js is loaded');

document.getElementById('startButton').addEventListener('click', startBot);
document.getElementById('stopButton').addEventListener('click', stopBot);
document.getElementById('changePlayerButton').addEventListener('click', changePlayer);
const socket = io();

google.load("visualization", "1", { packages: ["corechart"] });
google.setOnLoadCallback(drawChart);



// Функция для обновления количества онлайн-игроков
function updateOnlinePlayers() {
  fetch('/data')
    .then(response => response.json())
    .then(data => {
      // Обновление количества онлайн-игроков или выполнение других действий с данными
      const onlinePlayersCountElement = document.getElementById('onlinePlayersCount');
      if (onlinePlayersCountElement) {
        onlinePlayersCountElement.innerText = data.length - 1; // Вычитаем 1, чтобы исключить заголовок
      }
    })
    .catch(error => console.error('Ошибка получения данных:', error));
}

function drawChart() {
  fetch('/data')
    .then(response => response.json())
    .then(data => {
      var chartData = google.visualization.arrayToDataTable(data);
      var options = {
        title: 'Количество игроков',
        hAxis: { title: 'время' },
        vAxis: { title: 'Игроков' }
      };
      var chart = new google.visualization.ColumnChart(document.getElementById('graph'));
      chart.draw(chartData, options);

      // Запуск первого обновления и установка интервала на каждые 10 секунд
      updateOnlinePlayers(); // Запускаем первый раз сразу
      setInterval(updateOnlinePlayers, 10000); // Устанавливаем интервал обновления каждые 10 секунд
    })
    .catch(error => console.error('Ошибка получения данных:', error));
}

function changePlayer() {
  const playerNameInput = document.getElementById('playerNameInput').value;
  const playerNumberInput = document.getElementById('playerNumberInput').value;

  if (!playerNameInput || !playerNumberInput) {
    alert('Введите ник и номер игрока');
    return;
  }

  console.log('Sending payload:', { playerName: playerNameInput, playerNumber: parseInt(playerNumberInput, 10) });

  const payload = {
    playerName: playerNameInput,
    playerNumber: parseInt(playerNumberInput, 10)
  };

  fetch('/changePlayer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  .then(response => response.json())
  .then(data => {
    alert(data.message);
  })
  .catch(error => {
    console.error('Error changing player:', error);
  });
}


// Функция для получения сообщений с сервера
async function getMessagesFromServer() {
  try {
    const response = await fetch('/getMessages');
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error getting messages from server:', error);
    return [];
  }
}

// Функция для отображения сообщений при загрузке страницы
async function displayStoredMessages() {
  const storedMessages = await getMessagesFromServer();

  storedMessages.forEach((message) => {
    displayMessage(message);
  });
}

// Вызываем функцию отображения сообщений при загрузке страницы
displayStoredMessages();

async function displayMessage(message) {
  var messageElement = document.createElement('p');
  messageElement.textContent = getCurrentTime() + ' ' + message;

  var consoleBlock = document.getElementById('console_block');
  var consoleOutput = consoleBlock.querySelector('.console_box');
  consoleOutput.appendChild(messageElement);

  // Отправляем сообщение на сервер для сохранения
  try {
    await fetch('/saveMessages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [{ time: getCurrentTime(), message }] }),
    });
  } catch (error) {
    console.error('Error saving message to server:', error);
  }
}

async function saveMessagesToServer(messages) {
  try {
    const response = await fetch('/saveMessages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: messages }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('Messages saved successfully');
    } else {
      console.error('Error saving messages on server:', data.error);
    }
  } catch (error) {
    console.error('Error saving messages on server:', error);
  }
}

// Вызываем функцию сохранения на сервере перед выгрузкой страницы
window.addEventListener('unload', () => {
  var storedMessages = JSON.parse(localStorage.getItem('consoleMessages')) || [];
  saveMessagesToServer(storedMessages);
});
// Функция для получения текущего времени в формате HH:mm:ss
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

socket.on('botStarted', () => {
  // Обновление количества игроков онлайн
  printOnlinePlayers();

  // Устанавливаем интервал для обновления каждые 10 секунд
  setInterval(() => {
    printOnlinePlayers();
  }, 1000);
});

// Добавьте следующий код для прослушивания события 'chatMessage' и вывода сообщений чата в консоль браузера
socket.on('chatMessage', (message) => {
  displayMessage(message);
});


function startBot() {
  // Удаляем предыдущий обработчик, чтобы избежать повторного назначения
  document.getElementById('startButton').removeEventListener('click', startBot);

  fetch('/startBot')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to start bot: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      displayMessage(data.message);
    })
    .catch(error => {
      console.error('Error starting bot:', error.message);
    })
    .finally(() => {
      // После завершения запроса, снова назначаем обработчик
      document.getElementById('startButton').addEventListener('click', startBot);
    });
}

function stopBot() {
  // Удаляем предыдущий обработчик, чтобы избежать повторного назначения
  document.getElementById('stopButton').removeEventListener('click', stopBot);

  fetch('/stopBot')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to stop bot: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      displayMessage(data.message);
    })
    .catch(error => {
      console.error('Error stopping bot:', error.message);
    })
    .finally(() => {
      // После завершения запроса, снова назначаем обработчик
      document.getElementById('stopButton').addEventListener('click', stopBot);
    });
}
function printOnlinePlayers() {
  // Отправляем запрос на сервер для получения информации об онлайн-игроках
  fetch('/onlinePlayers')
    .then(response => response.json())
    .then(data => {
      const onlinePlayersCount = data.count;
      document.getElementById('onlinePlayersCount').textContent = onlinePlayersCount;
    })
    .catch(error => {
      console.error('Error fetching online players:', error);
    });
}
