const { io } = require('socket.io-client');

const [token, receiverId, ...rest] = process.argv.slice(2);
const socket = io('http://localhost:5000', { auth: { token } });

socket.on('connect', () => {
  console.log('connected');
  if (receiverId) {
    socket.emit(
      'send_message',
      { receiverId: Number(receiverId), content: rest.join(' ') },
      (res) => {
        console.log('ack:', res);
        setTimeout(() => process.exit(0), 500);
      }
    );
  }
});

socket.on('connect_error', (e) => console.log('connect error:', e.message));
socket.on('new_message', (m) => console.log('NEW MESSAGE:', m));
socket.on('notification', (n) => console.log('NOTIFICATION:', n));