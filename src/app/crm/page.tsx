import { PartnerCRMDashboard } from "@/components/partner-crm-dashboard"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function CRMPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/login")
  }
  
  if (session.user.role !== "PARTNER") {
    redirect("/dashboard")
  }
  
  return (
    <div className="container mx-auto py-6">
      <PartnerCRMDashboard />
    </div>
  )
} 