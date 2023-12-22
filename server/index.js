import express from "express"
import morgan from "morgan"
import { Server } from "socket.io"
import { createServer } from "node:http"

const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)
const io = new Server(server)

io.on("connection", (socket) => {
  console.log("a user has connected")

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg)
  })

  socket.on("disconnect", () => {
    console.log("an user has disconnected")
  })
})

app.use(morgan("dev"))

app.get("/", (req, res) => {
  res.sendFile(`${process.cwd()}/client/index.html`)
})

server.listen(port, () => {
  console.log(`Escuchando en http://localhost:${port}`)
})
