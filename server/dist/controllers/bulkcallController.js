"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCallState = exports.pauseBulkCalls = exports.resumeBulkCalls = exports.getBulkCallStatus = exports.stopBulkCalls = exports.startBulkCalls = exports.uploadNumbersFromExcel = void 0;
const parseExcel_1 = require("../utils/parseExcel");
const bulkCallState = {
    numbers: [],
    delay: 5000,
    currentIndex: 0,
    isPaused: false,
    isStopped: false,
    from: undefined,
    results: [],
};
exports.bulkCallState = bulkCallState;
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
        const normalizedNumbers = numbers.map((num) => {
            let str = String(num).replace(/\s+/g, "");
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
const startBulkCalls = async (req, res) => {
    try {
        console.log("[BulkCall] startBulkCalls API called (frontend-controlled)");
        console.log("[BulkCall] Request body:", req.body);
        console.log("[BulkCall] Current bulkCallState:", JSON.stringify({
            numbers: bulkCallState.numbers,
            currentIndex: bulkCallState.currentIndex,
            isPaused: bulkCallState.isPaused,
            isStopped: bulkCallState.isStopped,
            from: bulkCallState.from
        }));
        const { from } = req.body;
        if (!bulkCallState.numbers.length) {
            console.error("[BulkCall] No numbers uploaded");
            res.status(400).json({ message: "No numbers uploaded" });
            return;
        }
        if (bulkCallState.currentIndex >= bulkCallState.numbers.length) {
            console.error("[BulkCall] All calls already completed");
            res.status(400).json({ message: "All calls already completed" });
            return;
        }
        bulkCallState.isPaused = false;
        bulkCallState.isStopped = false;
        bulkCallState.from = from || process.env.DEFAULT_TWILIO_NUMBER;
        res.json({ message: "Bulk calling initialized" });
    }
    catch (err) {
        console.error("[BulkCall] Error in startBulkCalls:", err.message, err.stack);
        res.status(500).json({ message: "Failed to start bulk calls", error: err.message });
    }
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
    res.json({ message: "Bulk calling resumed" });
};
exports.resumeBulkCalls = resumeBulkCalls;
const pauseBulkCalls = async (_req, res) => {
    bulkCallState.isPaused = true;
    res.json({ message: "Bulk calling paused" });
};
exports.pauseBulkCalls = pauseBulkCalls;
