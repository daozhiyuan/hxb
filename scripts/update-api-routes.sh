#!/bin/bash

# 遍历所有 API 路由文件，添加 dynamic = 'force-dynamic' 标记
find ./src/app/api -name "route.ts" | while read file; do
  # 检查文件是否已包含 dynamic 标记
  if ! grep -q "export const dynamic" "$file"; then
    # 在文件中添加 dynamic 标记
    echo "处理文件: $file"
    # 在导入语句后添加 dynamic 标记
    sed -i '/^import/!b;:a;n;/^import/ba;i\
// 告诉 Next.js 这个路由是动态的\
export const dynamic = '\''force-dynamic'\'';' "$file"
  fi
done

echo "所有 API 路由已更新完成！" 