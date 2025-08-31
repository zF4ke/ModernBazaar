"use client"

import { useUserSetup } from "@/hooks/use-user-setup"

interface UserSetupWrapperProps {
  children: React.ReactNode
}

export function UserSetupWrapper({ children }: UserSetupWrapperProps) {
  // Automatically ensure new users are set up - runs once per session
  useUserSetup()

  return <>{children}</>
}
