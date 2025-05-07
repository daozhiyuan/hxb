#!/bin/bash

# 设置备份目录
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# 创建备份目录（如果不存在）
mkdir -p $BACKUP_DIR

# 从环境变量获取数据库连接信息
source .env

# 执行备份
echo "开始备份数据库..."
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
pg_dump -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') \
        -p $(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') \
        -U $(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p') \
        -d $(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p') \
        -F c -b -v -f "$BACKUP_FILE"

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "数据库备份成功：$BACKUP_FILE"
    # 压缩备份文件
    gzip "$BACKUP_FILE"
    echo "备份文件已压缩：${BACKUP_FILE}.gz"
else
    echo "数据库备份失败"
    exit 1
fi

# 保留最近7天的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete 