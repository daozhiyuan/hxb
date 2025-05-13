#!/bin/sh
set -e

echo "=== 客户管理系统启动脚本 ==="

# 创建健康检查API路由
mkdir -p /app/pages/api
cat > /app/pages/api/health.js << 'EOF'
export default function handler(req, res) {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
}
EOF

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

# 检查是否需要初始化种子数据
echo "检查是否需要初始化种子数据..."
SEED_COUNT=$(mysql -h db -u root -ppassword -D nextn -N -e "SELECT COUNT(*) FROM User" 2>/dev/null || echo "0")
if [ "$SEED_COUNT" = "0" ]; then
  echo "未检测到初始用户数据，开始初始化种子数据..."
  npx prisma db seed
  echo "种子数据初始化完成！"
else
  echo "已存在用户数据，跳过种子数据初始化。"
fi

# 检查环境变量
if [ -z "$ENCRYPTION_KEY" ]; then
  echo "警告: ENCRYPTION_KEY 环境变量未设置。敏感数据加密功能可能无法正常工作。"
fi

# 创建上传目录（如果不存在）
mkdir -p /app/public/uploads
chmod 777 /app/public/uploads

# 创建日志目录（如果不存在）
mkdir -p /app/logs
chmod 777 /app/logs

# 输出启动信息
echo "=============================================="
echo "客户管理系统正在启动，端口: 3005"
echo "数据库连接: 已就绪"
echo "证件号码解密功能: $([ -n "$ENCRYPTION_KEY" ] && echo "已启用" || echo "未配置密钥")"
echo "文件上传功能: 已就绪"
echo "=============================================="

# 运行应用
echo "正在启动 Next.js 应用..."
exec node server.js 