"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
// Import Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const callRoutes_1 = __importDefault(require("./routes/callRoutes"));
const twilioRoutes_1 = __importDefault(require("./routes/twilioRoutes"));
const numberRoutes_1 = __importDefault(require("./routes/numberRoutes"));
const callLogRoutes_1 = __importDefault(require("./routes/callLogRoutes"));
const bulkCallRoutes_1 = __importDefault(require("./routes/bulkCallRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const app = (0, express_1.default)();
// ✅ Proper CORS middleware for Express
app.use((0, cors_1.default)({
    origin: "https://zifybot.com", // or "*" for testing only
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const server = http_1.default.createServer(app);
// ✅ CORS setup for Socket.IO
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:3000",
            "https://zifybot.com/",
            "https://zifybot.com"
        ], // same as frontend
        methods: ["GET", "POST"]
    }
});
// Make io accessible in controllers via app
app.set("io", io);
// Route Mounting
app.use("/api/auth", authRoutes_1.default);
app.use("/api/calls", callRoutes_1.default);
app.use("/api/twilio", twilioRoutes_1.default);
app.use("/api/numbers", numberRoutes_1.default);
app.use("/api/call-logs", callLogRoutes_1.default);
app.use("/api/bulk-calls", bulkCallRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/messages", messageRoutes_1.default);
app.get("/", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server is healthy ✅" });
});
// WebSocket connection log
io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
