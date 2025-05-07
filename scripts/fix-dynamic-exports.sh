#!/bin/bash

# 遍历所有 API 路由文件，确保 dynamic 只被导出一次
find ./src/app/api -name "route.ts" | while read file; do
  echo "处理文件: $file"
  
  # 统计 dynamic 导出的次数
  dynamic_count=$(grep -c "export const dynamic" "$file")
  
  if [ "$dynamic_count" -gt 1 ]; then
    echo "文件 $file 有 $dynamic_count 个 dynamic 导出，进行修复..."
    
    # 创建临时文件
    temp_file=$(mktemp)
    
    # 只保留第一个 dynamic 导出
    cat "$file" | awk '
      BEGIN { found = 0 }
      /export const dynamic/ {
        if (found == 0) {
          print;
          found = 1;
        } else {
          print "// " $0;  # 注释掉后面的 dynamic 导出
        }
        next;
      }
      { print }
    ' > "$temp_file"
    
    # 替换原文件
    mv "$temp_file" "$file"
  fi
done

echo "所有重复的 dynamic 导出已修复！" 