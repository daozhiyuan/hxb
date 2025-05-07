#!/bin/bash

# 遍历所有 API 路由文件，删除 'use server' 指令
find ./src/app/api -name "route.ts" | while read file; do
  echo "处理文件: $file"
  # 移除 'use server' 指令和注释
  sed -i "s/'use server'[^;]*;//" "$file"
  sed -i 's/"use server"[^;]*;//' "$file"
done

echo "所有 API 路由文件已修复！" 