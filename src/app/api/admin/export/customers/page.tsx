// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function ApiStaticPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">客户数据导出 API</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/admin/export/customers
      </p>
    </div>
  );
}
