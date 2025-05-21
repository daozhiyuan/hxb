#!/bin/sh
set -e

echo "=== 客户管理系统启动脚本 ==="

# 等待数据库连接
echo "正在等待数据库连接..."
max_retries=30
count=0
while ! wget -q -O- http://db:3306 >/dev/null 2>&1; do
  count=$((count + 1))
  if [ $count -ge $max_retries ]; then
    echo "数据库连接超时，请检查数据库服务是否正常运行。"
    exit 1
  fi
  echo "尝试第 $count/$max_retries 次连接数据库..."
  sleep 2
done
echo "数据库连接成功！"

# 应用数据库迁移
echo "正在应用数据库迁移..."
npx prisma migrate deploy

# 输出启动信息
echo "=============================================="
echo "客户管理系统正在启动，端口: 3005"
echo "数据库连接: 已就绪"
echo "=============================================="

# 运行应用
echo "正在启动 Next.js 应用..."
exec node server.js 