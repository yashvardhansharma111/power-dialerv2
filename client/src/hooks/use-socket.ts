"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "https://power-dialerv2-wior.vercel.app", {
      auth: {
        token: localStorage.getItem("jwt"),
      },
    })

    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server")
    })

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server")
    })

    socketInstance.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return socket
}
