import express from "express";
import upload from "../middleware/upload";
import {
  uploadNumbersFromExcel,
  startBulkCalls,
  pauseBulkCalls,
  resumeBulkCalls,
  stopBulkCalls,
  getBulkCallStatus,
} from "../controllers/bulkcallController";

const router = express.Router();

router.post("/upload-excel", upload.single("file"), uploadNumbersFromExcel);
router.post("/start", startBulkCalls);
router.post("/pause", pauseBulkCalls);
router.post("/resume", resumeBulkCalls);
router.post("/stop", stopBulkCalls);
router.get("/status", getBulkCallStatus);

export default router;
