"use client"

import { useRouter } from "next/navigation"

export default function BotPage() {
  const router = useRouter()
  router.push("/dashboard/bot/interactions")
  return null
}