import express from "express";
import {
  getAllMessages,
  filterMessages,
  getConversation,
  sendMessage,
  messageStatusCallback
} from "../controllers/messageController"

const router = express.Router();

router.get("/all", getAllMessages); // GET /api/messages/all
router.get("/filter", filterMessages); // GET /api/messages/filter?status=replied
router.get("/conversation/:number", getConversation); // GET /api/messages/conversation/:number?from=+1XXX
router.post("/send", sendMessage); // POST /api/messages/send
router.post("/status-callback", messageStatusCallback);

export default router;
