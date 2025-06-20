"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCallState = exports.pauseBulkCalls = exports.resumeBulkCalls = exports.getBulkCallStatus = exports.stopBulkCalls = exports.startBulkCalls = exports.uploadNumbersFromExcel = exports.dialNextNumber = void 0;
const parseExcel_1 = require("../utils/parseExcel");
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
const bulkCallState = {
    numbers: [],
    delay: 5000, // default delay (5 seconds)
    currentIndex: 0,
    isPaused: false,
    isStopped: false,
    from: undefined, // <-- Add from here
    results: [],
};
exports.bulkCallState = bulkCallState;
// 🧠 Helper to wait
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
// 🆕 Dial next number only (event-driven)
const dialNextNumber = async () => {
    if (bulkCallState.isStopped ||
        bulkCallState.isPaused ||
        bulkCallState.currentIndex >= bulkCallState.numbers.length) {
        return;
    }
    const number = bulkCallState.numbers[bulkCallState.currentIndex];
    const conference = `BulkConf-${number}-${Date.now()}`;
    bulkCallState.results[bulkCallState.currentIndex] = { number, status: "in-progress", conference };
    const callerId = bulkCallState.from || process.env.DEFAULT_TWILIO_NUMBER;
    if (!callerId) {
        console.error("[BulkCall] No callerId provided for call.");
        bulkCallState.results[bulkCallState.currentIndex] = {
            number,
            status: "failed",
            error: "No callerId provided",
            conference,
        };
        bulkCallState.currentIndex++;
        setTimeout(exports.dialNextNumber, 1000);
        return;
    }
    console.log(`[BulkCall] [EventDriven] Attempting to call: ${number}`);
    console.log(`[BulkCall] Conference: ${conference}`);
    console.log(`[BulkCall] Twilio payload:`, {
        from: callerId,
        to: number,
        url: `${process.env.BASE_URL}/api/twilio/connect?room=${encodeURIComponent(conference)}`,
        statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
        statusCallbackMethod: "POST",
    });
    try {
        const call = await twilioClient_1.default.calls.create({
            from: callerId,
            to: number,
            record: true,
            url: `${process.env.BASE_URL}/api/twilio/connect?room=${encodeURIComponent(conference)}`,
            statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
            statusCallbackMethod: "POST",
        });
        console.log(`[BulkCall] Call initiated. SID: ${call.sid} To: ${number}`);
        bulkCallState.results[bulkCallState.currentIndex] = {
            number,
            sid: call.sid,
            status: "in-progress",
            conference,
        };
    }
    catch (err) {
        console.error(`[BulkCall] Call failed for ${number}:`, err.message);
        bulkCallState.results[bulkCallState.currentIndex] = {
            number,
            status: "failed",
            error: err.message,
            conference,
        };
        bulkCallState.currentIndex++;
        // Immediately try next if failed
        setTimeout(exports.dialNextNumber, 1000);
        return;
    }
};
exports.dialNextNumber = dialNextNumber;
const uploadNumbersFromExcel = async (req, res) => {
    try {
        const buffer = req.file?.buffer;
        if (!buffer) {
            res.status(400).json({ message: "No Excel file uploaded" });
            return;
        }
        const numbers = (0, parseExcel_1.extractNumbersFromExcel)(buffer);
        if (!numbers.length) {
            res.status(400).json({ message: "No valid numbers found" });
            return;
        }
        // Add + if missing and convert scientific notation to string
        const normalizedNumbers = numbers.map((num) => {
            let str = String(num).replace(/\s+/g, "");
            // Convert scientific notation to plain string if needed
            if (/e\+/i.test(str)) {
                str = Number(str).toFixed(0);
            }
            if (!str.startsWith("+")) {
                str = "+" + str;
            }
            return str;
        });
        bulkCallState.numbers = normalizedNumbers;
        bulkCallState.delay = 5000;
        bulkCallState.currentIndex = 0;
        bulkCallState.isPaused = false;
        bulkCallState.isStopped = false;
        bulkCallState.results = normalizedNumbers.map((num) => ({ number: num, status: "pending" }));
        res.json({ message: "Numbers uploaded", total: numbers.length });
    }
    catch (err) {
        res.status(500).json({ message: "Excel parsing failed", error: err.message });
    }
};
exports.uploadNumbersFromExcel = uploadNumbersFromExcel;
// 🆕 Start event-driven bulk call
const startBulkCalls = async (req, res) => {
    const { from } = req.body;
    if (!bulkCallState.numbers.length) {
        res.status(400).json({ message: "No numbers uploaded" });
        return;
    }
    if (bulkCallState.currentIndex >= bulkCallState.numbers.length) {
        res.status(400).json({ message: "All calls already completed" });
        return;
    }
    bulkCallState.isPaused = false;
    bulkCallState.isStopped = false;
    bulkCallState.from = from || process.env.DEFAULT_TWILIO_NUMBER;
    console.log("[BulkCall] startBulkCalls API called (event-driven)");
    (0, exports.dialNextNumber)();
    res.json({ message: "Bulk calling started" });
};
exports.startBulkCalls = startBulkCalls;
const stopBulkCalls = (_req, res) => {
    bulkCallState.isStopped = true;
    res.json({ message: "Bulk calling stopped" });
};
exports.stopBulkCalls = stopBulkCalls;
const getBulkCallStatus = (_req, res) => {
    res.json({
        total: bulkCallState.numbers.length,
        currentIndex: bulkCallState.currentIndex,
        isPaused: bulkCallState.isPaused,
        isStopped: bulkCallState.isStopped,
        results: bulkCallState.results,
    });
};
exports.getBulkCallStatus = getBulkCallStatus;
const resumeBulkCalls = async (_req, res) => {
    if (!bulkCallState.isPaused) {
        res.status(400).json({ message: "Bulk calling is not paused" });
        return;
    }
    bulkCallState.isPaused = false;
    // Only dial next if not already in-progress
    const current = bulkCallState.results[bulkCallState.currentIndex];
    if (!current || current.status !== "in-progress") {
        (0, exports.dialNextNumber)();
    }
    res.json({ message: "Bulk calling resumed" });
};
exports.resumeBulkCalls = resumeBulkCalls;
const pauseBulkCalls = async (_req, res) => {
    bulkCallState.isPaused = true;
    res.json({ message: "Bulk calling paused" });
};
exports.pauseBulkCalls = pauseBulkCalls;
