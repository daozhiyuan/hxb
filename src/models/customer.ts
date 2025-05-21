import { z } from 'zod';

// 客户信息验证模式
export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, '姓名至少2个字符'),
  idNumber: z.string().regex(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/, '无效的身份证号码'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '无效的手机号码'),
  address: z.string().min(5, '地址至少5个字符'),
  partnerId: z.string(),
  position: z.string().max(100, '职位最多100个字符').optional(),
  followUpStatus: z.string().max(50, '跟进状态最多50个字符').optional(),
  lastFollowUpAt: z.date().optional(),
  logs: z.any().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// 申诉信息验证模式
export const appealSchema = z.object({
  id: z.string().optional(),
  customerId: z.string(),
  partnerId: z.number(),
  reason: z.string().min(10, '申诉原因至少10个字符'),
  evidence: z.array(z.string()).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  adminComment: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Customer = z.infer<typeof customerSchema>;
export type Appeal = z.infer<typeof appealSchema>;