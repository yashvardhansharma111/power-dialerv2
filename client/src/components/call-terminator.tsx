"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PhoneOff } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"

export function CallTerminator() {
  const [callSid, setCallSid] = useState("")
  const [isTerminating, setIsTerminating] = useState(false)

  const handleTerminateCall = async () => {
    if (!callSid.trim()) {
      toast({
        title: "Invalid SID",
        description: "Please enter a valid call SID",
        variant: "destructive",
      })
      return
    }

    setIsTerminating(true)
    try {
      const response = await fetch(API.TERMINATE(callSid), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Call terminated",
          description: `Successfully terminated call ${callSid}`,
        })
        setCallSid("")
      } else {
        throw new Error("Failed to terminate call")
      }
    } catch (error) {
      toast({
        title: "Termination failed",
        description: "Unable to terminate the call",
        variant: "destructive",
      })
    } finally {
      setIsTerminating(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="call-sid">Call SID</Label>
            <Input
              id="call-sid"
              placeholder="Enter call SID to terminate"
              value={callSid}
              onChange={(e) => setCallSid(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTerminateCall}
            disabled={isTerminating || !callSid.trim()}
            variant="destructive"
            className="w-full"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            {isTerminating ? "Terminating..." : "Terminate Call"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
