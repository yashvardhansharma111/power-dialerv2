"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Clock, PhoneCall, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CallLog {
  sid: string
  from: string
  to: string
  status: string
  duration?: number | string
  startTime: string
  direction?: string
  price?: string
  recordingUrl?: string
}

export function LogsView() {
  const [logs, setLogs] = useState<CallLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<CallLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [showRecording, setShowRecording] = useState(false)

  useEffect(() => {
    fetchCallLogs()
  }, [])

  useEffect(() => {
    let filtered = logs
    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter)
    }
    if (directionFilter !== "all") {
      filtered = filtered.filter((log) => (log.direction || "").toLowerCase() === directionFilter)
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (log) => log.from.includes(searchTerm) || log.to.includes(searchTerm) || log.sid.includes(searchTerm),
      )
    }
    setFilteredLogs(filtered)
  }, [searchTerm, logs, statusFilter, directionFilter])

  const fetchCallLogs = async () => {
    try {
      const response = await fetch(API.CALL_LOGS, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      })
      const data = await response.json()
      const logsArray = Array.isArray(data) ? data : data.logs || []
      setLogs(logsArray)
    } catch (error) {
      toast({
        title: "Failed to fetch logs",
        description: "Unable to load call logs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedial = async (number: string) => {
    try {
      const response = await fetch(API.MANUAL_CALL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: JSON.stringify({ to: number }),
      })

      if (response.ok) {
        toast({
          title: "Call initiated",
          description: `Redialing ${number}...`,
        })
      }
    } catch (error) {
      toast({
        title: "Redial failed",
        description: "Unable to initiate call",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "in-progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "ringing": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatDuration = (seconds?: number | string) => {
    const val = typeof seconds === 'string' ? parseInt(seconds) : seconds
    if (!val) return "0s"
    const mins = Math.floor(val / 60)
    const secs = val % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "busy", label: "Busy" },
    { value: "failed", label: "Failed" },
    { value: "in-progress", label: "In Progress" },
    { value: "ringing", label: "Ringing" },
    { value: "no-answer", label: "No Answer" },
    { value: "queued", label: "Queued" },
    { value: "canceled", label: "Canceled" },
  ]
  const directionOptions = [
    { value: "all", label: "All" },
    { value: "inbound", label: "Incoming" },
    { value: "outbound-api", label: "Outgoing" },
    { value: "outbound-dial", label: "Outgoing (Dial)" },
  ]

  const handleListenRecording = async (log: CallLog) => {
    if (!log.recordingUrl) return
    try {
      // Twilio returns a subresource URI, need to fetch the actual recording list
      const response = await fetch(`http://localhost:8000/api/call-logs/recording/${log.sid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      })
      const data = await response.json()
      if (data && data.url) {
        setRecordingUrl(data.url)
        setShowRecording(true)
      } else {
        toast({ title: "No recording found", description: "No audio available for this call." })
      }
    } catch {
      toast({ title: "Recording Error", description: "Could not fetch recording.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4 p-4 pb-28 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Call Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div>
              <label className="text-xs font-medium mr-2">Status:</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mr-2">Direction:</label>
              <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)} className="border rounded px-2 py-1">
                {directionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by number or SID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading call logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No call logs available</div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Card key={log.sid} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.from}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{log.to || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(log.startTime).toLocaleString()}</span>
                        {log.duration && <><span>•</span><span>{formatDuration(log.duration)}</span></>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">SID: {log.sid}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleRedial(log.to)}>
                        <PhoneCall className="h-3 w-3" />
                      </Button>
                      {log.recordingUrl && (
                        <Button size="sm" variant="outline" onClick={() => handleListenRecording(log)}>
                          Listen
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Recording Dialog */}
      <Dialog open={showRecording} onOpenChange={setShowRecording}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Recording</DialogTitle>
          </DialogHeader>
          {recordingUrl ? (
            <audio controls src={recordingUrl} className="w-full mt-4" />
          ) : (
            <div className="text-center text-muted-foreground">No recording available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
