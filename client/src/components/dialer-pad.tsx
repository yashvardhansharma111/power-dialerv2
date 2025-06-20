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
import { Phone, PhoneCall, XCircle, Delete, Signal, Loader2, Users, Volume2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"
import { io } from "socket.io-client"
import { Device } from "@twilio/voice-sdk"

// Extract API_BASE from any API endpoint (e.g., LOGIN)
const API_BASE = API.LOGIN.replace(/\/auth\/login$/, "");
const SOCKET_BASE = API_BASE.replace(/\/api$/, "");
const socket = io(SOCKET_BASE)

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

  const getStatusColor = () => {
    switch (callStatus) {
      case "calling": return "text-blue-500"
      case "ringing": return "text-yellow-500"
      case "answered": return "text-green-500"
      case "completed": return "text-gray-500"
      default: return "text-gray-400"
    }
  }

  const getStatusIcon = () => {
    switch (callStatus) {
      case "calling": return <Loader2 className="h-4 w-4 animate-spin" />
      case "ringing": return <Signal className="h-4 w-4 animate-pulse" />
      case "answered": return <Volume2 className="h-4 w-4" />
      case "completed": return <XCircle className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 p-4">
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-xl border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Phone className="h-6 w-6 text-blue-600" />
            Smart Dialer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Number Display */}
          <div className="relative">
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Enter phone number"
              className="text-center text-2xl font-mono h-16 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl shadow-inner text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              type="tel"
              disabled={callStatus !== "idle"}
            />
            {number && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackspace}
                  disabled={callStatus !== "idle"}
                  className="h-8 w-8 p-0 rounded-full hover:bg-slate-200/50"
                >
                  <Delete className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            )}
          </div>

          {/* Caller ID Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Caller ID
            </label>
            {loadingNumbers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-slate-500">Loading numbers...</span>
              </div>
            ) : availableNumbers.length > 0 ? (
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger className="h-12 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                  <SelectValue placeholder="Select caller ID" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200">
                  {availableNumbers.map((num) => (
                    <SelectItem key={num.phoneNumber} value={num.phoneNumber} className="rounded-lg">
                      <div className="flex flex-col">
                        <span className="font-medium">{num.friendlyName || num.phoneNumber}</span>
                        {num.friendlyName && (
                          <span className="text-xs text-slate-500">{num.phoneNumber}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-700 text-center">No Twilio numbers available</p>
              </div>
            )}
          </div>

          {/* Dialpad */}
          <div className="grid grid-cols-3 gap-3">
            {dialpadNumbers.flat().map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-16 text-xl font-bold bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-2xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg active:scale-95 transition-all duration-150 shadow-sm"
                onClick={() => handleNumberPress(digit)}
                disabled={callStatus !== "idle"}
              >
                {digit}
              </Button>
            ))}
          </div>

          {/* Call Controls */}
          <div className="flex justify-center items-center pt-4">
            {callStatus === "idle" ? (
              <Button 
                onClick={handleCall} 
                disabled={isLoading || !number.trim() || !selectedNumber || loadingNumbers} 
                className="h-16 px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 font-semibold text-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Phone className="h-6 w-6" />
                    <span className="ml-3">Call</span>
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleHangup} 
                className="h-16 px-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 font-semibold text-lg"
              >
                <XCircle className="h-6 w-6" />
                <span className="ml-3">End Call</span>
              </Button>
            )}
          </div>

          {/* Call Status */}
          {callStatus !== "idle" && (
            <div className="flex items-center justify-center gap-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
              {getStatusIcon()}
              <span className={`font-medium capitalize ${getStatusColor()}`}>
                {callStatus === "calling" && "Connecting..."}
                {callStatus === "ringing" && "Ringing"}
                {callStatus === "answered" && "Call Active"}
                {callStatus === "completed" && "Call Ended"}
              </span>
              {activeCallSid && (
                <span className="text-xs text-slate-500 ml-2">
                  SID: {activeCallSid.slice(-8)}
                </span>
              )}
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${twilioDevice ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>{twilioDevice ? 'Connected to Twilio' : 'Connecting...'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}