import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';

export default function AppealsPage() {
  const appeals = [
    {
      id: 1,
      customerName: '张三',
      idNumber: '440101199003077273',
      reason: '情况说明',
      status: '待处理',
    },
    {
      id: 2,
      customerName: '李四',
      idNumber: '440101199003077274',
      reason: '情况说明',
      status: '已处理',
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>申诉管理</CardTitle>
          <CardDescription>查看和管理您的申诉</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>合作伙伴申诉信息</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>客户姓名</TableHead>
                <TableHead>身份证号码</TableHead>
                <TableHead>申诉原因</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appeals.map(appeal => (
                <TableRow key={appeal.id}>
                  <TableCell className="font-medium">{appeal.id}</TableCell>
                  <TableCell>{appeal.customerName}</TableCell>
                  <TableCell>{appeal.idNumber}</TableCell>
                  <TableCell>{appeal.reason}</TableCell>
                  <TableCell>{appeal.status}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm">查看详情</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
