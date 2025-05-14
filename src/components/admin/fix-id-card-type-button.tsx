'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function FixIdCardTypeButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFix = async () => {
    if (loading) return;
    
    setLoading(true);
    setSuccess(false);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/fix-id-card-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || '批量修复证件类型失败');
      }
      
      const data = await response.json();
      setResult(data.data);
      setSuccess(true);
      
      toast({
        title: '修复完成',
        description: `成功修复 ${data.data.totalFixed} 条记录 (客户: ${data.data.customersFixed}, 申诉: ${data.data.appealsFixed})`,
        variant: 'default',
      });
      
    } catch (error) {
      console.error('修复证件类型失败:', error);
      const message = error instanceof Error ? error.message : '未知错误';
      setError(message);
      
      toast({
        title: '修复失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-2">
      <Button 
        onClick={handleFix}
        disabled={loading}
        variant={success ? "outline" : "default"}
        className={success ? "bg-green-50 text-green-600 hover:bg-green-100 border-green-200" : ""}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {success && <Check className="mr-2 h-4 w-4" />}
        {error && <AlertTriangle className="mr-2 h-4 w-4" />}
        {success ? '修复完成' : (error ? '修复失败，重试' : '修复历史数据证件类型')}
      </Button>
      
      {success && result && (
        <div className="text-sm text-muted-foreground">
          成功修复 {result.totalFixed} 条记录 (客户: {result.customersFixed}, 申诉: {result.appealsFixed})
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-500">
          错误: {error}
        </div>
      )}
    </div>
  );
} 