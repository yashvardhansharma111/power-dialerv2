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
import { parsePhoneNumberFromString } from "libphonenumber-js"

// Extract API_BASE from any API endpoint (e.g., LOGIN)
const API_BASE = API.LOGIN.replace(/\/auth\/login$/, "");
const SOCKET_BASE = API_BASE.replace(/\/api$/, "");
const socket = io(SOCKET_BASE)

const globalDevice: Device | null = null

// Country code to primary timezone mapping (ISO 3166-1 alpha-2)
const countryTimezones: Record<string, string> = {
  AF: "Asia/Kabul",
  AL: "Europe/Tirane",
  DZ: "Africa/Algiers",
  AS: "Pacific/Pago_Pago",
  AD: "Europe/Andorra",
  AO: "Africa/Luanda",
  AG: "America/Antigua",
  AR: "America/Argentina/Buenos_Aires",
  AM: "Asia/Yerevan",
  AU: "Australia/Sydney",
  AT: "Europe/Vienna",
  AZ: "Asia/Baku",
  BS: "America/Nassau",
  BH: "Asia/Bahrain",
  BD: "Asia/Dhaka",
  BB: "America/Barbados",
  BY: "Europe/Minsk",
  BE: "Europe/Brussels",
  BZ: "America/Belize",
  BJ: "Africa/Porto-Novo",
  BM: "Atlantic/Bermuda",
  BT: "Asia/Thimphu",
  BO: "America/La_Paz",
  BA: "Europe/Sarajevo",
  BW: "Africa/Gaborone",
  BR: "America/Sao_Paulo",
  BN: "Asia/Brunei",
  BG: "Europe/Sofia",
  BF: "Africa/Ouagadougou",
  BI: "Africa/Bujumbura",
  KH: "Asia/Phnom_Penh",
  CM: "Africa/Douala",
  CA: "America/Toronto",
  CV: "Atlantic/Cape_Verde",
  CF: "Africa/Bangui",
  TD: "Africa/Ndjamena",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  CO: "America/Bogota",
  KM: "Indian/Comoro",
  CG: "Africa/Brazzaville",
  CD: "Africa/Kinshasa",
  CR: "America/Costa_Rica",
  CI: "Africa/Abidjan",
  HR: "Europe/Zagreb",
  CU: "America/Havana",
  CY: "Asia/Nicosia",
  CZ: "Europe/Prague",
  DK: "Europe/Copenhagen",
  DJ: "Africa/Djibouti",
  DM: "America/Dominica",
  DO: "America/Santo_Domingo",
  EC: "America/Guayaquil",
  EG: "Africa/Cairo",
  SV: "America/El_Salvador",
  GQ: "Africa/Malabo",
  ER: "Africa/Asmara",
  EE: "Europe/Tallinn",
  SZ: "Africa/Mbabane",
  ET: "Africa/Addis_Ababa",
  FJ: "Pacific/Fiji",
  FI: "Europe/Helsinki",
  FR: "Europe/Paris",
  GA: "Africa/Libreville",
  GM: "Africa/Banjul",
  GE: "Asia/Tbilisi",
  DE: "Europe/Berlin",
  GH: "Africa/Accra",
  GR: "Europe/Athens",
  GD: "America/Grenada",
  GT: "America/Guatemala",
  GN: "Africa/Conakry",
  GW: "Africa/Bissau",
  GY: "America/Guyana",
  HT: "America/Port-au-Prince",
  HN: "America/Tegucigalpa",
  HU: "Europe/Budapest",
  IS: "Atlantic/Reykjavik",
  IN: "Asia/Kolkata",
  ID: "Asia/Jakarta",
  IR: "Asia/Tehran",
  IQ: "Asia/Baghdad",
  IE: "Europe/Dublin",
  IL: "Asia/Jerusalem",
  IT: "Europe/Rome",
  JM: "America/Jamaica",
  JP: "Asia/Tokyo",
  JO: "Asia/Amman",
  KZ: "Asia/Almaty",
  KE: "Africa/Nairobi",
  KI: "Pacific/Tarawa",
  KP: "Asia/Pyongyang",
  KR: "Asia/Seoul",
  KW: "Asia/Kuwait",
  KG: "Asia/Bishkek",
  LA: "Asia/Vientiane",
  LV: "Europe/Riga",
  LB: "Asia/Beirut",
  LS: "Africa/Maseru",
  LR: "Africa/Monrovia",
  LY: "Africa/Tripoli",
  LI: "Europe/Vaduz",
  LT: "Europe/Vilnius",
  LU: "Europe/Luxembourg",
  MG: "Indian/Antananarivo",
  MW: "Africa/Blantyre",
  MY: "Asia/Kuala_Lumpur",
  MV: "Indian/Maldives",
  ML: "Africa/Bamako",
  MT: "Europe/Malta",
  MH: "Pacific/Majuro",
  MR: "Africa/Nouakchott",
  MU: "Indian/Mauritius",
  MX: "America/Mexico_City",
  FM: "Pacific/Pohnpei",
  MD: "Europe/Chisinau",
  MC: "Europe/Monaco",
  MN: "Asia/Ulaanbaatar",
  ME: "Europe/Podgorica",
  MA: "Africa/Casablanca",
  MZ: "Africa/Maputo",
  MM: "Asia/Yangon",
  NA: "Africa/Windhoek",
  NR: "Pacific/Nauru",
  NP: "Asia/Kathmandu",
  NL: "Europe/Amsterdam",
  NZ: "Pacific/Auckland",
  NI: "America/Managua",
  NE: "Africa/Niamey",
  NG: "Africa/Lagos",
  NO: "Europe/Oslo",
  OM: "Asia/Muscat",
  PK: "Asia/Karachi",
  PW: "Pacific/Palau",
  PA: "America/Panama",
  PG: "Pacific/Port_Moresby",
  PY: "America/Asuncion",
  PE: "America/Lima",
  PH: "Asia/Manila",
  PL: "Europe/Warsaw",
  PT: "Europe/Lisbon",
  QA: "Asia/Qatar",
  RO: "Europe/Bucharest",
  RU: "Europe/Moscow",
  RW: "Africa/Kigali",
  KN: "America/St_Kitts",
  LC: "America/St_Lucia",
  VC: "America/St_Vincent",
  WS: "Pacific/Apia",
  SM: "Europe/San_Marino",
  ST: "Africa/Sao_Tome",
  SA: "Asia/Riyadh",
  SN: "Africa/Dakar",
  RS: "Europe/Belgrade",
  SC: "Indian/Mahe",
  SL: "Africa/Freetown",
  SG: "Asia/Singapore",
  SK: "Europe/Bratislava",
  SI: "Europe/Ljubljana",
  SB: "Pacific/Guadalcanal",
  SO: "Africa/Mogadishu",
  ZA: "Africa/Johannesburg",
  ES: "Europe/Madrid",
  LK: "Asia/Colombo",
  SD: "Africa/Khartoum",
  SR: "America/Paramaribo",
  SE: "Europe/Stockholm",
  CH: "Europe/Zurich",
  SY: "Asia/Damascus",
  TW: "Asia/Taipei",
  TJ: "Asia/Dushanbe",
  TZ: "Africa/Dar_es_Salaam",
  TH: "Asia/Bangkok",
  TL: "Asia/Dili",
  TG: "Africa/Lome",
  TO: "Pacific/Tongatapu",
  TT: "America/Port_of_Spain",
  TN: "Africa/Tunis",
  TR: "Europe/Istanbul",
  TM: "Asia/Ashgabat",
  TV: "Pacific/Funafuti",
  UG: "Africa/Kampala",
  UA: "Europe/Kyiv",
  AE: "Asia/Dubai",
  GB: "Europe/London",
  US: "America/New_York",
  UY: "America/Montevideo",
  UZ: "Asia/Tashkent",
  VU: "Pacific/Efate",
  VA: "Europe/Vatican",
  VE: "America/Caracas",
  VN: "Asia/Ho_Chi_Minh",
  YE: "Asia/Aden",
  ZM: "Africa/Lusaka",
  ZW: "Africa/Harare"
};

function getCountryAndTime(number: string) {
  const phoneNumber = parsePhoneNumberFromString(number);
  if (!phoneNumber) return null;
  const country = phoneNumber.country;
  if (!country) return null;
  const timeZone = countryTimezones[country];
  if (!timeZone) return { country, time: null };
  const now = new Date();
  const localTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(country);
  return { country, countryName, time: localTime, timeZone };
}

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

  useEffect(() => {
    if (!number.startsWith("+") || number.length < 4) return;
    const info = getCountryAndTime(number);
    if (info && info.countryName && info.time) {
      toast({
        title: `Country: ${info.countryName}`,
        description: `Local time: ${info.time} (${info.timeZone})`,
      });
    }
  }, [number]);

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