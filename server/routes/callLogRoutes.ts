import express from "express";
import { getAllCallLogs, getCallLogsByNumber } from "../controllers/callLogController";
import verifyToken from "../middleware/verifyToken";

const router = express.Router();

router.get("/all", verifyToken, getAllCallLogs); // GET /api/call-logs/all
router.get("/:number", verifyToken, getCallLogsByNumber); // GET /api/call-logs/+18449753997

export default router;
