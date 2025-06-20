"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const callLogController_1 = require("../controllers/callLogController");
const verifyToken_1 = __importDefault(require("../middleware/verifyToken"));
const router = express_1.default.Router();
router.get("/all", verifyToken_1.default, callLogController_1.getAllCallLogs); // GET /api/call-logs/all
router.get("/:number", verifyToken_1.default, callLogController_1.getCallLogsByNumber); // GET /api/call-logs/+18449753997
router.get("/recording/:sid", verifyToken_1.default, callLogController_1.getRecordingBySid); // GET /api/call-logs/recording/:sid
router.get("/recording/audio/:sid", verifyToken_1.default, callLogController_1.streamRecordingAudio); // GET /api/call-logs/recording/audio/:sid
exports.default = router;
