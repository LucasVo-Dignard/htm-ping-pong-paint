const socket = io();

socket.on('code', (code) => {
  console.log(code);
 });

socket.on('disconnect', () => {
  console.log("disconnected");
});
