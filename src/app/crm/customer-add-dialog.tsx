import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const CustomerAddDialog: React.FC = () => {
  const [session, setSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [appealData, setAppealData] = useState({
    evidence: [],
  });

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请先登录',
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('提交申诉数据:', appealData);

      // 上传文件
      const evidenceUrls = [];
      for (const file of appealData.evidence) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) {
          throw new Error('文件上传失败');
        }
        const { url } = await uploadResponse.json();
        evidenceUrls.push(url);
      }

      // 提交申诉
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...appealData,
          evidence: evidenceUrls,
        }),
      });

      const result = await response.json();
      console.log('申诉提交响应:', result);

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('该身份证号码已存在申诉记录，请勿重复提交');
        }
        throw new Error(result.details || '创建申诉失败');
      }

      toast({
        title: '成功',
        description: '申诉已提交',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('申诉提交错误:', error);
      toast({
        variant: 'destructive',
        title: '错误',
        description: error instanceof Error ? error.message : '提交申诉失败',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Render your form here */}
    </div>
  );
};

export default CustomerAddDialog; 