"use client"

import { Phone, FileText, Settings ,Home,MessageCircle} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { removeAuthToken } from "@/utils/auth"
import { useSocket } from "@/hooks/use-socket"

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const tabs = [
    { id: "phone", label: "Phone", icon: Phone },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "settings", label: "Settings", icon: Home },
    { id: "bulk-call", label: "Bulk Call", icon: FileText }, // Assuming you have a BulkCallTab component
    {id:"message", label: "Message", icon: MessageCircle } // Assuming you have a Message component
  ]
  const router = useRouter()
  const socket = useSocket()

  const handleLogout = () => {
    removeAuthToken()
    if (socket) {
      socket.disconnect()
    }
    router.push("/")
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around items-center py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className="flex flex-col items-center gap-1 h-auto py-2 px-4"
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
            </Button>
          )
        })}
        <Button
          variant="destructive"
          className="flex flex-col items-center gap-1 h-auto py-2 px-4"
          onClick={handleLogout}
        >
          <span className="text-xs">Logout</span>
        </Button>
      </div>
    </div>
  )
}
