import express from "express";
import { getAllCallLogs, getCallLogsByNumber, getRecordingBySid } from "../controllers/callLogController";
import verifyToken from "../middleware/verifyToken";

const router = express.Router();

router.get("/all", verifyToken, getAllCallLogs); // GET /api/call-logs/all
router.get("/:number", verifyToken, getCallLogsByNumber); // GET /api/call-logs/+18449753997
router.get("/recording/:sid", verifyToken, getRecordingBySid); // GET /api/call-logs/recording/:sid

export default router;
