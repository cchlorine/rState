const express = require('express')
const cors = require('cors')
const Redis = require('ioredis')
const { Server } = require('socket.io')

const app = express();
const http = require('http');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});
const redis = new Redis(6379, process.env.REDIS_HOST);

app.use(cors())

io.on('connection', (socket) => {
  
  socket.on('sub', async (payload) => {
    console.log(payload)
    const { namespace, key, initialValue } = payload
    const room = `${namespace}:${key}`

    if (typeof initialValue !== "undefined") {
      const isNew = await redis.hsetnx(namespace, key, initialValue)
      if (isNew) socket.to(room).emit(room, initialValue)
    }

    socket.join(room)
    socket.emit(room, await redis.hget(namespace, key))
  })

  socket.on('save', async (payload) => {
    console.log(payload)
    const { namespace, key, value } = payload
    const room = `${namespace}:${key}`

    redis.hset(namespace, key, value)
    io.to(room).emit(room, await redis.hget(namespace, key))
  })

});

server.listen(12152, () => {
  console.log('listening on http://localhost:12152');
});