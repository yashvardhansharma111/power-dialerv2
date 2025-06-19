import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "success" | "destructive"

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export const toast = ({
  title,
  description = "",
  variant = "default",
  duration = 4000,
}: ToastOptions) => {
  sonnerToast(title, {
    description,
    duration,
    className:
      variant === "destructive"
        ? "bg-red-600 text-white"
        : variant === "success"
        ? "bg-green-600 text-white"
        : "",
  })
}
