import { Request, Response } from "express";
import client from "../utils/twilioClient";

// Get all call logs (limit 100 or more if needed)
export const getAllCallLogs = async (_req: Request, res: Response) => {
  try {
    const calls = await client.calls.list({ limit: 100 });

    res.json(calls.map(call => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      startTime: call.startTime,
      duration: call.duration,
      direction: call.direction,
      price: call.price,
      recordingUrl: call.subresourceUris?.recordings,
    })));
  } catch (error) {
    console.error("Error fetching all call logs:", error);
    res.status(500).json({ message: "Failed to fetch call logs" });
  }
};


// Get logs for a specific number (either from/to)
export const getCallLogsByNumber = async (req: Request, res: Response) => {
  const { number } = req.params;
  try {
    const calls = await client.calls.list({
      limit: 50,
      to: number, // Optional: you can also add `from: number` if needed
    });

    res.json(calls.map(call => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      startTime: call.startTime,
      duration: call.duration,
      direction: call.direction,
      price: call.price,
      recordingUrl: call.subresourceUris?.recordings,
    })));
  } catch (error) {
    console.error("Error fetching call logs by number:", error);
    res.status(500).json({ message: "Failed to fetch logs for the number" });
  }
};
