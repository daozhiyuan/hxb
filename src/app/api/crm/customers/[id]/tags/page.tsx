export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ApiTagsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/crm/customers/{params.id}/tags
      </p>
    </div>
  );
}
