"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Delete, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"
import { io } from "socket.io-client"
import { Device } from "@twilio/voice-sdk"

// Extract API_BASE from any API endpoint (e.g., LOGIN)
const API_BASE = API.LOGIN.replace(/\/auth\/login$/, "")
const SOCKET_BASE = API_BASE.replace(/\/api$/, "")
const socket = io(SOCKET_BASE)

// Simplified country codes
const countries = [
  { code: "+1", country: "US", name: "United States", timezone: "America/New_York", flag: "🇺🇸" },
  { code: "+44", country: "GB", name: "United Kingdom", timezone: "Europe/London", flag: "🇬🇧" },
  { code: "+49", country: "DE", name: "Germany", timezone: "Europe/Berlin", flag: "🇩🇪" },
  { code: "+33", country: "FR", name: "France", timezone: "Europe/Paris", flag: "🇫🇷" },
  { code: "+91", country: "IN", name: "India", timezone: "Asia/Kolkata", flag: "🇮🇳" },
  { code: "+86", country: "CN", name: "China", timezone: "Asia/Shanghai", flag: "🇨🇳" },
  { code: "+81", country: "JP", name: "Japan", timezone: "Asia/Tokyo", flag: "🇯🇵" },
]

function getCountryTime(countryCode: string) {
  const country = countries.find((c) => c.code === countryCode)
  if (!country) return null

  const now = new Date()
  const localTime = new Intl.DateTimeFormat("en-US", {
    timeZone: country.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now)

  return {
    country: country.name,
    time: localTime,
    timezone: country.timezone,
  }
}

export function DialerPad() {
  const [number, setNumber] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("+1")
  const [selectedNumber, setSelectedNumber] = useState("")
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingNumbers, setLoadingNumbers] = useState(true)
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "ringing" | "answered" | "completed">("idle")
  const [activeCallSid, setActiveCallSid] = useState("")
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null)
  const [currentTime, setCurrentTime] = useState("")

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const timeInfo = getCountryTime(selectedCountry)
      if (timeInfo) {
        setCurrentTime(`It's ${timeInfo.time} there`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [selectedCountry])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (callStatus !== "idle") return

      const key = e.key
      if (/^[0-9*#]$/.test(key)) {
        e.preventDefault() // Prevent default to avoid duplication
        setNumber((prev) => prev + key)
      } else if (key === "Backspace") {
        e.preventDefault()
        setNumber((prev) => prev.slice(0, -1))
      } else if (key === "Enter") {
        e.preventDefault()
        handleCall()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [callStatus])

  useEffect(() => {
    fetchAvailableNumbers()

    const handleCallStatus = ({ sid, status }: any) => {
      console.log("📡 [Socket] Call Status:", status, "SID:", sid)
      setCallStatus(status)
      setActiveCallSid(sid || "")

      if (status === "completed") {
        setTimeout(() => {
          setCallStatus("idle")
          setActiveCallSid("")
          setIsLoading(false)
          setNumber("") // Clear number after call ends
        }, 1000)
      }
    }

    socket.on("call-status", handleCallStatus)
    return () => {
      socket.off("call-status", handleCallStatus)
    }
  }, [])

  useEffect(() => {
    const setupTwilio = async () => {
      let identity = localStorage.getItem("twilio_identity")
      if (!identity) {
        identity = `agent-${crypto.randomUUID()}`
        localStorage.setItem("twilio_identity", identity)
      }

      try {
        const res = await fetch(API.GET_TWILIO_TOKEN, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwt")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ identity }),
        })

        const { token } = await res.json()
        const device = new Device(token)

        device.on("registered", () => {
          console.log("✅ Twilio Device registered")
          setTwilioDevice(device)
        })

        device.on("error", (err) => {
          console.error("❌ Twilio Device registration error:", err)
        })

        device.register()
      } catch (err) {
        console.error("❌ Failed to fetch Twilio token or register:", err)
      }
    }

    setupTwilio()
  }, [])

  useEffect(() => {
    if (!twilioDevice) return

    const handleIncoming = (connection: any) => {
      setCallStatus("ringing")
      connection.accept()
      setActiveCallSid(connection.parameters.CallSid || "")
      toast({
        title: "Incoming Call",
        description: `From: ${connection.parameters.From}`,
      })
    }

    const handleError = (err: any) => {
      console.error("Twilio Device Error:", err)
      toast({
        title: "Twilio Error",
        description: err.message,
        variant: "destructive",
      })
    }

    twilioDevice.on("incoming", handleIncoming)
    twilioDevice.on("error", handleError)

    return () => {
      twilioDevice.off("incoming", handleIncoming)
      twilioDevice.off("error", handleError)
    }
  }, [twilioDevice])

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

  const handleNumberPress = (digit: string) => {
    if (callStatus !== "idle") return
    setNumber((prev) => prev + digit)
  }

  const handleBackspace = () => setNumber((prev) => prev.slice(0, -1))

  const handleCall = async () => {
    if (!twilioDevice || !number.trim()) {
      toast({ title: "Missing Info", description: "Enter a number to call.", variant: "destructive" })
      return
    }

    const fullNumber = selectedCountry + number
    setIsLoading(true)
    setCallStatus("calling")

    try {
      const conn = await twilioDevice.connect({ params: { To: fullNumber } })
      setActiveCallSid(conn?.parameters?.CallSid || "")
      toast({ title: "Call Initiated", description: `Dialing ${fullNumber}...` })
    } catch (err) {
      toast({ title: "Call Failed", description: "Something went wrong.", variant: "destructive" })
      setCallStatus("idle")
      setIsLoading(false)
    }
  }

  const handleHangup = async () => {
    if (!twilioDevice) return

    try {
      twilioDevice.disconnectAll()
      setCallStatus("completed")
      setIsLoading(false)
      setActiveCallSid("")
      setNumber("") // Clear number immediately when hanging up
      toast({ title: "Call Ended" })

      // Reset to idle state after a brief moment
      setTimeout(() => {
        setCallStatus("idle")
      }, 500)
    } catch {
      toast({ title: "Error", description: "Could not hang up.", variant: "destructive" })
    }
  }

  const dialpadNumbers = [
    [
      { num: "1", letters: "" },
      { num: "2", letters: "ABC" },
      { num: "3", letters: "DEF" },
    ],
    [
      { num: "4", letters: "GHI" },
      { num: "5", letters: "JKL" },
      { num: "6", letters: "MNO" },
    ],
    [
      { num: "7", letters: "PQRS" },
      { num: "8", letters: "TUV" },
      { num: "9", letters: "WXYZ" },
    ],
    [
      { num: "*", letters: "" },
      { num: "0", letters: "" },
      { num: "#", letters: "" },
    ],
  ]

  const selectedCountryData = countries.find((c) => c.code === selectedCountry)

  return (
    <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Header with Caller ID */}
      <div className="bg-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">👤 Caller ID</span>
          <span className="text-sm text-gray-500">{currentTime}</span>
        </div>

        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-gray-200">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-20 border border-gray-300 bg-white rounded-md px-2 py-1 h-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue>
                <div className="flex items-center gap-1">
                  <span className="text-base">{selectedCountryData?.flag}</span>
                  <span className="text-sm font-mono text-gray-800">{selectedCountry}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {countries.map((country) => (
                <SelectItem
                  key={`${country.code}-${country.country}`}
                  value={country.code}
                  className="hover:bg-gray-50 focus:bg-blue-50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{country.flag}</span>
                    <span className="font-mono text-gray-800">{country.code}</span>
                    <span className="text-sm text-gray-600">{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 min-h-[24px] text-lg font-mono text-gray-900">
            {number || <span className="text-gray-400">Enter number</span>}
          </div>

          {number && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackspace}
              disabled={callStatus !== "idle"}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <Delete className="h-4 w-4 text-gray-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialpad */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {dialpadNumbers.flat().map((item) => (
            <Button
              key={item.num}
              variant="ghost"
              className="h-16 flex flex-col items-center justify-center hover:bg-gray-50 text-gray-700 rounded-full"
              onClick={() => handleNumberPress(item.num)}
              disabled={callStatus !== "idle"}
            >
              <span className="text-2xl font-light">{item.num}</span>
              {item.letters && <span className="text-xs text-gray-400 mt-1">{item.letters}</span>}
            </Button>
          ))}
        </div>

        {/* Call Controls */}
        <div className="flex flex-col items-center gap-4">
          {callStatus === "idle" ? (
            <Button
              onClick={handleCall}
              disabled={isLoading || !number.trim() || !selectedNumber || loadingNumbers}
              className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
              size="icon"
            >
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Phone className="h-6 w-6" />}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleHangup}
                className="h-12 px-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
              >
                ⏹️ End Call
              </Button>

              {callStatus === "completed" && (
                <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">Call Ended</div>
              )}
            </>
          )}

          {/* Call Status */}
          {callStatus !== "idle" && callStatus !== "completed" && (
            <div className="text-center">
              <div className="text-sm text-gray-500 capitalize">
                {callStatus === "calling" && "Connecting..."}
                {callStatus === "ringing" && "Ringing"}
                {callStatus === "answered" && "Call Active"}
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-6">
          <div className={`w-2 h-2 rounded-full ${twilioDevice ? "bg-green-400" : "bg-red-400"}`} />
          <span>Connected to Twilio</span>
        </div>

        {/* Caller ID Selection */}
        {availableNumbers.length > 0 && (
          <div className="mt-4 text-center">
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger className="border-none bg-transparent p-0 h-auto text-blue-500 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableNumbers.map((num) => (
                  <SelectItem key={num.phoneNumber} value={num.phoneNumber}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇺🇸</span>
                      <span>{num.phoneNumber}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
