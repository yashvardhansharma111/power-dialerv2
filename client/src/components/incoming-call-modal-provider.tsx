"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "@/hooks/use-toast";
import { API } from "@/utils/const";
import { Device } from "@twilio/voice-sdk";

export function IncomingCallModalProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const socket = useSocket();

  // Setup Twilio Device on mount
  useEffect(() => {
    const setupTwilio = async () => {
      try {
        const res = await fetch(API.GET_TWILIO_TOKEN, {
          headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        });
        const { token } = await res.json();
        const device = new Device(token);
        device.on("registered", () => setTwilioDevice(device));
        device.on("error", (err) => {
          toast({ title: "Twilio Error", description: err.message, variant: "destructive" });
        });
        device.register();
      } catch (err) {
        toast({ title: "Twilio Setup Failed", description: "Could not register device.", variant: "destructive" });
      }
    };
    setupTwilio();
  }, []);

  // Listen for incoming-call events
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      setIncomingCall(data);
      toast({ title: "Incoming Call", description: `From: ${data.from}` });
    };
    socket.on("incoming-call", handler);
    return () => {
      socket.off("incoming-call", handler);
    };
  }, [socket]);

  // Fetch available numbers for agent selection (optional, can be improved)
  useEffect(() => {
    const fetchNumbers = async () => {
      try {
        const res = await fetch(API.GET_NUMBERS, {
          headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        });
        const data = await res.json();
        const numbers = Array.isArray(data) ? data : data.numbers || [];
        if (numbers.length > 0) setSelectedNumber(numbers[0].phoneNumber || numbers[0]);
      } catch {}
    };
    fetchNumbers();
  }, []);

  const handleAnswer = async () => {
    if (!incomingCall || !selectedNumber) return;
    try {
      const res = await fetch(API.AGENT_JOIN_CONFERENCE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conference: incomingCall.conference,
          agentNumber: selectedNumber,
        }),
      });
      const twiml = await res.text();
      if (twilioDevice) {
        twilioDevice.connect({ params: { TwiML: twiml } });
      }
      setIncomingCall(null);
      toast({ title: "Joined Call", description: "You have joined the conference." });
    } catch (err) {
      toast({ title: "Join Failed", description: "Could not join the call.", variant: "destructive" });
    }
  };

  return (
    <>
      {children}
      <Dialog open={!!incomingCall} onOpenChange={open => { if (!open) setIncomingCall(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
            <DialogDescription>
              {incomingCall && (
                <>
                  <div>From: {incomingCall.from}</div>
                  <div>To: {incomingCall.to}</div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleAnswer} disabled={!twilioDevice}>Answer</Button>
            <Button variant="destructive" onClick={() => setIncomingCall(null)}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 