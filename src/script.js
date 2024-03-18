const socket = new JsSIP.WebSocketInterface("wss://voip.uiscom.ru");
const form = document.querySelector("#login-form");
let ua;
let timeInterval;

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const { login, password, server } = Object.fromEntries(formData.entries());

  const socket = new JsSIP.WebSocketInterface(`wss://${server}`);
  const configuration = {
    sockets: [socket],
    uri: `sip:${login}@${server}`,
    password,
  };

  ua = new JsSIP.UA(configuration);

  ua.start();

  ua.on("registered", function (e) {
    console.log("registered");
  });
  ua.on("unregistered", function (e) {
    console.log("unregistered");
  });
  ua.on("registrationFailed", function (e) {
    console.log("registrationFailed");
  });

  ua.on("newRTCSession", function (e) {
    console.log("newRTCSession", e);

    if (e.originator === "remote") {
      e.session.answer();
    }
  });

  ua.on("addstream", function (e) {
    console.log("Remote stream added:", e.stream);

    remoteAudio.srcObject = e.stream;
  });

  ua.on("icecandidate", function (e) {
    if (!e.candidate) return;
    console.log("ICE candidate:", e.candidate);
  });
});

// Обработчики событий звонка
const eventHandlers = {
  progress: (e) => {
    console.log("call is in progress");
    updateCallStatus("Звонок в процессе");

    session.connection.ontrack = (e) => {
      console.log(e);
      remoteAudio.srcObject = e.streams[0];
    };

    const ringtone = document.getElementById("ringtone");
    ringtone.play();
  },
  failed: (e) => {
    console.log("call failed with cause: " + e.cause);
    updateCallStatus("Звонок завершился неудачно");
    document.getElementById("call").style.display = "flex";
    document.getElementById("hangup").style.display = "none";

    const ringtone = document.getElementById("ringtone");
    ringtone.pause();
  },
  ended: (e) => {
    console.log("call ended with cause: " + e.cause);
    updateCallStatus("Звонок завершен");
    document.getElementById("call").style.display = "flex";
    document.getElementById("hangup").style.display = "none";

    clearInterval(timerInterval);
    document.getElementById("callTimer").innerText = "00:00";

    const ringtone = document.getElementById("ringtone");
    ringtone.pause();
  },
  confirmed: (e) => {
    console.log("call confirmed");
    console.log(e);

    // Запускаем таймер при начале звонка
    let startTime = new Date().getTime();
    timerInterval = setInterval(() => {
      let currentTime = new Date().getTime();
      let elapsedTime = Math.floor((currentTime - startTime) / 1000); // Прошедшее время в секундах
      let minutes = Math.floor(elapsedTime / 60);
      let seconds = elapsedTime % 60;
      // Форматирование времени для отображения
      let formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
      // Вывод времени в элемент на странице
      document.getElementById("callTimer").innerText = formattedTime;
    }, 1000);

    const ringtone = document.getElementById("ringtone");
    ringtone.pause();
  },
};

const options = {
  eventHandlers,
  mediaConstraints: { audio: true, video: false },
};

// Кнопка для звонка
document.getElementById("call").addEventListener("click", (e) => {
  const target = document.getElementById("num").value;
  if (!ua) {
    console.error("Client not registered!");
    return;
  }

  session = ua.call(target, options);
  document.getElementById("call").style.display = "none";
  document.getElementById("hangup").style.display = "flex";
});

// Кнопка для отбоя звонка
document.getElementById("hangup").addEventListener("click", () => {
  if (session) {
    session.terminate();
  }

  document.getElementById("call").style.display = "flex";
  document.getElementById("hangup").style.display = "none";
});

// Функция для обновления статуса звонка
const updateCallStatus = (status) => {
  document.getElementById("callStatus").innerText = status;
};
