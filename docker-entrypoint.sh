#!/bin/sh
set -e

echo "=== HXB container entrypoint ==="

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-hxb}"
MAX_RETRIES="${DB_WAIT_RETRIES:-60}"
SEED_ON_EMPTY_DB="${SEED_ON_EMPTY_DB:-true}"
MYSQL_ARGS="--protocol=tcp --skip-ssl -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD}"

if [ ! -f /app/keys/public.pem ] || [ ! -f /app/keys/private.pem ]; then
  echo "RSA keys 缺失，使用内联 Node 逻辑生成新的密钥对..."
  mkdir -p /app/keys /app/.next/standalone/keys
  node -e '
    const fs = require("fs");
    const crypto = require("crypto");
    const path = require("path");
    const dir = "/app/keys";
    const standaloneDir = "/app/.next/standalone/keys";
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(standaloneDir, { recursive: true });
    const pub = path.join(dir, "public.pem");
    const priv = path.join(dir, "private.pem");
    if (!fs.existsSync(pub) || !fs.existsSync(priv)) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      });
      fs.writeFileSync(pub, publicKey);
      fs.writeFileSync(priv, privateKey);
    }
    fs.copyFileSync(path.join(dir, "public.pem"), path.join(standaloneDir, "public.pem"));
    fs.copyFileSync(path.join(dir, "private.pem"), path.join(standaloneDir, "private.pem"));
    console.log("RSA keys ready.");
  '
else
  echo "RSA keys 已存在，确保 standalone 路径也可见。"
  mkdir -p /app/.next/standalone/keys
  cp /app/keys/public.pem /app/.next/standalone/keys/public.pem
  cp /app/keys/private.pem /app/.next/standalone/keys/private.pem
fi

count=0
until mariadb-admin ping ${MYSQL_ARGS} --silent; do
  count=$((count + 1))
  if [ "$count" -ge "$MAX_RETRIES" ]; then
    echo "数据库连接超时，请检查数据库服务是否正常运行。"
    exit 1
  fi
  echo "等待数据库就绪 ($count/$MAX_RETRIES) ..."
  sleep 2
done

echo "数据库连接成功，开始执行 Prisma 迁移..."
npx prisma migrate deploy

USER_TABLE_EXISTS=$(mariadb ${MYSQL_ARGS} -N -s "${DB_NAME}" \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='users';")

if [ "$SEED_ON_EMPTY_DB" = "true" ] && [ "$USER_TABLE_EXISTS" = "1" ]; then
  USER_COUNT=$(mariadb ${MYSQL_ARGS} -N -s "${DB_NAME}" -e "SELECT COUNT(*) FROM users;")
  if [ "${USER_COUNT:-0}" = "0" ]; then
    echo "检测到 users 表为空，执行种子数据初始化..."
    npm run db:seed
  else
    echo "users 表已有数据，跳过 seed。"
  fi
else
  echo "未启用 seed 或 users 表尚不存在，跳过 seed。"
fi

echo "启动应用..."
exec node .next/standalone/server.js
