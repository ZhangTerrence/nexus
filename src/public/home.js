/* eslint-env browser */
// eslint-disable-next-line no-undef
const socket = io();

const room = document.getElementById("room").innerText;
const messages = document.getElementById("messages");
const messageBox = document.getElementById("messageBox");
const sendButton = document.getElementById("submit");

socket.emit("joinRoom", {
  room
});

socket.on("message", (e) => {
  let node = document.createElement("div");
  node.innerText = e.message;
  messages.append(node);
});

socket.on("joinMessage", (e) => {
  let node = document.createElement("div");
  node.innerText = e.message;
  messages.append(node);
});

function sendMessage(e) {
  e.preventDefault();
  console.log(room);

  socket.emit("message", {
    room,
    message: messageBox.value
  });
}

sendButton.addEventListener("click", (e) => sendMessage(e));
