import { Request, Response } from "express";
import { extractNumbersFromExcel } from "../utils/parseExcel";
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
  from?: string;
  results: {
    number: string;
    status: CallStatus;
    sid?: string;
    error?: string;
  }[];
}

const bulkCallState: BulkCallState = {
  numbers: [],
  delay: 5000,
  currentIndex: 0,
  isPaused: false,
  isStopped: false,
  from: undefined,
  results: [],
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
  } catch (err: any) {
    res.status(500).json({ message: "Excel parsing failed", error: err.message });
  }
};

export const startBulkCalls = async (req: Request, res: Response): Promise<void> => {
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
  } catch (err: any) {
    console.error("[BulkCall] Error in startBulkCalls:", err.message, err.stack);
    res.status(500).json({ message: "Failed to start bulk calls", error: err.message });
  }
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
  res.json({ message: "Bulk calling resumed" });
};

export const pauseBulkCalls = async (_req: Request, res: Response): Promise<void> => {
  bulkCallState.isPaused = true;
  res.json({ message: "Bulk calling paused" });
};

export { bulkCallState };
