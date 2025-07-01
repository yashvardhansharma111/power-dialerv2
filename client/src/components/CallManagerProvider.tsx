"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { io as socketIO, Socket } from "socket.io-client";
import { Device } from "@twilio/voice-sdk";
import { API } from "@/utils/const";

export const CallManagerContext = createContext<any>(null);

const SOCKET_URL = API.LOGIN.replace(/\/auth\/login$/, "");

export const CallManagerProvider = ({ children }: { children: React.ReactNode }) => {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callActive, setCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [twilioDevice, setTwilioDevice] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const timerRef = useRef<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Setup Socket.IO for incoming call events
  useEffect(() => {
    const socket = socketIO(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("incoming-call", (data) => {
      setIncomingCall(data);
      setCallActive(false);
      setCallStartTime(null);
      setElapsed(0);
      toast.custom((t: any) => {
        const toastId = typeof t === "object" && t && "id" in t ? t.id : t;
        return (
          <div style={{ minWidth: 220 }}>
            <div>📞 Incoming call from <b>{data.from}</b></div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{ background: "#22c55e", color: "white", border: 0, padding: "4px 12px", borderRadius: 4 }} onClick={async () => {
                await handleReceiveCall(data);
                toast.dismiss(toastId);
              }}>Receive</button>
              <button style={{ background: "#ef4444", color: "white", border: 0, padding: "4px 12px", borderRadius: 4 }} onClick={() => {
                setIncomingCall(null);
                setCallActive(false);
                setCallStartTime(null);
                setElapsed(0);
                toast.dismiss(toastId);
              }}>Cut</button>
            </div>
          </div>
        );
      }, { duration: 10000, id: "incoming-call" });
    });
    return () => { socket.disconnect(); };
  }, []);

  // Setup Twilio Device globally
  useEffect(() => {
    const setupDevice = async () => {
      try {
        const res = await fetch(API.GET_TWILIO_TOKEN, {
          headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        });
        const { token } = await res.json();
        const device = new Device(token);
        device.on("ready", () => console.log("[Twilio] Device ready"));
        device.on("error", (err) => console.error("[Twilio Error]", err));
        device.on("incoming", (conn) => {
          console.log("[Twilio] Device incoming event", conn);
        });
        device.on("connect", (conn) => {
          setConnection(conn);
          setCallActive(true);
          setCallStartTime(Date.now());
        });
        device.on("disconnect", () => {
          setCallActive(false);
          setCallStartTime(null);
          setElapsed(0);
          setConnection(null);
        });
        setTwilioDevice(device);
      } catch (err) {
        console.error("[Twilio] Device setup failed", err);
      }
    };
    setupDevice();
  }, []);

  // Timer logic
  useEffect(() => {
    if (callActive && callStartTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (callStartTime as number)) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callActive, callStartTime]);

  // Handle two-way communication after picking up
  const handleReceiveCall = async (data: any) => {
    if (!twilioDevice) {
      toast.error("Twilio Device not ready");
      return;
    }
    try {
      twilioDevice.on("incoming", (conn: any) => {
        if (conn.accept) conn.accept();
        setConnection(conn);
        setCallActive(true);
        setCallStartTime(Date.now());
      });
    } catch (err) {
      toast.error("Failed to receive call");
      console.error(err);
    }
  };

  // End call handler
  const handleEndCall = () => {
    if (connection) {
      connection.disconnect();
    }
    setCallActive(false);
    setCallStartTime(null);
    setElapsed(0);
    setConnection(null);
    setIncomingCall(null);
  };

  return (
    <CallManagerContext.Provider value={{
      incomingCall,
      callActive,
      callStartTime,
      twilioDevice,
      connection,
      elapsed,
      handleReceiveCall,
      handleEndCall,
    }}>
      {/* Global Call UI */}
      {incomingCall && callActive && (
        <div style={{position: 'fixed', top: 80, right: 20, background: 'white', zIndex: 9999, padding: 16, borderRadius: 8, boxShadow: '0 0 8px #aaa'}}>
          <div>Call in progress with {incomingCall.from}</div>
          <div>⏱ {elapsed}s</div>
          <button style={{background: 'red', color: 'white', marginTop: 8}} onClick={handleEndCall}>End Call</button>
        </div>
      )}
      {children}
    </CallManagerContext.Provider>
  );
};

export const useCallManager = () => useContext(CallManagerContext);
