export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("jwt")
  }
  return null
}

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("jwt", token)
  }
}

export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("jwt")
  }
}

export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null
}
