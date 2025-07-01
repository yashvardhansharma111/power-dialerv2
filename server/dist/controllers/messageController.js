"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageStatusCallback = exports.sendMessage = exports.getConversation = exports.filterMessages = exports.getAllMessages = void 0;
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
// 1. Get latest messages grouped by contact
const getAllMessages = async (req, res) => {
    try {
        const messages = await twilioClient_1.default.messages.list({ limit: 100 });
        const latestByNumber = {};
        messages.forEach((msg) => {
            const key = msg.direction === "inbound" ? msg.from : msg.to;
            if (!latestByNumber[key])
                latestByNumber[key] = msg;
        });
        res.status(200).json(Object.values(latestByNumber));
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch messages", details: err.message });
    }
};
exports.getAllMessages = getAllMessages;
// 2. Filter messages by reply status
const filterMessages = async (req, res) => {
    const { status } = req.query; // 'replied' | 'unreplied' | 'all'
    try {
        const messages = await twilioClient_1.default.messages.list({ limit: 100 });
        const grouped = {};
        messages.forEach((msg) => {
            const number = msg.direction === "inbound" ? msg.from : msg.to;
            if (!grouped[number]) {
                grouped[number] = {
                    inbound: msg.direction === "inbound",
                    lastMessage: msg,
                };
            }
        });
        const filtered = Object.entries(grouped).filter(([_, data]) => {
            if (status === "replied")
                return !data.inbound;
            if (status === "unreplied")
                return data.inbound;
            return true;
        }).map(([_, data]) => data.lastMessage);
        res.status(200).json(filtered);
    }
    catch (err) {
        res.status(500).json({ error: "Filter failed", details: err.message });
    }
};
exports.filterMessages = filterMessages;
// 3. Chat history between two numbers
const getConversation = async (req, res) => {
    const { number } = req.params;
    const from = req.query.from || process.env.DEFAULT_TWILIO_NUMBER;
    try {
        const sent = await twilioClient_1.default.messages.list({ to: number, from, limit: 50 });
        const received = await twilioClient_1.default.messages.list({ to: from, from: number, limit: 50 });
        const all = [...sent, ...received].sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());
        res.status(200).json(all);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to load conversation", details: err.message });
    }
};
exports.getConversation = getConversation;
// 4. Send a message using dynamic `from`
const sendMessage = async (req, res) => {
    const { to, body, from } = req.body;
    const sender = from || process.env.DEFAULT_TWILIO_NUMBER;
    if (!to || !body || !sender) {
        res.status(400).json({ error: "Missing 'to', 'from', or 'body'" });
        return;
    }
    try {
        const message = await twilioClient_1.default.messages.create({
            to,
            from: sender,
            body,
            statusCallback: `${process.env.BASE_URL}/api/messages/status-callback`, // ✅ Track delivery status
        });
        res.status(200).json({ success: true, message });
    }
    catch (err) {
        res.status(500).json({ error: "Send failed", details: err.message });
    }
};
exports.sendMessage = sendMessage;
const messageStatusCallback = async (req, res) => {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;
    console.log("📩 Message Status Update:", {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage,
    });
    // You can optionally store this info in DB or cache here
    res.status(200).send("Status received");
};
exports.messageStatusCallback = messageStatusCallback;
