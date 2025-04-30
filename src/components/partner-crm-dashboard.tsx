import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Users, Calendar, FileText, BarChart2, Settings } from "lucide-react"
import Link from "next/link"

export function PartnerCRMDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">CRM管理</h2>
        <Button asChild>
          <Link href="/crm/customers/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            新增客户
          </Link>
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">客户管理</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              总客户数
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">跟进记录</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              本月跟进次数
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">商机管理</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              进行中的商机
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近跟进</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">暂无跟进记录</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>待办事项</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">暂无待办事项</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 