import { Request, Response } from "express";
import client from "../utils/twilioClient";
import { DateTime } from "luxon";

// GET /api/dashboard/stats?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    // Parse dates or default to today
    const from = fromDate ? DateTime.fromISO(String(fromDate)) : DateTime.now().startOf('day');
    const to = toDate ? DateTime.fromISO(String(toDate)) : DateTime.now().endOf('day');

    // Twilio API expects RFC2822 or ISO8601
    const calls = await client.calls.list({
      startTimeAfter: from.toJSDate(),
      startTimeBefore: to.toJSDate(),
      limit: 1000,
    });
    console.log("[Dashboard] Calls fetched:", calls.length, calls.map(c => ({ from: c.from, to: c.to, status: c.status, startTime: c.startTime, duration: c.duration })));
    // Group by number (from)
    const stats: Record<string, {
      total: number;
      completed: number;
      busy: number;
      failed: number;
      no_answer: number;
      in_progress: number;
      totalDuration: number;
    }> = {};

    for (const call of calls) {
      const num = call.from || "Unknown";
      if (!stats[num]) {
        stats[num] = {
          total: 0,
          completed: 0,
          busy: 0,
          failed: 0,
          no_answer: 0,
          in_progress: 0,
          totalDuration: 0,
        };
      }
      stats[num].total++;
      if (call.status === "completed") stats[num].completed++;
      if (call.status === "busy") stats[num].busy++;
      if (call.status === "failed") stats[num].failed++;
      if (call.status === "no-answer") stats[num].no_answer++;
      if (call.status === "in-progress") stats[num].in_progress++;
      stats[num].totalDuration += Number(call.duration || 0);
    }

    res.json({
      from: from.toISODate(),
      to: to.toISODate(),
      stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
