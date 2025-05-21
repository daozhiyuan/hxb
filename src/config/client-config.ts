// 客户端配置
export const API_BASE_URL = '/api';

// 客户状态枚举，必须与Prisma Schema中的customers_status保持一致
export const CustomerStatusEnum = {
  FOLLOWING: 'FOLLOWING',
  NEGOTIATING: 'NEGOTIATING',
  PENDING: 'PENDING',
  SIGNED: 'SIGNED',
  COMPLETED: 'COMPLETED',
  LOST: 'LOST'
} as const;

// 为了类型安全，也提供一个类型
export type CustomerStatus = typeof CustomerStatusEnum[keyof typeof CustomerStatusEnum];

// 客户状态的中文展示文本
export const CustomerStatusText = {
  FOLLOWING: '跟进中',
  NEGOTIATING: '洽谈中',
  PENDING: '待处理',
  SIGNED: '已签约',
  COMPLETED: '已完成',
  LOST: '已流失'
};

// 跟进类型枚举
export const FollowUpTypeEnum = {
  MEETING: 'MEETING',
  CALL: 'CALL',
  EMAIL: 'EMAIL',
  OTHER: 'OTHER'
} as const;

export type FollowUpType = typeof FollowUpTypeEnum[keyof typeof FollowUpTypeEnum];

// 跟进类型的中文文本
export const FollowUpTypeText = {
  MEETING: '会议',
  CALL: '电话',
  EMAIL: '邮件',
  OTHER: '其他'
}; 