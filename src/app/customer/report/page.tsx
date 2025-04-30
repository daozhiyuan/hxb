"use client";

import { useState, FormEvent } from 'react'; // Import FormEvent
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomerReportPage() {
  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [lastYearRevenue, setLastYearRevenue] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  // Add state for jobTitle and notes if you add input fields for them
  // const [jobTitle, setJobTitle] = useState(''); 
  // const [notes, setNotes] = useState('');
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false); // For duplication check
  const [submitting, setSubmitting] = useState(false); // For form submission
  const { toast } = useToast();
  const [customerStatus, setCustomerStatus] = useState('FOLLOWING'); // Default status

  const handleCheckDuplication = async () => {
    if (!idNumber) {
       toast({
        title: '请输入身份证号码',
        description: '需要身份证号码才能进行查重。',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setIsDuplicate(null); // Reset previous check

    try {
      // Assuming checkCustomerDuplication makes an API call to check duplication
      // If it doesn't, this logic needs adjustment.
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
  
    // 验证必填字段
    if (!name || !idNumber || !phone || !address) {
      toast({
        title: '表单不完整',
        description: '请填写所有必填字段（姓名、身份证号码、电话号码和联系地址）。',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }
  
    // 确保已进行查重检查且客户不是重复的
    if (isDuplicate === true) {
      toast({
        title: '无法提交',
        description: '该客户已被报备，请提交申诉。',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }
    if (isDuplicate === null) {
      toast({
        title: '无法提交',
        description: '请先执行客户查重操作。',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }
  
    const customerData = {
      name,
      idCardNumber: idNumber,
      companyName: companyName || null, // Send null if empty
      lastYearRevenue: lastYearRevenue ? parseFloat(lastYearRevenue) : null,
      phone: phone || null, // Send null if empty
      address: address || null, // Send null if empty
      status: customerStatus,
      // Add jobTitle and notes here if you have input fields for them
      // jobTitle: jobTitle || null,
      // notes: notes || null,
    };

    try {
      const response = await fetch('/api/customers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const result = await response.json(); // Try to parse JSON regardless of status

      if (!response.ok) {
        // Handle API errors (like unauthorized, validation errors, conflict, etc.)
        throw new Error(result.message || `服务器错误: ${response.statusText} (${response.status})`);
      }

      // Submission successful
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
      // Clear other fields like jobTitle, notes if added
      // setJobTitle('');
      // setNotes('');

    } catch (error: any) {
      console.error('提交报备失败', error);
      toast({
        title: '提交失败',
        // Display specific error from API if available, otherwise generic message
        description: error.message || '提交客户信息时发生错误，请重试。',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false); // End submission loading state
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>客户报备</CardTitle>
          <CardDescription>请填写客户的详细信息。提交前请先检查客户是否重复。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="idNumber">身份证号码 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="idNumber"
                placeholder="请输入身份证号码 (用于查重和注册)"
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div>
              <Label htmlFor="name">姓名 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="name"
                placeholder="请输入姓名"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div>
              <Label htmlFor="companyName">单位名称</Label>
              <Input
                type="text"
                id="companyName"
                placeholder="请输入单位名称 (可选)"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastYearRevenue">去年营收 (元)</Label>
              <Input
                type="number"
                id="lastYearRevenue"
                placeholder="请输入去年营收 (可选)"
                value={lastYearRevenue}
                onChange={e => setLastYearRevenue(e.target.value)}
                min="0" // Prevent negative numbers
                step="any" // Allow decimals
              />
            </div>
            <div>
              <Label htmlFor="phone">电话号码 <span className="text-red-500">*</span></Label>
              <Input
                type="tel"
                id="phone"
                placeholder="请输入电话号码"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div>
              <Label htmlFor="address">联系地址 <span className="text-red-500">*</span></Label>
              <Textarea
                id="address"
                placeholder="请输入联系地址"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            {/* Add inputs for jobTitle and notes here if needed */}
            {/* Example:
            <div>
              <Label htmlFor="jobTitle">职位</Label>
              <Input type="text" id="jobTitle" placeholder="请输入职位 (可选)" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">备注</Label>
              <Textarea id="notes" placeholder="请输入备注 (可选)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            */}
            <div>
                <Label>客户状态 <span className="text-red-500">*</span></Label>
                <Select onValueChange={setCustomerStatus} defaultValue={customerStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
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

            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 pt-2">
              <Button type="button" variant="secondary" onClick={handleCheckDuplication} disabled={loading || submitting || !idNumber} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                    检查中...
                  </>
                ) : (
                  '1. 检查客户是否重复'
                )}
              </Button>

              <Button type="submit" disabled={loading || submitting || isDuplicate === true || isDuplicate === null} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '2. 提交报备'
                )}
              </Button>
             </div>

            {isDuplicate !== null && (
              <div className="mt-4 text-sm">
                {isDuplicate ? (
                  <p className="text-red-600 font-semibold">⚠ 该客户已被报备，无法提交。如需申诉请联系管理员。</p>
                ) : (
                  <p className="text-green-600 font-semibold">✅ 该客户可以报备，请填写完整信息后提交。</p>
                )}
              </div>
            )}

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
