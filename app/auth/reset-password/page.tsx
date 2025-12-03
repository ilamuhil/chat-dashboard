"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import supabase from "@/lib/supabase"
import { useState } from "react"
import { redirect } from "next/navigation"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setTimeout(() => {
        setError(null)
      }, 3000)
      return
    }
    else {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) {
        setError(error.message)
        setTimeout(() => {
          setError(null)
        }, 3000)
        return
      }
      if (data) {
        setSuccess("Password reset successful.You will now be redirected to the your dashboard in 3 seconds")
        setTimeout(() => {
          redirect("/auth/login")
        }, 3000)
        return
      }
    }
  }
  return (
    <div className="flex items-center justify-center h-dvh">
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your new password and confirm it
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" required onChange={(e) => setNewPassword(e.target.value)}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" required onChange={(e) => setConfirmPassword(e.target.value)}/>
              </div>
              {error && <div className="alert-danger">{error}</div>}
              {success && <div className="alert-success">{success}</div>}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" onClick={resetPassword}>
          Reset Password
        </Button>
      </CardFooter>
    </Card></div>
  )
}
