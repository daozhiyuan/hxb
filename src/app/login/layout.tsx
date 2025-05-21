// 添加动态页面配置
export const dynamic = 'force-dynamic'; // 强制动态渲染
export const fetchCache = 'force-no-store'; // 禁用页面响应缓存
export const revalidate = 0; // 不进行重新验证
export const dynamicParams = true; // 动态参数

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 