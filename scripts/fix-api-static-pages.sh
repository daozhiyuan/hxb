#!/bin/bash

echo "开始修复动态 API 路由的静态页面..."

# 首先处理 /api/admin/customers/[customerId]
customerId_file="./src/app/api/admin/customers/[customerId]/page.tsx"
if [ -f "$customerId_file" ]; then
  echo "处理文件: $customerId_file"
  cat > "$customerId_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { customerId: '1' },
    { customerId: '2' },
    { customerId: '3' }
  ];
}

export default function ApiStaticPage({ params }: { params: { customerId: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/admin/customers/{params.customerId}
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $customerId_file"
fi

# 处理 /api/admin/customers/[customerId]/status
status_file="./src/app/api/admin/customers/[customerId]/status/page.tsx"
if [ -f "$status_file" ]; then
  echo "处理文件: $status_file"
  cat > "$status_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { customerId: '1' },
    { customerId: '2' },
    { customerId: '3' }
  ];
}

export default function ApiStatusPage({ params }: { params: { customerId: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/admin/customers/{params.customerId}/status
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $status_file"
fi

# 处理 /api/admin/users/[userId]/activate
userId_file="./src/app/api/admin/users/[userId]/activate/page.tsx"
if [ -f "$userId_file" ]; then
  echo "处理文件: $userId_file"
  cat > "$userId_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { userId: '1' },
    { userId: '2' },
    { userId: '3' }
  ];
}

export default function ApiActivatePage({ params }: { params: { userId: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/admin/users/{params.userId}/activate
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $userId_file"
fi

# 处理 /api/admin/partners/[partnerId]
partnerId_file="./src/app/api/admin/partners/[partnerId]/page.tsx"
if [ -f "$partnerId_file" ]; then
  echo "处理文件: $partnerId_file"
  cat > "$partnerId_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { partnerId: '1' },
    { partnerId: '2' },
    { partnerId: '3' }
  ];
}

export default function ApiPartnerPage({ params }: { params: { partnerId: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/admin/partners/{params.partnerId}
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $partnerId_file"
fi

echo "动态 API 路由静态页面修复完成！" 