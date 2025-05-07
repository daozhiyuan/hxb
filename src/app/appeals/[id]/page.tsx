// 服务器组件用于生成静态参数
// 在静态导出模式下为动态路由生成的参数
// 这告诉 Next.js 在构建时生成这些路径
export async function generateStaticParams() {
  // 在静态导出中，我们预先生成一些常见ID的页面
  // 实际应用中，这应该从数据库获取，但这里为了静态导出，仅提供一些示例ID
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
}

// 客户端组件放在单独的文件中
import AppealDetail from './appeal-detail';

export default function AppealPage({ params }: { params: { id: string } }) {
  return <AppealDetail params={params} />;
}