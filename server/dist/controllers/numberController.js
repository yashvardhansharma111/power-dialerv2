"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableNumbers = void 0;
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
const getAvailableNumbers = async (req, res) => {
    try {
        console.log("🔍 [GET /api/numbers/available] Request received");
        // Log environment variables for sanity check (mask sensitive info)
        console.log("🌐 Environment Check:");
        console.log("  • TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "✅" : "❌ Missing");
        console.log("  • TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "✅" : "❌ Missing");
        // Attempt to fetch numbers
        console.log("📞 Fetching available Twilio numbers...");
        const numbers = await twilioClient_1.default.incomingPhoneNumbers.list();
        // Check if empty or undefined
        if (!numbers || numbers.length === 0) {
            console.warn("⚠️ No Twilio numbers found in this account");
        }
        else {
            console.log(`✅ ${numbers.length} number(s) fetched`);
        }
        // Log each number fetched (for debugging)
        numbers.forEach((num, idx) => {
            console.log(`  ${idx + 1}. SID: ${num.sid}, Number: ${num.phoneNumber}`);
        });
        // Respond to client
        res.json(numbers.map((num) => ({
            sid: num.sid,
            phoneNumber: num.phoneNumber,
        })));
    }
    catch (err) {
        console.error("❌ Twilio Error:", {
            message: err.message,
            code: err.code,
            status: err.status,
            stack: err.stack,
            moreInfo: err.moreInfo,
        });
        res.status(500).json({
            message: "❌ Failed to fetch numbers",
            error: err.message || "Unknown error",
            code: err.code,
        });
    }
};
exports.getAvailableNumbers = getAvailableNumbers;
