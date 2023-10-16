const express = require('express');
const app = express();

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);

const path = require('path');
const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

app.use(express.json());

const dotenv = require('dotenv');
dotenv.config();

const { default: mongoose } = require('mongoose');
mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('connected to database');
  })
  .catch((error) => {
    console.log(error);
  });

const crypto = require('crypto');
const randomid = () => crypto.randomBytes(8).toString('hex');

app.post('/session', (req, res) => {
  const data = {
    username: req.body.username,
    userid: randomid(),
  };
  res.send(data);
});

io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  const userid = socket.handshake.auth.userid;

  if (!username) {
    return next(new Error('사용자 이름이 존재하지 않습니다.'));
  }

  socket.username = username;
  socket.userid = userid;

  next();
});

let users = [];

const { saveMessages, fetchMessages } = require('./utils/messages');

io.on('connection', async (socket) => {
  let userData = {
    username: socket.username,
    userid: socket.id,
  };
  users.push(userData);
  io.emit('users-data', { users });

  socket.on('message-to-server', (payload) => {
    io.to(payload.to).emit('message-to-client', payload);
    saveMessages(payload);
  });

  socket.on('fetch-messages', ({ receiver }) => {
    fetchMessages(io, socket.id, receiver);
  });

  socket.on('disconnect', () => {
    users = users.filter((user) => user.userid !== socket.id);
    io.emit('users-data', { users });
    io.emit('user-away', socket.id);
  });
});

const port = 4000;
server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
