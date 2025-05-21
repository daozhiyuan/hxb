export function generateStaticParams() {
  // 返回空数组作为静态参数
  return [{ route: ['default'] }];
}

export default function ApiCatchAllPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 端点</h1>
      <p className="mb-4">
        这是一个 API 路由的占位页面。在静态导出模式下，API 路由不会被执行。
      </p>
      <p className="text-sm text-gray-500">
        此页面仅用于解决静态构建问题。
      </p>
    </div>
  );
}
