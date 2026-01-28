"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BotPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/bot/interactions")
  }, [router])

  return null
}