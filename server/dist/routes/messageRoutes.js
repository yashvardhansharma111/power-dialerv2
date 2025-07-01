"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageController_1 = require("../controllers/messageController");
const router = express_1.default.Router();
router.get("/all", messageController_1.getAllMessages); // GET /api/messages/all
router.get("/filter", messageController_1.filterMessages); // GET /api/messages/filter?status=replied
router.get("/conversation/:number", messageController_1.getConversation); // GET /api/messages/conversation/:number?from=+1XXX
router.post("/send", messageController_1.sendMessage); // POST /api/messages/send
router.post("/status-callback", messageController_1.messageStatusCallback);
exports.default = router;
