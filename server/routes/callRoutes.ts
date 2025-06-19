import express from "express";
import { makeManualCall, uploadAndStartCalls, terminateCall } from "../controllers/callController";
import verifyToken from "../middleware/verifyToken";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/manual", verifyToken, makeManualCall);
router.post("/upload", verifyToken, upload.single("file"), uploadAndStartCalls);
router.post("/terminate/:sid", verifyToken, terminateCall); // ✅ ADDED

export default router;
