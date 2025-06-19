import { Request, Response } from "express";
import { extractNumbersFromExcel } from "../utils/parseExcel";
import client from "../utils/twilioClient";
import { Express } from "express";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

type CallStatus = "pending" | "success" | "failed" | "in-progress" | "paused" | "stopped";

interface BulkCallState {
  numbers: string[];
  delay: number;
  currentIndex: number;
  isPaused: boolean;
  isStopped: boolean;
  results: {
    number: string;
    status: CallStatus;
    sid?: string;
    error?: string;
    conference?: string; // 🆕 Store conference name
  }[];
}

const bulkCallState: BulkCallState = {
  numbers: [],
  delay: 5000, // default delay (5 seconds)
  currentIndex: 0,
  isPaused: false,
  isStopped: false,
  results: [],
};

// 🧠 Helper to wait
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

// 🆕 Dial next number only (event-driven)
export const dialNextNumber = async () => {
  if (
    bulkCallState.isStopped ||
    bulkCallState.isPaused ||
    bulkCallState.currentIndex >= bulkCallState.numbers.length
  ) {
    return;
  }

  const number = bulkCallState.numbers[bulkCallState.currentIndex];
  const conference = `BulkConf-${number}-${Date.now()}`;
  bulkCallState.results[bulkCallState.currentIndex] = { number, status: "in-progress", conference };

  console.log(`[BulkCall] [EventDriven] Attempting to call: ${number}`);
  console.log(`[BulkCall] Conference: ${conference}`);
  console.log(`[BulkCall] Twilio payload:`, {
    from: process.env.DEFAULT_TWILIO_NUMBER,
    to: number,
    url: `${process.env.BASE_URL}/api/twilio/connect?room=${encodeURIComponent(conference)}`,
    statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
    statusCallbackMethod: "POST",
  });

  try {
    const call = await client.calls.create({
      from: process.env.DEFAULT_TWILIO_NUMBER!,
      to: number,
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
  } catch (err: any) {
    console.error(`[BulkCall] Call failed for ${number}:`, err.message);
    bulkCallState.results[bulkCallState.currentIndex] = {
      number,
      status: "failed",
      error: err.message,
      conference,
    };
    bulkCallState.currentIndex++;
    // Immediately try next if failed
    setTimeout(dialNextNumber, 1000);
    return;
  }
};

export const uploadNumbersFromExcel = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const buffer = req.file?.buffer;
    if (!buffer) {
      res.status(400).json({ message: "No Excel file uploaded" });
      return;
    }

    const numbers = extractNumbersFromExcel(buffer);

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
  } catch (err: any) {
    res.status(500).json({ message: "Excel parsing failed", error: err.message });
  }
};

// 🆕 Start event-driven bulk call
export const startBulkCalls = async (_req: Request, res: Response): Promise<void> => {
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
  console.log("[BulkCall] startBulkCalls API called (event-driven)");
  dialNextNumber();
  res.json({ message: "Bulk calling started" });
};

export const stopBulkCalls = (_req: Request, res: Response) => {
  bulkCallState.isStopped = true;
  res.json({ message: "Bulk calling stopped" });
};

export const getBulkCallStatus = (_req: Request, res: Response) => {
  res.json({
    total: bulkCallState.numbers.length,
    currentIndex: bulkCallState.currentIndex,
    isPaused: bulkCallState.isPaused,
    isStopped: bulkCallState.isStopped,
    results: bulkCallState.results,
  });
};

export const resumeBulkCalls = async (_req: Request, res: Response): Promise<void> => {
  if (!bulkCallState.isPaused) {
    res.status(400).json({ message: "Bulk calling is not paused" });
    return;
  }
  bulkCallState.isPaused = false;
  // Only dial next if not already in-progress
  const current = bulkCallState.results[bulkCallState.currentIndex];
  if (!current || current.status !== "in-progress") {
    dialNextNumber();
  }
  res.json({ message: "Bulk calling resumed" });
};

export const pauseBulkCalls = async (_req: Request, res: Response): Promise<void> => {
  bulkCallState.isPaused = true;
  res.json({ message: "Bulk calling paused" });
};

// 🆕 Export bulkCallState for event-driven integration
export { bulkCallState };
