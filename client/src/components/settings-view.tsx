"use client"

import { BulkUpload } from "@/components/bulk-upload"
import { NumberSelector } from "@/components/number-selector"
import { CallTerminator } from "@/components/call-terminator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Settings } from "lucide-react"

export function SettingsView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Bulk Excel Upload</h3>
            <BulkUpload />
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3">Number Selector</h3>
            <NumberSelector />
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3">Call Management</h3>
            <CallTerminator />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
