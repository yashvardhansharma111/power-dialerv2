import { Request, Response } from "express";
import twilioClient from "../utils/twilioClient";

// 1. Get latest messages grouped by contact
export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const messages = await twilioClient.messages.list({ limit: 100 });

    const latestByNumber: Record<string, any> = {};
    messages.forEach((msg) => {
      const key = msg.direction === "inbound" ? msg.from : msg.to;
      if (!latestByNumber[key]) latestByNumber[key] = msg;
    });

    res.status(200).json(Object.values(latestByNumber));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch messages", details: err.message });
  }
};

// 2. Filter messages by reply status
export const filterMessages = async (req: Request, res: Response) => {
  const { status } = req.query; // 'replied' | 'unreplied' | 'all'

  try {
    const messages = await twilioClient.messages.list({ limit: 100 });

    const grouped: Record<string, { inbound: boolean; lastMessage: any }> = {};

    messages.forEach((msg) => {
      const number = msg.direction === "inbound" ? msg.from : msg.to;
      if (!grouped[number]) {
        grouped[number] = {
          inbound: msg.direction === "inbound",
          lastMessage: msg,
        };
      }
    });

    const filtered = Object.entries(grouped).filter(([_, data]) => {
      if (status === "replied") return !data.inbound;
      if (status === "unreplied") return data.inbound;
      return true;
    }).map(([_, data]) => data.lastMessage);

    res.status(200).json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: "Filter failed", details: err.message });
  }
};

// 3. Chat history between two numbers
export const getConversation = async (req: Request, res: Response) => {
  const { number } = req.params;
  const from = req.query.from as string || process.env.DEFAULT_TWILIO_NUMBER;

  try {
    const sent = await twilioClient.messages.list({ to: number, from, limit: 50 });
    const received = await twilioClient.messages.list({ to: from, from: number, limit: 50 });

    const all = [...sent, ...received].sort((a, b) =>
      new Date(a.dateCreated as unknown as string).getTime() - new Date(b.dateCreated as unknown as string).getTime()
    );

    res.status(200).json(all);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load conversation", details: err.message });
  }
};

// 4. Send a message using dynamic `from`
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { to, body, from } = req.body;
  const sender = from || process.env.DEFAULT_TWILIO_NUMBER;

  if (!to || !body || !sender) {
    res.status(400).json({ error: "Missing 'to', 'from', or 'body'" });
    return;
  }

  try {
    const message = await twilioClient.messages.create({
      to,
      from: sender,
      body,
      statusCallback: `${process.env.BASE_URL}/api/messages/status-callback`, // ✅ Track delivery status
    });

    res.status(200).json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ error: "Send failed", details: err.message });
  }
};


export const messageStatusCallback = async (req: Request, res: Response): Promise<void> => {
  const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;

  console.log("📩 Message Status Update:", {
    MessageSid,
    MessageStatus,
    To,
    From,
    ErrorCode,
    ErrorMessage,
  });

  // You can optionally store this info in DB or cache here

  res.status(200).send("Status received");
};

