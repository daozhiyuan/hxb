#!/bin/bash

echo "修复根 API 路由路径问题..."

api_route_dir="./src/app/api/[...route]"
api_route_file="$api_route_dir/page.js"

# 删除原来的 route.ts 文件
rm -f "$api_route_dir/route.ts"
rm -f "$api_route_dir/route.ts.bak"

# 创建 page.js 文件，静态页面无需 generateStaticParams
mkdir -p "$api_route_dir"
cat > "$api_route_file" << EOL
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
EOL

echo "已创建静态 API 占位页面：$api_route_file"
echo "API 路由修复完成！" 