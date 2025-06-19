import { Request, Response } from "express";
import { twiml } from "../utils/twilioClient";
import twilio from "twilio";
import { dialNextNumber, bulkCallState } from "./bulkcallController";

// POST /api/twilio/bridge
// ✅ This bridges Twilio call directly to the customer
export const bridgeCall = (req: Request, res: Response): void => {
  try {
    const customerNumber = decodeURIComponent((req.query.customerNumber as string || "").trim());

    const response = new twiml.VoiceResponse();

    // 🔍 Validate number
    if (!customerNumber || !/^\+?\d{10,15}$/.test(customerNumber)) {
      response.say("Invalid customer number.");
      res.status(400).type("text/xml").send(response.toString());
      return;
    }

    // ✅ Directly connect to customer
    const dial = response.dial({ answerOnBridge: true });
    dial.number(customerNumber); // ← ye connect karega

    res.status(200).type("text/xml").send(response.toString());
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    res.status(500).type("text/xml").send(`<Response><Say>Error occurred.</Say></Response>`);
  }
};


// POST /api/twilio/events
export const callStatusWebhook = (req: Request, res: Response): void => {
  const { CallSid, CallStatus, From, To } = req.body;

  console.log("📡 [Webhook] Call Status Event");
  console.log("📞 SID:", CallSid, "Status:", CallStatus);
  console.log("👤 From:", From, "➡️ To:", To);

  // Fix: always match by sid only
  if (["completed", "failed", "busy", "no-answer"].includes((CallStatus || "").toLowerCase())) {
    const idx = bulkCallState.results.findIndex((r: any) => r && r.sid === CallSid);
    if (idx !== -1) {
      bulkCallState.results[idx].status = CallStatus.toLowerCase() === "completed" ? "success" : "failed";
      bulkCallState.currentIndex = idx + 1;
    }
    setTimeout(() => {
      dialNextNumber();
    }, 1000);
  } else if (CallStatus.toLowerCase() === 'in-progress') {
    const idx = bulkCallState.results.findIndex((r: any) => r && r.sid === CallSid);
    if (idx !== -1) {
      bulkCallState.results[idx].status = 'in-progress';
    }
  }

  const io = req.app.get("io");
  if (io) {
    io.emit("call-status", {
      sid: CallSid,
      from: From,
      to: To,
      status: CallStatus,
    });
    console.log("✅ Emitted status via WebSocket");
  } else {
    console.warn("⚠️ Socket.IO instance not set in Express app");
  }

  res.sendStatus(200);
};

// POST /api/twilio/incoming
export const handleIncomingCall = (req: Request, res: Response): void => {
  console.log("📞 [Twilio] Incoming call hit");
  const voiceResponse = new twiml.VoiceResponse();
  voiceResponse.say("Thank you for calling. Please hold.");
  res.type("text/xml").send(voiceResponse.toString());
};


export const connectCall = (req: Request, res: Response): void => {
  try {
    // Accept room from query or body, or use default for manual call
    const roomName = req.query.room || req.body?.room || req.body?.conference || "ZifyRoom";
    console.log(`📞 [connectCall] Request to join room: ${roomName}`);
    console.log("[connectCall] req.query:", req.query);
    console.log("[connectCall] req.body:", req.body);

    const response = new twiml.VoiceResponse();
    const dial = response.dial({ answerOnBridge: true });
    dial.conference(
      {
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical',
      },
      roomName as string
    );
    res.status(200).type("text/xml").send(response.toString());
  } catch (error: any) {
    console.error("❌ [connectCall] Error:", error.message);
    res.status(500).type("text/xml").send(`<Response><Say>Internal error occurred.</Say></Response>`);
  }
};

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const applicationSid = process.env.TWIML_APP_SID!; // 🟡 IMPORTANT: You must create a TwiML App in Twilio Console

export const getToken = (req: Request, res: Response) => {
  const capability = new twilio.jwt.ClientCapability({
    accountSid,
    authToken,
  });

  // ✅ Required: pass applicationSid for OutgoingClientScope
  capability.addScope(
    new twilio.jwt.ClientCapability.OutgoingClientScope({
      applicationSid, // 👈 Use the SID of your TwiML App
    })
  );

  const token = capability.toJwt();
  res.json({ token });
};

export const joinConference = (req:Request, res:Response) => {
  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.conference({
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
  }, "ZifyRoom");

  res.type("text/xml");
  res.send(response.toString());
};


