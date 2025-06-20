import { Request, Response } from "express";
import client from "../utils/twilioClient";
import axios from "axios";

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

// Get recording URL for a call SID
export const getRecordingBySid = async (req: Request, res: Response) => {
  const { sid } = req.params;
  try {
    const recordings = await client.recordings.list({ callSid: sid, limit: 1 });
    if (!recordings.length) {
      res.status(404).json({ message: "No recording found for this call." });
      return;
    }
    const recording = recordings[0];
    const url = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recording.", error: err instanceof Error ? err.message : String(err) });
  }
};

export const streamRecordingAudio = async (req: Request, res: Response) => {
  const { sid } = req.params;
  try {
    const recordings = await client.recordings.list({ callSid: sid, limit: 1 });
    if (!recordings.length) {
      res.status(404).json({ message: "No recording found for this call." });
      return;
    }
    const recording = recordings[0];
    const url = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    const twilioAuth = {
      username: process.env.TWILIO_ACCOUNT_SID!,
      password: process.env.TWILIO_AUTH_TOKEN!,
    };
    const response = await axios.get(url, {
      responseType: "stream",
      auth: twilioAuth,
    });
    res.setHeader("Content-Type", "audio/mpeg");
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ message: "Failed to stream recording.", error: err instanceof Error ? err.message : String(err) });
  }
};
