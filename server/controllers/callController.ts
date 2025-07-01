import { Request, Response } from "express";
import client from "../utils/twilioClient";
import { extractNumbersFromExcel } from "../utils/parseExcel";
import { Express } from "express"; // Needed for Express.Multer.File type

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// In-memory store for active calls by customer number
const activeCustomerCalls: Map<string, string> = new Map(); // customerNumber -> CallSid

function logActiveCalls() {
  console.log('[activeCustomerCalls] Current locks:');
  for (const [num, sid] of activeCustomerCalls.entries()) {
    console.log(`  ${num}: ${sid}`);
  }
}

export const makeManualCall = async (req: Request, res: Response): Promise<void> => {
  const { to, from } = req.body;
  const callerId = from 

  if (!from) {
    console.log("[makeManualCall] No 'from' number provided");
  } 

  if (!to || !callerId) {
    res.status(400).json({ error: "Missing 'to' or 'from' number" });
    return;
  }

  // Prevent multiple concurrent calls to the same customer
  if (activeCustomerCalls.has(to)) {
    res.status(409).json({ error: "A call to this customer is already in progress. Please wait until the current call ends." });
    return;
  }

  try {
    const call = await client.calls.create({
      from: callerId,
      to,
      record: true,
      url: `${process.env.BASE_URL}/api/twilio/connect?customerNumber=${encodeURIComponent(to)}&callerId=${encodeURIComponent(callerId)}`,
      statusCallback: `${process.env.BASE_URL}/api/twilio/events`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed", "failed", "busy", "no-answer"],
      statusCallbackMethod: "POST",
    });

    // Mark this number as in-progress
    activeCustomerCalls.set(to, call.sid);
    console.log(`[activeCustomerCalls] LOCK SET for ${to} (sid: ${call.sid})`);
    logActiveCalls();
    res.json({ message: "Call initiated", sid: call.sid });
  } catch (err: any) {
    console.error("❌ Call failed:", err.message);
    res.status(500).json({
      error: "Call failed",
      details: err.message,
    });
  }
};

// Export for use in webhook
export { activeCustomerCalls };



export const terminateCall = async (req: Request, res: Response) => {
  const { sid } = req.params;
  try {
    await client.calls(sid).update({ status: "completed" });
    res.json({ message: "Call terminated successfully." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to terminate call", error: err.message });
  }
};
