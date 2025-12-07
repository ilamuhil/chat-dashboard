import { redirect } from "next/navigation"

export default function DashboardPage() {
  // Redirect to overview by default
  redirect("/dashboard/overview")
}
