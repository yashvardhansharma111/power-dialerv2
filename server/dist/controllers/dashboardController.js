"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const twilioClient_1 = __importDefault(require("../utils/twilioClient"));
const luxon_1 = require("luxon");
// GET /api/dashboard/stats?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
const getDashboardStats = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        console.log("[Dashboard] Query Params:", { fromDate, toDate });
        // Parse dates or default to today
        const from = fromDate ? luxon_1.DateTime.fromISO(String(fromDate)) : luxon_1.DateTime.now().startOf('day');
        const to = toDate ? luxon_1.DateTime.fromISO(String(toDate)) : luxon_1.DateTime.now().endOf('day');
        console.log(`[Dashboard] Date Range: from=${from.toISO()} to=${to.toISO()}`);
        // Twilio API expects RFC2822 or ISO8601
        const calls = await twilioClient_1.default.calls.list({
            startTimeAfter: from.toJSDate(),
            startTimeBefore: to.toJSDate(),
            limit: 1000,
        });
        console.log(`[Dashboard] Calls fetched: ${calls.length}`);
        calls.forEach((c, i) => {
            console.log(`[Dashboard] Call #${i + 1}:`, {
                sid: c.sid,
                from: c.from,
                to: c.to,
                status: c.status,
                startTime: c.startTime,
                duration: c.duration,
            });
        });
        // Fetch all Twilio numbers for this account
        const twilioNumbers = (await twilioClient_1.default.incomingPhoneNumbers.list()).map(n => n.phoneNumber);
        console.log('[Dashboard] Twilio numbers:', twilioNumbers);
        // Group stats only for Twilio numbers (as 'from')
        const stats = {};
        // Use a temporary map to hold sets for unique numbers
        const uniqueNumbersMap = {};
        for (const call of calls) {
            if (!call.from || !twilioNumbers.includes(call.from))
                continue;
            if (!stats[call.from]) {
                stats[call.from] = {
                    total: 0,
                    completed: 0,
                    busy: 0,
                    failed: 0,
                    no_answer: 0,
                    in_progress: 0,
                    totalDuration: 0,
                    uniqueNumbersCalled: [],
                    callDetails: [],
                };
                uniqueNumbersMap[call.from] = new Set();
                console.log(`[Dashboard] New stats entry for Twilio number: ${call.from}`);
            }
            stats[call.from].total++;
            if (call.status === "completed")
                stats[call.from].completed++;
            if (call.status === "busy")
                stats[call.from].busy++;
            if (call.status === "failed")
                stats[call.from].failed++;
            if (call.status === "no-answer")
                stats[call.from].no_answer++;
            if (call.status === "in-progress")
                stats[call.from].in_progress++;
            stats[call.from].totalDuration += Number(call.duration || 0);
            if (call.to)
                uniqueNumbersMap[call.from].add(call.to);
            stats[call.from].callDetails.push({
                to: call.to,
                status: call.status,
                duration: Number(call.duration || 0),
                startTime: call.startTime ? (typeof call.startTime === 'string' ? call.startTime : call.startTime.toISOString()) : "",
                sid: call.sid,
            });
            console.log(`[Dashboard] Updated stats for ${call.from}:`, stats[call.from]);
        }
        // Assign uniqueNumbersCalled arrays with fallback logic
        Object.keys(stats).forEach(num => {
            stats[num].uniqueNumbersCalled = Array.from(uniqueNumbersMap[num] || []);
            // If uniqueNumbersCalled is empty but callDetails has data, try to fill it from callDetails
            if (stats[num].uniqueNumbersCalled.length === 0 && stats[num].callDetails.length > 0) {
                stats[num].uniqueNumbersCalled = Array.from(new Set(stats[num].callDetails.map(cd => cd.to).filter(Boolean)));
            }
            console.log(`[Dashboard] Final uniqueNumbersCalled for ${num}:`, stats[num].uniqueNumbersCalled);
        });
        // Always return all Twilio numbers, even if no stats
        const allStats = { ...stats };
        twilioNumbers.forEach(num => {
            if (!allStats[num]) {
                allStats[num] = {
                    total: 0,
                    completed: 0,
                    busy: 0,
                    failed: 0,
                    no_answer: 0,
                    in_progress: 0,
                    totalDuration: 0,
                    uniqueNumbersCalled: [],
                    callDetails: [],
                };
            }
        });
        console.log('[Dashboard] Final stats object:', JSON.stringify(allStats, null, 2));
        res.status(200).json({
            success: true,
            data: allStats,
            twilioNumbers,
        });
    }
    catch (error) {
        console.error("[Dashboard] Error fetching stats:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getDashboardStats = getDashboardStats;
