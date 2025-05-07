#!/bin/bash

echo "开始修复剩余的动态 API 路由静态页面..."

# 处理 /api/appeals/[id]
appeals_file="./src/app/api/appeals/[id]/page.tsx"
if [ -f "$appeals_file" ]; then
  echo "处理文件: $appeals_file"
  cat > "$appeals_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ApiAppealsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/appeals/{params.id}
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $appeals_file"
fi

# 处理 /api/appeals/[id]/status
appeals_status_file="./src/app/api/appeals/[id]/status/page.tsx"
if [ -f "$appeals_status_file" ]; then
  echo "处理文件: $appeals_status_file"
  cat > "$appeals_status_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ApiAppealsStatusPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/appeals/{params.id}/status
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $appeals_status_file"
fi

# 处理 /api/crm/customers/[id]
crm_customers_file="./src/app/api/crm/customers/[id]/page.tsx"
if [ -f "$crm_customers_file" ]; then
  echo "处理文件: $crm_customers_file"
  cat > "$crm_customers_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ApiCrmCustomersPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/crm/customers/{params.id}
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $crm_customers_file"
fi

# 处理 /api/crm/customers/[id]/follow-ups
follow_ups_file="./src/app/api/crm/customers/[id]/follow-ups/page.tsx"
if [ -f "$follow_ups_file" ]; then
  echo "处理文件: $follow_ups_file"
  cat > "$follow_ups_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ApiFollowUpsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/crm/customers/{params.id}/follow-ups
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $follow_ups_file"
fi

# 处理 /api/crm/customers/[id]/tags
tags_file="./src/app/api/crm/customers/[id]/tags/page.tsx"
if [ -f "$tags_file" ]; then
  echo "处理文件: $tags_file"
  cat > "$tags_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function ApiTagsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/crm/customers/{params.id}/tags
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $tags_file"
fi

# 处理 /api/crm/customers/[id]/tags/[tagId]
tagid_file="./src/app/api/crm/customers/[id]/tags/[tagId]/page.tsx"
if [ -f "$tagid_file" ]; then
  echo "处理文件: $tagid_file"
  cat > "$tagid_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { id: '1', tagId: '1' },
    { id: '1', tagId: '2' },
    { id: '2', tagId: '1' }
  ];
}

export default function ApiTagIdPage({ params }: { params: { id: string, tagId: string } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/crm/customers/{params.id}/tags/{params.tagId}
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $tagid_file"
fi

# 处理 /api/auth/[...nextauth]
nextauth_file="./src/app/api/auth/[...nextauth]/page.tsx"
if [ -f "$nextauth_file" ]; then
  echo "处理文件: $nextauth_file"
  cat > "$nextauth_file" << EOL
export function generateStaticParams() {
  // 返回静态生成的参数
  return [
    { nextauth: ['session'] },
    { nextauth: ['signin'] },
    { nextauth: ['callback'] }
  ];
}

export default function ApiNextAuthPage({ params }: { params: { nextauth: string[] } }) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">API 静态页面</h1>
      <p className="mb-4">
        这是一个 API 路由的静态占位页面。在静态导出模式下，API 路由不可用。
      </p>
      <p className="text-sm text-gray-500">
        路径: /app/api/auth/{params.nextauth.join('/')}
      </p>
    </div>
  );
}
EOL
  echo "- 已修复 $nextauth_file"
fi

echo "所有剩余的动态 API 路由静态页面修复完成！" 