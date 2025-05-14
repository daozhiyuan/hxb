import { Metadata } from 'next';
import { CardHeader, CardTitle, CardDescription, CardContent, Card } from '@/components/ui/card';
import { FixIdCardTypeButton } from '@/components/admin/fix-id-card-type-button';

export const metadata: Metadata = {
  title: '修复历史数据证件类型 | 管理系统',
  description: '批量修复历史数据中证件类型为空的记录',
};

export default function FixIdCardTypePage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">历史数据证件类型修复</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>批量修复证件类型</CardTitle>
            <CardDescription>
              将数据库中所有证件类型(idCardType)为NULL或空值的记录统一设置为"CHINA_MAINLAND"(中国大陆身份证)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                <h3 className="font-medium text-amber-800 mb-2">操作说明</h3>
                <ul className="text-sm text-amber-700 space-y-1 list-disc pl-5">
                  <li>此操作将批量修复数据库中的历史数据</li>
                  <li>修复范围包括客户表(customers)和申诉表(Appeal)</li>
                  <li>修复过程不可逆，建议在执行前备份数据库</li>
                  <li>执行完成后会显示修复记录的数量</li>
                </ul>
              </div>
              
              <FixIdCardTypeButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 