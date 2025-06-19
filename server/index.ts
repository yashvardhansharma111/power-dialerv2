import dotenv from "dotenv"
dotenv.config()

import express from "express"
import http from "http"
import cors from "cors"
import { Server } from "socket.io"

// Import Routes
import authRoutes from "./routes/authRoutes"
import callRoutes from "./routes/callRoutes"
import twilioRoutes from "./routes/twilioRoutes"
import numberRoutes from "./routes/numberRoutes"
import callLogRoutes from "./routes/callLogRoutes"
import bulkRoutes from "./routes/bulkCallRoutes"

const app = express()

// ✅ Proper CORS middleware for Express
app.use(cors({
  origin: "http://localhost:3000", // or "*" for testing only
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const server = http.createServer(app)

// ✅ CORS setup for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // same as frontend
    methods: ["GET", "POST"]
  }
})

// Make io accessible in controllers via app
app.set("io", io)

// Route Mounting
app.use("/api/auth", authRoutes)
app.use("/api/calls", callRoutes)
app.use("/api/twilio", twilioRoutes)
app.use("/api/numbers", numberRoutes)
app.use("/api/call-logs", callLogRoutes)
app.use("/api/bulk-calls", bulkRoutes)

app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy ✅" })
})

// WebSocket connection log
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id)
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id)
  })
})

const PORT = process.env.PORT || 8000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
