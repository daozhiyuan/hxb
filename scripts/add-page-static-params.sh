#!/bin/bash

echo "开始为动态路径静态页面添加 generateStaticParams 函数..."

# 查找所有动态路径的静态页面
find ./src/app -path "*api*" -name "page.tsx" | grep -E '\[' | while read page_file; do
  echo "处理文件: $page_file"
  
  # 检查是否已包含 generateStaticParams 函数
  if ! grep -q "generateStaticParams" "$page_file"; then
    # 创建临时文件
    temp_file=$(mktemp)
    
    # 读取页面内容
    cat "$page_file" > "$temp_file"
    
    # 创建新页面，添加 generateStaticParams 函数
    {
      echo "export function generateStaticParams() {"
      echo "  // 返回静态生成的参数"
      echo "  return [{}];"
      echo "}"
      echo ""
      cat "$temp_file"
    } > "$page_file"
    
    # 清理临时文件
    rm "$temp_file"
    
    echo "- 已添加 generateStaticParams 函数"
  else
    echo "- 已存在 generateStaticParams 函数"
  fi
done

echo "静态页面参数生成函数添加完成！" 