#!/bin/bash

echo "开始处理动态 API 路由..."

# 查找所有包含 [...] 或 [id] 等模式的动态 API 路由
find ./src/app -path "*api*" -type d | grep -E '\[.*\]' | while read dir; do
  route_file="$dir/route.ts"
  
  if [ -f "$route_file" ]; then
    echo "重命名文件: $route_file"
    mv "$route_file" "${route_file}.bak"
    
    # 创建一个简单的空路由处理程序，以便构建能够通过
    cat > "$route_file" << EOL
// 静态导出的占位路由文件
// 原始文件已备份为 route.ts.bak
export function generateStaticParams() {
  return [];
}
EOL
    echo "- 已创建占位路由文件"
  fi
done

echo "动态 API 路由处理完成！" 