import { z } from 'zod';
import { AppealStatus } from '@prisma/client';

// 申诉状态更新验证模式
export const updateAppealSchema = z.object({
  status: z.nativeEnum(AppealStatus, {
    required_error: '请选择申诉状态',
    invalid_type_error: '无效的申诉状态',
  }),
  remarks: z.string({
    required_error: '请填写处理备注',
  }).min(2, {
    message: '处理备注不能少于2个字符',
  }).max(500, {
    message: '处理备注不能超过500个字符',
  }),
});

// 验证客户查重
export const customerDuplicateCheckSchema = z.object({
  name: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

// 其他验证模式可以在这里添加... 