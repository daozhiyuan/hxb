#!/bin/bash

# 查找所有包含 generateStaticParams 的文件
find ./src/app -name "route.ts" -exec grep -l "generateStaticParams" {} \; | while read file; do
  echo "检查文件: $file"
  
  # 统计文件中 generateStaticParams 的出现次数
  count=$(grep -c "generateStaticParams" "$file")
  
  if [ "$count" -gt 1 ]; then
    echo "- 检测到重复的 generateStaticParams 函数，进行修复..."
    
    # 创建临时文件
    temp_file=$(mktemp)
    
    # 只保留第一个 generateStaticParams 函数，其余的删除
    awk '
      BEGIN { skip = 0; found = 0 }
      /export function generateStaticParams/ {
        if (found == 0) {
          found = 1;
          skip = 0;
          print;
        } else {
          skip = 1;
          next;
        }
      }
      /^}/ {
        if (skip == 1) {
          skip = 0;
          next;
        }
        print;
        next;
      }
      { if (skip == 0) print }
    ' "$file" > "$temp_file"
    
    # 替换原文件
    cp "$temp_file" "$file"
    rm "$temp_file"
    
    echo "- 已修复 $file"
  fi
done

echo "所有重复的 generateStaticParams 函数已修复！" 