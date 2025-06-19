"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { API } from "@/utils/const"

interface UploadStatus {
  number: string
  status: "pending" | "calling" | "success" | "failed"
}

export function BulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith(".xlsx")
      ) {
        setFile(selectedFile)
        setUploadStatuses([])
        setUploadProgress(0)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel (.xlsx) file",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(API.BULK_UPLOAD, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt")}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        // Initialize status tracking
        const initialStatuses: UploadStatus[] =
          data.numbers?.map((num: string) => ({
            number: num,
            status: "pending" as const,
          })) || []

        setUploadStatuses(initialStatuses)

        // Simulate progress updates (in real app, this would come from WebSocket)
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setUploadProgress(progress)

          if (progress >= 100) {
            clearInterval(interval)
            setIsUploading(false)
            toast({
              title: "Upload completed",
              description: `Processed ${initialStatuses.length} numbers`,
            })
          }
        }, 500)
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Unable to process the Excel file",
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadStatuses([])
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "calling":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileSelect} className="hidden" />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload className="h-4 w-4 mr-2" />
          Select Excel File
        </Button>

        {file && (
          <Button onClick={handleUpload} disabled={isUploading} className="bg-green-600 hover:bg-green-700">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Upload & Process
          </Button>
        )}
      </div>

      {file && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={removeFile} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">Processing... {uploadProgress}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadStatuses.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Upload Status</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadStatuses.map((status, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted rounded">
                  <span className="font-mono text-sm">{status.number}</span>
                  <Badge className={getStatusColor(status.status)}>{status.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
