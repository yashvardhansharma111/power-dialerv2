"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, PhoneOff, User } from "lucide-react"

interface IncomingCallToastProps {
  call: {
    sid: string
    from: string
    to: string
  }
  onAnswer: () => void
  onDecline: () => void
}

export function IncomingCallToast({ call, onAnswer, onDecline }: IncomingCallToastProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2">
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Incoming Call</p>
                <p className="text-sm text-muted-foreground">{call.from}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={onDecline}>
                <PhoneOff className="h-4 w-4" />
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onAnswer}>
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
