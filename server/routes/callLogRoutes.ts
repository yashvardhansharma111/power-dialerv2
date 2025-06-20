import express from "express";
import { getAllCallLogs, getCallLogsByNumber, getRecordingBySid, streamRecordingAudio } from "../controllers/callLogController";
import verifyToken from "../middleware/verifyToken";

const router = express.Router();

router.get("/all", verifyToken, getAllCallLogs); // GET /api/call-logs/all
router.get("/:number", verifyToken, getCallLogsByNumber); // GET /api/call-logs/+18449753997
router.get("/recording/:sid", verifyToken, getRecordingBySid); // GET /api/call-logs/recording/:sid
router.get("/recording/audio/:sid", verifyToken, streamRecordingAudio); // GET /api/call-logs/recording/audio/:sid

export default router;
