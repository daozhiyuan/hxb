#!/bin/bash

echo "开始为所有问题 API 路由创建静态页面..."

# 函数：为指定路径创建静态页面
create_api_page() {
  local dir="$1"
  local title="${2:-API 静态页面}"
  
  # 确保目录存在
  mkdir -p "$dir"
  
  # 创建静态页面文件
  local page_file="$dir/page.tsx"
  local path_display="${dir#./src}"
  
  cat > "$page_file" << EOL
export default function ApiStaticPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">${title}</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: ${path_display}
      </p>
    </div>
  );
}
EOL
  
  echo "- 已创建静态页面: $page_file"
}

# 处理特定报错的 API 路由
create_api_page "./src/app/api/admin/users/pending" "用户审核 API"
create_api_page "./src/app/api/admin/export/customers" "客户数据导出 API"
create_api_page "./src/app/api/admin/export/partners" "合作伙伴数据导出 API"
create_api_page "./src/app/api/admin/customers" "管理员客户列表 API"
create_api_page "./src/app/api/customers" "客户列表 API"

echo "所有问题 API 路由的静态页面创建完成！" 