"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"

interface TwilioNumber {
  sid: string
  phoneNumber: string
  friendlyName: string
}

export function NumberSelector() {
  const [availableNumbers, setAvailableNumbers] = useState<TwilioNumber[]>([])
  const [selectedNumber, setSelectedNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchAvailableNumbers()
  }, [])

  const fetchAvailableNumbers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(API.GET_NUMBERS, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableNumbers(data || []) // data is an array of numbers
        if (data.length > 0 && !selectedNumber) {
          setSelectedNumber(data[0].phoneNumber)
        }
      } else {
        throw new Error("Fetch failed")
      }
    } catch (error) {
      toast({
        title: "Failed to fetch numbers",
        description: "Unable to load available Twilio numbers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <Select value={selectedNumber} onValueChange={setSelectedNumber}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a Twilio number" />
            </SelectTrigger>
            <SelectContent>
              {availableNumbers.map((num) => (
                <SelectItem key={num.sid} value={num.phoneNumber}>
                  {num.friendlyName || num.phoneNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchAvailableNumbers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {selectedNumber && (
          <p className="text-sm text-muted-foreground mt-2">
            Currently selected: <span className="font-mono">{selectedNumber}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
