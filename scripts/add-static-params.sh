#!/bin/bash

# 直接列出特定的动态路由文件进行处理
echo "处理所有动态 API 路由文件..."

# 获取当前构建错误提示中的文件路径
find ./src/app -type f -name "route.ts" -path "*api*[*]*" | while read route_file; do
  echo "处理文件: $route_file"
  
  # 检查是否已包含 generateStaticParams 函数
  if ! grep -q "generateStaticParams" "$route_file"; then
    # 创建临时文件
    temp_file=$(mktemp)
    
    # 读取文件内容
    cat "$route_file" > "$temp_file"
    
    # 创建新文件，添加 generateStaticParams 函数在导入语句之后
    {
      # 首先提取导入语句
      grep "^import" "$temp_file"
      echo ""
      echo "// 为静态导出生成参数"
      echo "export function generateStaticParams() {"
      echo "  // 返回空数组，因为在静态导出中我们不会实际使用这些 API 路由"
      echo "  return [];"
      echo "}"
      echo ""
      # 添加其余内容，但不包括导入语句
      grep -v "^import" "$temp_file"
    } > "$route_file"
    
    echo "- 已添加 generateStaticParams 函数"
  fi
done

echo "所有动态 API 路由已更新完成！" 