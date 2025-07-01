"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, XCircle, Delete, Signal, Loader2, Users, Volume2, Globe } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"
import { io } from "socket.io-client"
import { Device } from "@twilio/voice-sdk"

// Extract API_BASE from any API endpoint (e.g., LOGIN)
const API_BASE = API.LOGIN.replace(/\/auth\/login$/, "")
const SOCKET_BASE = API_BASE.replace(/\/api$/, "")
const socket = io(SOCKET_BASE)

// Comprehensive country codes and timezones
const countries = [
  { code: "+1", country: "US", name: "United States", timezone: "America/New_York" },
  { code: "+1", country: "CA", name: "Canada", timezone: "America/Toronto" },
  { code: "+7", country: "RU", name: "Russia", timezone: "Europe/Moscow" },
  { code: "+20", country: "EG", name: "Egypt", timezone: "Africa/Cairo" },
  { code: "+27", country: "ZA", name: "South Africa", timezone: "Africa/Johannesburg" },
  { code: "+30", country: "GR", name: "Greece", timezone: "Europe/Athens" },
  { code: "+31", country: "NL", name: "Netherlands", timezone: "Europe/Amsterdam" },
  { code: "+32", country: "BE", name: "Belgium", timezone: "Europe/Brussels" },
  { code: "+33", country: "FR", name: "France", timezone: "Europe/Paris" },
  { code: "+34", country: "ES", name: "Spain", timezone: "Europe/Madrid" },
  { code: "+36", country: "HU", name: "Hungary", timezone: "Europe/Budapest" },
  { code: "+39", country: "IT", name: "Italy", timezone: "Europe/Rome" },
  { code: "+40", country: "RO", name: "Romania", timezone: "Europe/Bucharest" },
  { code: "+41", country: "CH", name: "Switzerland", timezone: "Europe/Zurich" },
  { code: "+43", country: "AT", name: "Austria", timezone: "Europe/Vienna" },
  { code: "+44", country: "GB", name: "United Kingdom", timezone: "Europe/London" },
  { code: "+45", country: "DK", name: "Denmark", timezone: "Europe/Copenhagen" },
  { code: "+46", country: "SE", name: "Sweden", timezone: "Europe/Stockholm" },
  { code: "+47", country: "NO", name: "Norway", timezone: "Europe/Oslo" },
  { code: "+48", country: "PL", name: "Poland", timezone: "Europe/Warsaw" },
  { code: "+49", country: "DE", name: "Germany", timezone: "Europe/Berlin" },
  { code: "+51", country: "PE", name: "Peru", timezone: "America/Lima" },
  { code: "+52", country: "MX", name: "Mexico", timezone: "America/Mexico_City" },
  { code: "+53", country: "CU", name: "Cuba", timezone: "America/Havana" },
  { code: "+54", country: "AR", name: "Argentina", timezone: "America/Buenos_Aires" },
  { code: "+55", country: "BR", name: "Brazil", timezone: "America/Sao_Paulo" },
  { code: "+56", country: "CL", name: "Chile", timezone: "America/Santiago" },
  { code: "+57", country: "CO", name: "Colombia", timezone: "America/Bogota" },
  { code: "+58", country: "VE", name: "Venezuela", timezone: "America/Caracas" },
  { code: "+60", country: "MY", name: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { code: "+61", country: "AU", name: "Australia", timezone: "Australia/Sydney" },
  { code: "+62", country: "ID", name: "Indonesia", timezone: "Asia/Jakarta" },
  { code: "+63", country: "PH", name: "Philippines", timezone: "Asia/Manila" },
  { code: "+64", country: "NZ", name: "New Zealand", timezone: "Pacific/Auckland" },
  { code: "+65", country: "SG", name: "Singapore", timezone: "Asia/Singapore" },
  { code: "+66", country: "TH", name: "Thailand", timezone: "Asia/Bangkok" },
  { code: "+81", country: "JP", name: "Japan", timezone: "Asia/Tokyo" },
  { code: "+82", country: "KR", name: "South Korea", timezone: "Asia/Seoul" },
  { code: "+84", country: "VN", name: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
  { code: "+86", country: "CN", name: "China", timezone: "Asia/Shanghai" },
  { code: "+90", country: "TR", name: "Turkey", timezone: "Europe/Istanbul" },
  { code: "+91", country: "IN", name: "India", timezone: "Asia/Kolkata" },
  { code: "+92", country: "PK", name: "Pakistan", timezone: "Asia/Karachi" },
  { code: "+93", country: "AF", name: "Afghanistan", timezone: "Asia/Kabul" },
  { code: "+94", country: "LK", name: "Sri Lanka", timezone: "Asia/Colombo" },
  { code: "+95", country: "MM", name: "Myanmar", timezone: "Asia/Yangon" },
  { code: "+98", country: "IR", name: "Iran", timezone: "Asia/Tehran" },
  { code: "+212", country: "MA", name: "Morocco", timezone: "Africa/Casablanca" },
  { code: "+213", country: "DZ", name: "Algeria", timezone: "Africa/Algiers" },
  { code: "+216", country: "TN", name: "Tunisia", timezone: "Africa/Tunis" },
  { code: "+218", country: "LY", name: "Libya", timezone: "Africa/Tripoli" },
  { code: "+220", country: "GM", name: "Gambia", timezone: "Africa/Banjul" },
  { code: "+221", country: "SN", name: "Senegal", timezone: "Africa/Dakar" },
  { code: "+222", country: "MR", name: "Mauritania", timezone: "Africa/Nouakchott" },
  { code: "+223", country: "ML", name: "Mali", timezone: "Africa/Bamako" },
  { code: "+224", country: "GN", name: "Guinea", timezone: "Africa/Conakry" },
  { code: "+225", country: "CI", name: "Ivory Coast", timezone: "Africa/Abidjan" },
  { code: "+226", country: "BF", name: "Burkina Faso", timezone: "Africa/Ouagadougou" },
  { code: "+227", country: "NE", name: "Niger", timezone: "Africa/Niamey" },
  { code: "+228", country: "TG", name: "Togo", timezone: "Africa/Lome" },
  { code: "+229", country: "BJ", name: "Benin", timezone: "Africa/Porto-Novo" },
  { code: "+230", country: "MU", name: "Mauritius", timezone: "Indian/Mauritius" },
  { code: "+231", country: "LR", name: "Liberia", timezone: "Africa/Monrovia" },
  { code: "+232", country: "SL", name: "Sierra Leone", timezone: "Africa/Freetown" },
  { code: "+233", country: "GH", name: "Ghana", timezone: "Africa/Accra" },
  { code: "+234", country: "NG", name: "Nigeria", timezone: "Africa/Lagos" },
  { code: "+235", country: "TD", name: "Chad", timezone: "Africa/Ndjamena" },
  { code: "+236", country: "CF", name: "Central African Republic", timezone: "Africa/Bangui" },
  { code: "+237", country: "CM", name: "Cameroon", timezone: "Africa/Douala" },
  { code: "+238", country: "CV", name: "Cape Verde", timezone: "Atlantic/Cape_Verde" },
  { code: "+239", country: "ST", name: "São Tomé and Príncipe", timezone: "Africa/Sao_Tome" },
  { code: "+240", country: "GQ", name: "Equatorial Guinea", timezone: "Africa/Malabo" },
  { code: "+241", country: "GA", name: "Gabon", timezone: "Africa/Libreville" },
  { code: "+242", country: "CG", name: "Republic of the Congo", timezone: "Africa/Brazzaville" },
  { code: "+243", country: "CD", name: "Democratic Republic of the Congo", timezone: "Africa/Kinshasa" },
  { code: "+244", country: "AO", name: "Angola", timezone: "Africa/Luanda" },
  { code: "+245", country: "GW", name: "Guinea-Bissau", timezone: "Africa/Bissau" },
  { code: "+246", country: "IO", name: "British Indian Ocean Territory", timezone: "Indian/Chagos" },
  { code: "+248", country: "SC", name: "Seychelles", timezone: "Indian/Mahe" },
  { code: "+249", country: "SD", name: "Sudan", timezone: "Africa/Khartoum" },
  { code: "+250", country: "RW", name: "Rwanda", timezone: "Africa/Kigali" },
  { code: "+251", country: "ET", name: "Ethiopia", timezone: "Africa/Addis_Ababa" },
  { code: "+252", country: "SO", name: "Somalia", timezone: "Africa/Mogadishu" },
  { code: "+253", country: "DJ", name: "Djibouti", timezone: "Africa/Djibouti" },
  { code: "+254", country: "KE", name: "Kenya", timezone: "Africa/Nairobi" },
  { code: "+255", country: "TZ", name: "Tanzania", timezone: "Africa/Dar_es_Salaam" },
  { code: "+256", country: "UG", name: "Uganda", timezone: "Africa/Kampala" },
  { code: "+257", country: "BI", name: "Burundi", timezone: "Africa/Bujumbura" },
  { code: "+258", country: "MZ", name: "Mozambique", timezone: "Africa/Maputo" },
  { code: "+260", country: "ZM", name: "Zambia", timezone: "Africa/Lusaka" },
  { code: "+261", country: "MG", name: "Madagascar", timezone: "Indian/Antananarivo" },
  { code: "+262", country: "RE", name: "Réunion", timezone: "Indian/Reunion" },
  { code: "+263", country: "ZW", name: "Zimbabwe", timezone: "Africa/Harare" },
  { code: "+264", country: "NA", name: "Namibia", timezone: "Africa/Windhoek" },
  { code: "+265", country: "MW", name: "Malawi", timezone: "Africa/Blantyre" },
  { code: "+266", country: "LS", name: "Lesotho", timezone: "Africa/Maseru" },
  { code: "+267", country: "BW", name: "Botswana", timezone: "Africa/Gaborone" },
  { code: "+268", country: "SZ", name: "Eswatini", timezone: "Africa/Mbabane" },
  { code: "+269", country: "KM", name: "Comoros", timezone: "Indian/Comoro" },
  { code: "+290", country: "SH", name: "Saint Helena", timezone: "Atlantic/St_Helena" },
  { code: "+291", country: "ER", name: "Eritrea", timezone: "Africa/Asmara" },
  { code: "+297", country: "AW", name: "Aruba", timezone: "America/Aruba" },
  { code: "+298", country: "FO", name: "Faroe Islands", timezone: "Atlantic/Faroe" },
  { code: "+299", country: "GL", name: "Greenland", timezone: "America/Godthab" },
  { code: "+350", country: "GI", name: "Gibraltar", timezone: "Europe/Gibraltar" },
  { code: "+351", country: "PT", name: "Portugal", timezone: "Europe/Lisbon" },
  { code: "+352", country: "LU", name: "Luxembourg", timezone: "Europe/Luxembourg" },
  { code: "+353", country: "IE", name: "Ireland", timezone: "Europe/Dublin" },
  { code: "+354", country: "IS", name: "Iceland", timezone: "Atlantic/Reykjavik" },
  { code: "+355", country: "AL", name: "Albania", timezone: "Europe/Tirane" },
  { code: "+356", country: "MT", name: "Malta", timezone: "Europe/Malta" },
  { code: "+357", country: "CY", name: "Cyprus", timezone: "Asia/Nicosia" },
  { code: "+358", country: "FI", name: "Finland", timezone: "Europe/Helsinki" },
  { code: "+359", country: "BG", name: "Bulgaria", timezone: "Europe/Sofia" },
  { code: "+370", country: "LT", name: "Lithuania", timezone: "Europe/Vilnius" },
  { code: "+371", country: "LV", name: "Latvia", timezone: "Europe/Riga" },
  { code: "+372", country: "EE", name: "Estonia", timezone: "Europe/Tallinn" },
  { code: "+373", country: "MD", name: "Moldova", timezone: "Europe/Chisinau" },
  { code: "+374", country: "AM", name: "Armenia", timezone: "Asia/Yerevan" },
  { code: "+375", country: "BY", name: "Belarus", timezone: "Europe/Minsk" },
  { code: "+376", country: "AD", name: "Andorra", timezone: "Europe/Andorra" },
  { code: "+377", country: "MC", name: "Monaco", timezone: "Europe/Monaco" },
  { code: "+378", country: "SM", name: "San Marino", timezone: "Europe/San_Marino" },
  { code: "+380", country: "UA", name: "Ukraine", timezone: "Europe/Kiev" },
  { code: "+381", country: "RS", name: "Serbia", timezone: "Europe/Belgrade" },
  { code: "+382", country: "ME", name: "Montenegro", timezone: "Europe/Podgorica" },
  { code: "+383", country: "XK", name: "Kosovo", timezone: "Europe/Belgrade" },
  { code: "+385", country: "HR", name: "Croatia", timezone: "Europe/Zagreb" },
  { code: "+386", country: "SI", name: "Slovenia", timezone: "Europe/Ljubljana" },
  { code: "+387", country: "BA", name: "Bosnia and Herzegovina", timezone: "Europe/Sarajevo" },
  { code: "+389", country: "MK", name: "North Macedonia", timezone: "Europe/Skopje" },
  { code: "+420", country: "CZ", name: "Czech Republic", timezone: "Europe/Prague" },
  { code: "+421", country: "SK", name: "Slovakia", timezone: "Europe/Bratislava" },
  { code: "+423", country: "LI", name: "Liechtenstein", timezone: "Europe/Vaduz" },
  { code: "+500", country: "FK", name: "Falkland Islands", timezone: "Atlantic/Stanley" },
  { code: "+501", country: "BZ", name: "Belize", timezone: "America/Belize" },
  { code: "+502", country: "GT", name: "Guatemala", timezone: "America/Guatemala" },
  { code: "+503", country: "SV", name: "El Salvador", timezone: "America/El_Salvador" },
  { code: "+504", country: "HN", name: "Honduras", timezone: "America/Tegucigalpa" },
  { code: "+505", country: "NI", name: "Nicaragua", timezone: "America/Managua" },
  { code: "+506", country: "CR", name: "Costa Rica", timezone: "America/Costa_Rica" },
  { code: "+507", country: "PA", name: "Panama", timezone: "America/Panama" },
  { code: "+508", country: "PM", name: "Saint Pierre and Miquelon", timezone: "America/Miquelon" },
  { code: "+509", country: "HT", name: "Haiti", timezone: "America/Port-au-Prince" },
  { code: "+590", country: "GP", name: "Guadeloupe", timezone: "America/Guadeloupe" },
  { code: "+591", country: "BO", name: "Bolivia", timezone: "America/La_Paz" },
  { code: "+592", country: "GY", name: "Guyana", timezone: "America/Georgetown" },
  { code: "+593", country: "EC", name: "Ecuador", timezone: "America/Guayaquil" },
  { code: "+594", country: "GF", name: "French Guiana", timezone: "America/Cayenne" },
  { code: "+595", country: "PY", name: "Paraguay", timezone: "America/Asuncion" },
  { code: "+596", country: "MQ", name: "Martinique", timezone: "America/Martinique" },
  { code: "+597", country: "SR", name: "Suriname", timezone: "America/Paramaribo" },
  { code: "+598", country: "UY", name: "Uruguay", timezone: "America/Montevideo" },
  { code: "+599", country: "CW", name: "Curaçao", timezone: "America/Curacao" },
  { code: "+670", country: "TL", name: "East Timor", timezone: "Asia/Dili" },
  { code: "+672", country: "AQ", name: "Antarctica", timezone: "Antarctica/McMurdo" },
  { code: "+673", country: "BN", name: "Brunei", timezone: "Asia/Brunei" },
  { code: "+674", country: "NR", name: "Nauru", timezone: "Pacific/Nauru" },
  { code: "+675", country: "PG", name: "Papua New Guinea", timezone: "Pacific/Port_Moresby" },
  { code: "+676", country: "TO", name: "Tonga", timezone: "Pacific/Tongatapu" },
  { code: "+677", country: "SB", name: "Solomon Islands", timezone: "Pacific/Guadalcanal" },
  { code: "+678", country: "VU", name: "Vanuatu", timezone: "Pacific/Efate" },
  { code: "+679", country: "FJ", name: "Fiji", timezone: "Pacific/Fiji" },
  { code: "+680", country: "PW", name: "Palau", timezone: "Pacific/Palau" },
  { code: "+681", country: "WF", name: "Wallis and Futuna", timezone: "Pacific/Wallis" },
  { code: "+682", country: "CK", name: "Cook Islands", timezone: "Pacific/Rarotonga" },
  { code: "+683", country: "NU", name: "Niue", timezone: "Pacific/Niue" },
  { code: "+684", country: "AS", name: "American Samoa", timezone: "Pacific/Pago_Pago" },
  { code: "+685", country: "WS", name: "Samoa", timezone: "Pacific/Apia" },
  { code: "+686", country: "KI", name: "Kiribati", timezone: "Pacific/Tarawa" },
  { code: "+687", country: "NC", name: "New Caledonia", timezone: "Pacific/Noumea" },
  { code: "+688", country: "TV", name: "Tuvalu", timezone: "Pacific/Funafuti" },
  { code: "+689", country: "PF", name: "French Polynesia", timezone: "Pacific/Tahiti" },
  { code: "+690", country: "TK", name: "Tokelau", timezone: "Pacific/Fakaofo" },
  { code: "+691", country: "FM", name: "Federated States of Micronesia", timezone: "Pacific/Chuuk" },
  { code: "+692", country: "MH", name: "Marshall Islands", timezone: "Pacific/Majuro" },
  { code: "+850", country: "KP", name: "North Korea", timezone: "Asia/Pyongyang" },
  { code: "+852", country: "HK", name: "Hong Kong", timezone: "Asia/Hong_Kong" },
  { code: "+853", country: "MO", name: "Macau", timezone: "Asia/Macau" },
  { code: "+855", country: "KH", name: "Cambodia", timezone: "Asia/Phnom_Penh" },
  { code: "+856", country: "LA", name: "Laos", timezone: "Asia/Vientiane" },
  { code: "+880", country: "BD", name: "Bangladesh", timezone: "Asia/Dhaka" },
  { code: "+886", country: "TW", name: "Taiwan", timezone: "Asia/Taipei" },
  { code: "+960", country: "MV", name: "Maldives", timezone: "Indian/Maldives" },
  { code: "+961", country: "LB", name: "Lebanon", timezone: "Asia/Beirut" },
  { code: "+962", country: "JO", name: "Jordan", timezone: "Asia/Amman" },
  { code: "+963", country: "SY", name: "Syria", timezone: "Asia/Damascus" },
  { code: "+964", country: "IQ", name: "Iraq", timezone: "Asia/Baghdad" },
  { code: "+965", country: "KW", name: "Kuwait", timezone: "Asia/Kuwait" },
  { code: "+966", country: "SA", name: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { code: "+967", country: "YE", name: "Yemen", timezone: "Asia/Aden" },
  { code: "+968", country: "OM", name: "Oman", timezone: "Asia/Muscat" },
  { code: "+970", country: "PS", name: "Palestine", timezone: "Asia/Gaza" },
  { code: "+971", country: "AE", name: "United Arab Emirates", timezone: "Asia/Dubai" },
  { code: "+972", country: "IL", name: "Israel", timezone: "Asia/Jerusalem" },
  { code: "+973", country: "BH", name: "Bahrain", timezone: "Asia/Bahrain" },
  { code: "+974", country: "QA", name: "Qatar", timezone: "Asia/Qatar" },
  { code: "+975", country: "BT", name: "Bhutan", timezone: "Asia/Thimphu" },
  { code: "+976", country: "MN", name: "Mongolia", timezone: "Asia/Ulaanbaatar" },
  { code: "+977", country: "NP", name: "Nepal", timezone: "Asia/Kathmandu" },
  { code: "+992", country: "TJ", name: "Tajikistan", timezone: "Asia/Dushanbe" },
  { code: "+993", country: "TM", name: "Turkmenistan", timezone: "Asia/Ashgabat" },
  { code: "+994", country: "AZ", name: "Azerbaijan", timezone: "Asia/Baku" },
  { code: "+995", country: "GE", name: "Georgia", timezone: "Asia/Tbilisi" },
  { code: "+996", country: "KG", name: "Kyrgyzstan", timezone: "Asia/Bishkek" },
  { code: "+998", country: "UZ", name: "Uzbekistan", timezone: "Asia/Tashkent" },
]

function getCountryTime(countryCode: string) {
  const country = countries.find((c) => c.code === countryCode)
  if (!country) return null

  const now = new Date()
  const localTime = new Intl.DateTimeFormat("en-US", {
    timeZone: country.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

  // Debounced country time display
  const debouncedShowCountryTime = useCallback(
    debounce((countryCode: string) => {
      const info = getCountryTime(countryCode)
      if (info) {
        toast({
          title: `${info.country}`,
          description: `Local time: ${info.time} (${info.timezone})`,
        })
      }
    }, 500),
    [],
  )

  useEffect(() => {
    // 🔁 Fetch available numbers
    fetchAvailableNumbers()

    // 📡 Handle call status from socket
    const handleCallStatus = ({ sid, status }: any) => {
      console.log("📡 [Socket] Call Status:", status, "SID:", sid)
      setCallStatus(status)
      setActiveCallSid(sid || "")
      toast({ title: `Call Status: ${status}`, description: `SID: ${sid}` })

      if (status === "completed") {
        setTimeout(() => {
          setCallStatus("idle")
          setActiveCallSid("")
          // Auto-clear number after call completion
          setNumber("")
        }, 1000)
      }
    }

    socket.on("call-status", handleCallStatus)

    return () => {
      socket.off("call-status", handleCallStatus)
    }
  }, [])

  useEffect(() => {
    // 🔌 Setup Twilio device
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
          console.error("❌ Twilio Device registration error:")
          console.error("  • Code:", err.code)
          console.error("  • Message:", err.message)
          console.error("  • TwilioError Stack:", err.stack)
          console.error("  • TwilioError Details:", JSON.stringify(err, null, 2))
        })

        device.register()
      } catch (err) {
        console.error("❌ Failed to fetch Twilio token or register:", err)
      }
    }

    setupTwilio()
  }, [])

  useEffect(() => {
    // 📲 Handle incoming calls
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

  // Show country time when country changes
  useEffect(() => {
    debouncedShowCountryTime(selectedCountry)
  }, [selectedCountry, debouncedShowCountryTime])

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
    } finally {
      setIsLoading(false)
    }
  }

  const handleHangup = async () => {
    if (!twilioDevice) return

    try {
      twilioDevice.disconnectAll()
      setCallStatus("completed")
      toast({ title: "Call Ended" })
    } catch {
      toast({ title: "Error", description: "Could not hang up.", variant: "destructive" })
    }
  }

  const dialpadNumbers = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ]

  const getStatusColor = () => {
    switch (callStatus) {
      case "calling":
        return "text-blue-500"
      case "ringing":
        return "text-yellow-500"
      case "answered":
        return "text-green-500"
      case "completed":
        return "text-gray-500"
      default:
        return "text-gray-400"
    }
  }

  const getStatusIcon = () => {
    switch (callStatus) {
      case "calling":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "ringing":
        return <Signal className="h-4 w-4 animate-pulse" />
      case "answered":
        return <Volume2 className="h-4 w-4" />
      case "completed":
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 p-4">
      <Card className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-2xl border border-slate-200/50 backdrop-blur-sm">
        <CardHeader className="pb-6 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-t-lg">
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            Smart Dialer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Number Display with Country Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </label>

            <div className="flex gap-3">
              {/* Country Code Selector */}
              <div className="w-32">
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="h-14 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl hover:border-blue-400 focus:border-blue-500 transition-colors shadow-sm">
                    <SelectValue>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Globe className="h-4 w-4 text-slate-600" />
                        <span className="font-mono text-slate-700">{selectedCountry}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl max-h-60 bg-white">
                    {countries.map((country) => (
                      <SelectItem
                        key={`${country.code}-${country.country}`}
                        value={country.code}
                        className="rounded-lg hover:bg-slate-50 focus:bg-blue-50 py-3"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Globe className="h-4 w-4 text-slate-500 flex-shrink-0" />
                          <div className="flex flex-col items-start min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-slate-900">{country.code}</span>
                              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600 uppercase font-medium">
                                {country.country}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 truncate w-full">{country.name}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number Input */}
              <div className="flex-1 relative">
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="h-14 text-xl font-mono bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl shadow-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 pr-12"
                  type="tel"
                  disabled={callStatus !== "idle"}
                />
                {number && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackspace}
                    disabled={callStatus !== "idle"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <Delete className="h-4 w-4 text-slate-500" />
                  </Button>
                )}
              </div>
            </div>

            {/* Full Number Preview */}
            {number && (
              <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-lg font-mono font-semibold text-blue-900">
                  {selectedCountry} {number}
                </span>
              </div>
            )}
          </div>

          {/* Caller ID Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Caller ID
            </label>
            {loadingNumbers ? (
              <div className="flex items-center justify-center p-6 bg-white/50 rounded-xl border border-slate-200">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-3 text-sm text-slate-600">Loading numbers...</span>
              </div>
            ) : availableNumbers.length > 0 ? (
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger className="h-12 bg-white/90 backdrop-blur-sm border-2 border-slate-300 rounded-xl hover:border-blue-400 focus:border-blue-500 transition-colors shadow-sm">
                  <SelectValue placeholder="Select caller ID" className="text-slate-700" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-slate-200 shadow-xl bg-white">
                  {availableNumbers.map((num) => (
                    <SelectItem
                      key={num.phoneNumber}
                      value={num.phoneNumber}
                      className="rounded-lg hover:bg-slate-50 focus:bg-blue-50 py-3"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-slate-900">{num.friendlyName || num.phoneNumber}</span>
                        {num.friendlyName && <span className="text-xs text-slate-500">{num.phoneNumber}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-700 text-center font-medium">No Twilio numbers available</p>
              </div>
            )}
          </div>

          {/* Dialpad */}
          <div className="grid grid-cols-3 gap-4">
            {dialpadNumbers.flat().map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-16 text-2xl font-bold bg-white/95 backdrop-blur-sm border-2 border-slate-300 rounded-2xl hover:bg-blue-50 hover:border-blue-400 hover:shadow-md active:scale-95 transition-all duration-150 shadow-sm text-slate-700 hover:text-blue-700"
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
              {activeCallSid && <span className="text-xs text-slate-500 ml-2">SID: {activeCallSid.slice(-8)}</span>}
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${twilioDevice ? "bg-green-400" : "bg-red-400"}`} />
            <span>{twilioDevice ? "Connected to Twilio" : "Connecting..."}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
