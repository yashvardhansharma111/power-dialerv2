"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_1 = __importDefault(require("../middleware/upload"));
const bulkcallController_1 = require("../controllers/bulkcallController");
const router = express_1.default.Router();
router.post("/upload-excel", upload_1.default.single("file"), bulkcallController_1.uploadNumbersFromExcel);
router.post("/start", bulkcallController_1.startBulkCalls);
router.post("/pause", bulkcallController_1.pauseBulkCalls);
router.post("/resume", bulkcallController_1.resumeBulkCalls);
router.post("/stop", bulkcallController_1.stopBulkCalls);
router.get("/status", bulkcallController_1.getBulkCallStatus);
exports.default = router;
