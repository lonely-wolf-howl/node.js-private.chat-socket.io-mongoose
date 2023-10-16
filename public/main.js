const socket = io('http://localhost:4000', {
  autoConnect: false,
});

socket.onAny((event, ...args) => {
  console.log(event, ...args);
});

const loginForm = document.querySelector('.user-login');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username');
  createSession(username.value.toLowerCase());
  username.value = '';
});

const loginContainer = document.querySelector('.login-container');
const chatBody = document.querySelector('.chat-body');
const userTitle = document.querySelector('#user-title');

const createSession = async (username) => {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  };
  await fetch('/session', options)
    .then((res) => res.json())
    .then((data) => {
      socketConnect(data.username, data.userid);

      localStorage.setItem('session-username', data.username);
      localStorage.setItem('session-userid', data.userid);

      loginContainer.classList.add('d-none');
      chatBody.classList.remove('d-none');

      userTitle.innerText = data.username;
    })
    .catch((error) => {
      console.error(error);
    });
};

const socketConnect = async (username, userid) => {
  socket.auth = { username, userid };

  await socket.connect();
};

const userTable = document.querySelector('.users');
const usersTagline = document.querySelector('#users-tagline');

socket.on('users-data', ({ users }) => {
  const index = users.findIndex((user) => user.userid === socket.id);
  if (index > -1) {
    users.splice(index, 1);
  }

  userTable.innerHTML = '';
  let ul = `<table class="table table-hover">`;
  for (const user of users) {
    ul += `
    <tr class="socket-users" onclick="setActiveUser(this, '${user.username}', '${user.userid}')">
      <td>${user.username}<span class="text-danger ps-1 d-none" id="${user.userid}">!</span></td>
    </tr>`;
  }
  ul += `</table>`;

  if (users.length > 0) {
    userTable.innerHTML = ul;
    usersTagline.innerHTML = '현재 접속중인 사용자';
    usersTagline.classList.remove('text-danger');
    usersTagline.classList.add('text-success');
  } else {
    usersTagline.innerHTML = '현재 접속중인 사용자가 없습니다.';
    usersTagline.classList.remove('text-success');
    usersTagline.classList.add('text-danger');
  }
});

const title = document.querySelector('#active-user');
const msgDiv = document.querySelector('.msg-form');
const messages = document.querySelector('.messages');

const setActiveUser = (element, username, userid) => {
  title.innerHTML = username;
  title.setAttribute('userid', userid);

  const lists = document.getElementsByClassName('socket-users');
  for (let i = 0; i < lists.length; i++) {
    lists[i].classList.remove('table-active');
  }
  element.classList.add('table-active');

  msgDiv.classList.remove('d-none');
  messages.classList.remove('d-none');
  messages.innerHTML = '';
  socket.emit('fetch-messages', { receiver: userid });

  const notify = document.getElementById(userid);
  notify.classList.add('d-none');
};

const sessionUsername = localStorage.getItem('session-username');
const sessionUserid = localStorage.getItem('session-userid');

if (sessionUsername && sessionUserid) {
  socketConnect(sessionUsername, sessionUserid);

  loginContainer.classList.add('d-none');
  chatBody.classList.remove('d-none');
  userTitle.innerText = sessionUsername;
}

const msgForm = document.querySelector('.msgForm');
const message = document.getElementById('message');

msgForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const to = title.getAttribute('userid');
  const time = new Date().toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const payload = {
    from: socket.id,
    to,
    message: message.value,
    time,
  };
  socket.emit('message-to-server', payload);

  appendMessage({ ...payload, background: 'bg-success', position: 'right' });

  message.value = '';
  message.focus();
});

const appendMessage = ({ message, time, background, position }) => {
  let div = document.createElement('div');
  div.classList.add(
    'message',
    'bg-opacity-25',
    'm-2',
    'px-2',
    'py-1',
    background,
    position
  );
  div.innerHTML = `<span class="msg-text">${message}</span><span class="msg-time">&nbsp${time}</span>`;
  messages.append(div);
  messages.scrollTo(0, messages.scrollHeight);
};

socket.on('message-to-client', ({ from, to, message, time }) => {
  const receiver = title.getAttribute('userid');
  const notify = document.getElementById(from);

  if (receiver === from) {
    appendMessage({
      message,
      time,
      background: 'bg-secondary',
      position: 'left',
    });
  } else {
    notify.classList.remove('d-none');
  }
});

socket.on('user-away', (userid) => {
  const to = title.getAttribute('userid');
  if (to === userid) {
    title.innerHTML = '';
    msgDiv.classList.add('d-none');
    messages.classList.add('d-none');
  }
});

socket.on('stored-messages', ({ messages }) => {
  if (messages.length > 0) {
    messages.forEach((message) => {
      const payload = {
        message: message.message,
        time: message.time,
      };

      // 내가 보냈을 때
      if (message.from === socket.id) {
        appendMessage({
          ...payload,
          background: 'bg-success',
          position: 'right',
        });
        // 상대방이 보냈을 때
      } else {
        appendMessage({
          ...payload,
          background: 'bg-secondary',
          position: 'left',
        });
      }
    });
  }
});
