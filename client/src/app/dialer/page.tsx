"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { DialerPad } from "@/components/dialer-pad"
import { LogsView } from "@/components/logs-view"
import DashboardView from "@/components/settings-view"
import { IncomingCallToast } from "@/components/incoming-call-toast"
import { useSocket } from "@/hooks/use-socket"
import { toast } from "@/hooks/use-toast"
import BulkCallTab from "@/components/bulk-call-Tab"

export default function DialerPage() {
  const [activeTab, setActiveTab] = useState("phone")
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const router = useRouter()
  const socket = useSocket()

  useEffect(() => {
    const token = localStorage.getItem("jwt")
    if (!token) {
      router.push("/")
      return
    }

    if (typeof window !== "undefined") {
      const axios = require("axios")
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
  }, [router])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to handle calls.",
        variant: "destructive",
      })
    })
  }, [])

  useEffect(() => {
    if (socket) {
      socket.on("call-status", (data: any) => {
        console.log("Call status update:", data)

        if (data.status === "ringing" && data.direction === "inbound") {
          setIncomingCall(data)
        }

        toast({
          title: "Call Status Update",
          description: `Call ${data.status}: ${data.from} → ${data.to}`,
        })
      })

      return () => {
        socket.off("call-status")
      }
    }
  }, [socket])

  const renderActiveTab = () => {
    switch (activeTab) {
      case "phone":
        return <DialerPad />
      case "logs":
        return <LogsView />
      case "settings":
        return <DashboardView />
        case "bulk-call":
      return <BulkCallTab />
      default:
        return <DialerPad />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">{renderActiveTab()}</div>

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {incomingCall && (
        <IncomingCallToast
          call={incomingCall}
          onAnswer={() => setIncomingCall(null)}
          onDecline={() => setIncomingCall(null)}
        />
      )}
    </div>
  )
}
