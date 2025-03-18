//libraries
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
dotenv.config() 

const express = require('express');
const http = require('http')
const { Server } = require('socket.io');
const { text } = require('stream/consumers');

//setting up socket server instance
const app = express();
app.use(express.json())
app.use(cors())
app.use( cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }))

const server = http.createServer(app)
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
})


app.get("/", (req, res) => { 
    res.send("Welcome to my webrtc server") 
})

let rooms = {}

//socket connection
io.on('connection', (socket) => {
    console.log(`user connected: ${socket.id}`)

    socket.emit('connection-success', {
        status: "connection-success",
        socketId: socket.id
    })

    socket.on("join room", roomId => {
        console.log("rooms before: ",rooms)
        if(rooms[roomId]){
            rooms[roomId].push(socket.id)
        } else {
            rooms[roomId] = [socket.id]
        }
        const otherUser = rooms[roomId].find(id => id !== socket.id);
        if(otherUser){
            socket.emit("other user", otherUser)
            socket.to(otherUser).emit("user joined", socket.id);
        }
        console.log("rooms after: ",rooms)
    })

    socket.on("offer", data => {
        console.log("offer received",data)
        socket.broadcast.emit('offer', data)
    })

    socket.on('candidate', data => {
        console.log(data)
        socket.broadcast.emit('candidate', data)
    })

    socket.on("answer", data => {
        console.log("offer received",data)
        socket.broadcast.emit('offer', data)
        // io.to(payload.target).emit("answer", payload);
    });


    socket.on('disconnect', () => {
        console.log('User disconnected: ', socket.id)
    }) 
})

server.listen(3000, () => {
    console.log("webrtc server is running on port 3000")
})