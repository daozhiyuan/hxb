// 全局应用配置
export const dynamic = 'force-dynamic'; // 强制使用动态渲染，禁用静态预渲染
export const dynamicParams = true; // 动态参数
export const revalidate = 0; // 禁用缓存
export const fetchCache = 'force-no-store'; // 禁用获取缓存
export const runtime = 'nodejs'; // Node.js 运行时
export const preferredRegion = 'auto'; // 自动选择区域

// 客户状态配置
export enum CustomerStatusEnum {
  FOLLOWING = 'FOLLOWING',
  NEGOTIATING = 'NEGOTIATING',
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  COMPLETED = 'COMPLETED',
  LOST = 'LOST'
}

// 申诉状态配置 
export enum AppealStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  REJECTED = 'rejected'
} 