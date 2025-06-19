import { Request, Response } from "express";
import client from "../utils/twilioClient";
import { extractNumbersFromExcel } from "../utils/parseExcel";
import { Express } from "express"; // Needed for Express.Multer.File type

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const makeManualCall = async (req: Request, res: Response): Promise<void> => {
  const { to } = req.body;
  const from = process.env.DEFAULT_TWILIO_NUMBER;

  if (!to || !from) {
    res.status(400).json({ error: "Missing 'to' or 'from' number" });
    return;
  }

  try {
    // Use /api/twilio/connect for manual call, no room param (defaults to ZifyRoom)
    const call = await client.calls.create({
      from,
      to,
      url: `${process.env.BASE_URL}/api/twilio/connect`,
      statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    res.json({ message: "Call initiated", sid: call.sid });
  } catch (err: any) {
    console.error("❌ Call failed:", err.message);
    res.status(500).json({
      error: "Call failed",
      details: err.message,
    });
  }
};

export const uploadAndStartCalls = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const fileBuffer = req.file?.buffer;
    if (!fileBuffer) {
      res.status(400).json({ message: "Excel file required" });
      return;
    }

    const numbers = extractNumbersFromExcel(fileBuffer);
    if (!numbers.length) {
      res.status(400).json({ message: "No valid numbers found" });
      return;
    }

    const results: { number: string; sid?: string; error?: string }[] = [];

    for (const number of numbers) {
      try {
        const call = await client.calls.create({
          url: `${process.env.BASE_URL}/api/twilio/bridge`,
          to: number,
          from: process.env.DEFAULT_TWILIO_NUMBER!,
          statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallbackMethod: "POST",
        });

        results.push({ number, sid: call.sid });
      } catch (err: any) {
        results.push({ number, error: err.message });
      }
    }

    res.json({ message: "Bulk calls initiated via Excel", results });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: "Failed to process Excel", error: errorMessage });
  }
};

export const terminateCall = async (req: Request, res: Response) => {
  const { sid } = req.params;
  try {
    await client.calls(sid).update({ status: "completed" });
    res.json({ message: "Call terminated successfully." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to terminate call", error: err.message });
  }
};
