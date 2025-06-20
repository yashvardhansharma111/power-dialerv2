"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const twilioController_1 = require("../controllers/twilioController");
const router = express_1.default.Router();
router.post("/events", twilioController_1.callStatusWebhook);
router.post("/bridge", twilioController_1.bridgeCall); // ✅ THIS IS FINE
router.post("/incoming", twilioController_1.handleIncomingCall);
router.post("/connect", twilioController_1.connectCall); // ✅ THIS IS FINE
router.get("/token", twilioController_1.getToken);
router.get("/join-conference", twilioController_1.joinConference);
exports.default = router;
