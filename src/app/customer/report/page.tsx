
"use client";

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/hooks/use-toast';
import {CheckCustomerDuplicationInput, checkCustomerDuplication} from '@/ai/flows/check-customer-duplication';
import {Icons} from '@/components/icons';
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

export default function CustomerReportPage() {
  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [lastYearRevenue, setLastYearRevenue] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const {toast} = useToast();
    const [customerStatus, setCustomerStatus] = useState('FOLLOWING'); // Default status

  const handleCheckDuplication = async () => {
    setLoading(true);
    setIsDuplicate(null); // Reset previous check

    try {
      const input: CheckCustomerDuplicationInput = {idNumber: idNumber};
      const result = await checkCustomerDuplication(input);
      setIsDuplicate(result.isDuplicate);

      if (result.isDuplicate) {
        toast({
          title: '客户查重结果',
          description: '该客户已被报备，请检查或提交申诉。',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '客户查重结果',
          description: '该客户可以报备。',
        });
      }
    } catch (error: any) {
      console.error('客户查重失败', error);
      toast({
        title: '客户查重失败',
        description: error.message || '查重时发生错误，请重试。',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    if (isDuplicate === true) {
      toast({
        title: '无法提交',
        description: '客户已被报备，请提交申诉。',
        variant: 'destructive',
      });
      return;
    }

    // Simulate successful submission
    toast({
      title: '提交成功',
      description: '客户信息已成功提交!',
    });

    // Clear the form
    setIdNumber('');
    setName('');
    setCompanyName('');
    setLastYearRevenue('');
    setPhone('');
    setAddress('');
    setIsDuplicate(null);
      setCustomerStatus('FOLLOWING');
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>客户报备</CardTitle>
          <CardDescription>请填写客户的详细信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="idNumber">身份证号码</Label>
              <Input
                type="text"
                id="idNumber"
                placeholder="请输入身份证号码"
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                type="text"
                id="name"
                placeholder="请输入姓名"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="companyName">单位名称</Label>
              <Input
                type="text"
                id="companyName"
                placeholder="请输入单位名称"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastYearRevenue">去年营收</Label>
              <Input
                type="number"
                id="lastYearRevenue"
                placeholder="请输入去年营收"
                value={lastYearRevenue}
                onChange={e => setLastYearRevenue(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">电话号码</Label>
              <Input
                type="tel"
                id="phone"
                placeholder="请输入电话号码"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">联系地址</Label>
              <Textarea
                id="address"
                placeholder="请输入联系地址"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
              />
            </div>

              <div>
                  <Label>客户状态</Label>
                  <Select onValueChange={setCustomerStatus} defaultValue={customerStatus}>
                      <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="FOLLOWING">跟进中</SelectItem>
                          <SelectItem value="NEGOTIATING">洽谈中</SelectItem>
                          <SelectItem value="PENDING">待定</SelectItem>
                          <SelectItem value="SIGNED">已签约</SelectItem>
                          <SelectItem value="COMPLETED">已完成</SelectItem>
                          <SelectItem value="LOST">已流失</SelectItem>
                          <SelectItem value="OTHER">其他</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

            <Button type="button" variant="secondary" onClick={handleCheckDuplication} disabled={loading}>
              {loading ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  检查中...
                </>
              ) : (
                '检查客户是否重复'
              )}
            </Button>

            {isDuplicate !== null && (
              <div className="mt-4">
                {isDuplicate ? (
                  <div className="text-red-500">该客户已被报备，请提交申诉。</div>
                ) : (
                  <div className="text-green-500">该客户可以报备。</div>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading || isDuplicate === true}>
              提交报备
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
