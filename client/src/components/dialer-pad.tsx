"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Phone, PhoneCall, XCircle, SkipBackIcon as Backspace } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"
import { io } from "socket.io-client"
import { Device } from "@twilio/voice-sdk"

const socket = io("http://localhost:8000")

let globalDevice: Device | null = null

export function DialerPad() {
  const [number, setNumber] = useState("")
  const [selectedNumber, setSelectedNumber] = useState("")
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingNumbers, setLoadingNumbers] = useState(true)
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "ringing" | "answered" | "completed">("idle")
  const [activeCallSid, setActiveCallSid] = useState("")
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null)

  useEffect(() => {
  // 🔁 Fetch available numbers
  fetchAvailableNumbers();

  // 📡 Handle call status from socket
  const handleCallStatus = ({ sid, status }:any) => {
    console.log("📡 [Socket] Call Status:", status, "SID:", sid);
    setCallStatus(status);
    setActiveCallSid(sid || "");
    toast({ title: `Call Status: ${status}`, description: `SID: ${sid}` });

    if (status === "completed") {
      setTimeout(() => {
        setCallStatus("idle");
        setActiveCallSid("");
      }, 1000);
    }
  };

  socket.on("call-status", handleCallStatus);

  return () => {
    socket.off("call-status", handleCallStatus);
  };
}, []);

useEffect(() => {
  // 🔌 Setup Twilio device
  const setupTwilio = async () => {
    try {
      const res = await fetch(API.GET_TWILIO_TOKEN, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      });
      const { token } = await res.json();
      const device = new Device(token);

      device.on("registered", () => {
        console.log("✅ Twilio Device registered");
        setTwilioDevice(device);
      });

      device.on("error", (err) => {
       console.error("❌ Twilio Device registration error:");
  console.error("  • Code:", err.code);
  console.error("  • Message:", err.message);
  console.error("  • TwilioError Stack:", err.stack);
  console.error("  • TwilioError Details:", JSON.stringify(err, null, 2));
      });

      device.register();
    } catch (err) {
      console.error("❌ Failed to fetch Twilio token or register:", err);
    }
  };

  setupTwilio();
}, []);

useEffect(() => {
  // 🧠 Auto-connect when callStatus is 'calling'
  const joinConference = async () => {
    console.log("🔁 useEffect triggered with callStatus:", callStatus);

    if (!twilioDevice) {
      console.warn("⚠️ twilioDevice not initialized yet");
      return;
    }

    if (callStatus === "calling") {
      console.log("📞 Connecting browser to Twilio room: ZifyRoom");

      try {
        const conn = await twilioDevice.connect({
          params: { room: "ZifyRoom" },
        });

        if (conn) {
          console.log("✅ Device.connect() returned:", conn);

          conn.on("accept", () => {
            console.log("🎉 Browser joined conference (accept event)");
          });

          conn.on("disconnect", () => {
            console.log("📴 Disconnected from room");
          });

          conn.on("error", (err) => {
            console.error("❌ Connection error:", err);
          });
        } else {
          console.error("❌ Device.connect() returned null");
        }
      } catch (err) {
        console.error("🔥 Error connecting to conference:", err);
      }
    } else {
      console.log("ℹ️ callStatus is not 'calling', skipping connect");
    }
  };

  joinConference();
}, [callStatus, twilioDevice]);

useEffect(() => {
  // 📲 Handle incoming calls
  if (!twilioDevice) return;

  const handleIncoming = (connection:any) => {
    setCallStatus("ringing");
    connection.accept();
    setActiveCallSid(connection.parameters.CallSid || "");
    toast({
      title: "Incoming Call",
      description: `From: ${connection.parameters.From}`,
    });
  };

  const handleError = (err:any) => {
    console.error("Twilio Device Error:", err);
    toast({
      title: "Twilio Error",
      description: err.message,
      variant: "destructive",
    });
  };

  twilioDevice.on("incoming", handleIncoming);
  twilioDevice.on("error", handleError);

  return () => {
    twilioDevice.off("incoming", handleIncoming);
    twilioDevice.off("error", handleError);
  };
}, [twilioDevice]);
  const fetchAvailableNumbers = async () => {
    setLoadingNumbers(true)
    try {
      const response = await fetch(API.GET_NUMBERS, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      })
      const data = await response.json()
      const numbers = Array.isArray(data) ? data : data.numbers || []
      setAvailableNumbers(numbers)
      if (numbers.length > 0) setSelectedNumber(numbers[0].phoneNumber)
    } catch {
      toast({ title: "Fetch Failed", description: "Unable to load Twilio numbers.", variant: "destructive" })
    } finally {
      setLoadingNumbers(false)
    }
  }

  const handleNumberPress = (digit: string) => setNumber((prev) => prev + digit)
  const handleBackspace = () => setNumber((prev) => prev.slice(0, -1))

  const handleCall = async () => {
    if (!number.trim() || !selectedNumber) {
      toast({ title: "Missing Info", description: "Enter a number and select your Twilio caller ID.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    setCallStatus("calling")
    try {
      const response = await fetch(API.MANUAL_CALL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify({ to: number, from: selectedNumber }),
      })
      if (!response.ok) throw new Error("Call failed")
      const data = await response.json()
      setActiveCallSid(data.sid || "")
      toast({ title: "Call Initiated", description: `Dialing ${number}...` })
    } catch {
      toast({ title: "Call Failed", description: "Something went wrong.", variant: "destructive" })
      setCallStatus("idle")
    } finally {
      setIsLoading(false)
    }
  }

  const handleHangup = async () => {
    if (!activeCallSid) return
    try {
      await fetch(API.TERMINATE(activeCallSid), {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      })
      setCallStatus("completed")
      toast({ title: "Call Ended" })
    } catch {
      toast({ title: "Error", description: "Could not hang up.", variant: "destructive" })
    }
  }

  const dialpadNumbers = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["*", "0", "#"]]

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">📞 Dialer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter phone number"
            className="text-center text-xl font-mono"
            type="tel"
            disabled={callStatus !== "idle"}
          />

          {availableNumbers.length > 0 ? (
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Select caller ID" />
              </SelectTrigger>
              <SelectContent>
                {availableNumbers.map((num) => (
                  <SelectItem key={num.phoneNumber} value={num.phoneNumber}>
                    {num.friendlyName || num.phoneNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">No Twilio numbers available.</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {dialpadNumbers.flat().map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-12 text-lg font-bold"
                onClick={() => handleNumberPress(digit)}
                disabled={callStatus !== "idle"}
              >
                {digit}
              </Button>
            ))}
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <Button variant="outline" size="icon" onClick={handleBackspace} className="h-12 w-12" disabled={callStatus !== "idle"}>
              <Backspace className="h-5 w-5" />
            </Button>
            {callStatus === "idle" ? (
              <Button onClick={handleCall} disabled={isLoading || !number.trim() || !selectedNumber || loadingNumbers} className="h-12 px-6 bg-green-600 text-white hover:bg-green-700">
                {isLoading ? <PhoneCall className="h-5 w-5 animate-pulse" /> : (<><Phone className="h-5 w-5" /><span className="ml-2">Call</span></>)}
              </Button>
            ) : (
              <Button onClick={handleHangup} className="h-12 px-6 bg-red-600 text-white hover:bg-red-700">
                <XCircle className="h-5 w-5" />
                <span className="ml-2">Hang Up</span>
              </Button>
            )}
          </div>

          {callStatus !== "idle" && (
            <p className="text-center text-sm text-muted-foreground">
              Status: <strong>{callStatus}</strong>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
