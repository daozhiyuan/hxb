#!/bin/bash

echo "开始将动态 API 路由转换为静态页面..."

# 查找所有动态 API 路由目录
find ./src/app -path "*api*" -type d | grep -E '\[' | while read dir; do
  # 移除旧的 route.ts 文件
  route_file="$dir/route.ts"
  if [ -f "$route_file" ]; then
    echo "处理目录: $dir"
    rm -f "$route_file" "$route_file.bak"
    
    # 创建静态页面文件
    page_file="$dir/page.tsx"
    cat > "$page_file" << EOL
export default function ApiStaticPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: ${dir#./src}
      </p>
    </div>
  );
}
EOL
    echo "- 已创建静态页面: $page_file"
  fi
done

echo "动态 API 路由转换完成！" 