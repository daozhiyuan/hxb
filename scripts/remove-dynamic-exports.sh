#!/bin/bash

# 遍历所有 API 路由文件，删除 dynamic 导出语句
find ./src/app/api -name "route.ts" | while read file; do
  echo "处理文件: $file"
  
  # 检查文件是否包含 dynamic 导出
  if grep -q "export const dynamic" "$file"; then
    # 删除 dynamic 导出行
    sed -i '/export const dynamic/d' "$file"
    echo "- 已从 $file 中删除 dynamic 导出"
  fi
done

echo "所有 dynamic 导出语句已移除！" 