"use client"

import { useRouter } from "next/navigation"

export default function UsersPage() { 
  const router = useRouter()
  router.push("/dashboard/users/conversations")
  return null
}