"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const callController_1 = require("../controllers/callController");
const verifyToken_1 = __importDefault(require("../middleware/verifyToken"));
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
router.post("/manual", verifyToken_1.default, callController_1.makeManualCall);
router.post("/terminate/:sid", verifyToken_1.default, callController_1.terminateCall); // ✅ ADDED
exports.default = router;
