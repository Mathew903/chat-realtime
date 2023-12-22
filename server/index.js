import express from "express"
import morgan from "morgan"
import { Server } from "socket.io"
import { createServer } from "node:http"
import { createClient } from "@libsql/client"
import {config} from 'dotenv'
config()
const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)

const io = new Server(server, {
  connectionStateRecovery: {}
})

const db = createClient({
  url: "libsql://steady-doctor-spectrum-mathew903.turso.io",
  authToken: process.env.DB_TOKEN
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user TEXT NOT NULL
  )
`)

io.on("connection", async (socket) => {
  console.log("a user has connected")

  socket.on("chat message", async (msg) => {
    let result;
    const user = socket.handshake.auth.user ?? 'Anonymous'
    try {
      result = await db.execute({
        sql: "INSERT INTO messages (content, user) VALUES (:msg, :user)",
        args: { msg, user }
      })
    } catch (error) {
      console.error(error)
      return
    }
    io.emit("chat message", msg, result.lastInsertRowid.toString(), user)
  })

  socket.on("disconnect", () => {
    console.log("an user has disconnected")
  })

  if (!socket.recovered) {
    try {
      const res = await db.execute({
        sql: "SELECT * FROM messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0]
      })

      res.rows.forEach(row => {
        socket.emit("chat message", row.content, row.id.toString(), row.user)
      })
    } catch (error) {
      console.log(error)
    }
  }
})

app.use(morgan("dev"))

app.get("/", (req, res) => {
  res.sendFile(`${process.cwd()}/client/index.html`)
})

server.listen(port, () => {
  console.log(`Escuchando en http://localhost:${port}`)
})
