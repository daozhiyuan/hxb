#!/bin/bash

# 检查是否提供了备份文件参数
if [ -z "$1" ]; then
    echo "请指定要恢复的备份文件"
    echo "用法: ./restore.sh <备份文件路径>"
    exit 1
fi

BACKUP_FILE=$1

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "错误：备份文件 $BACKUP_FILE 不存在"
    exit 1
fi

# 从环境变量获取数据库连接信息
source .env

echo "开始恢复数据库..."
echo "警告：此操作将覆盖现有数据库数据！"
read -p "是否继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 1
fi

# 执行恢复
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
pg_restore -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') \
          -p $(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') \
          -U $(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p') \
          -d $(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p') \
          -v -c "$BACKUP_FILE"

# 检查恢复是否成功
if [ $? -eq 0 ]; then
    echo "数据库恢复成功"
else
    echo "数据库恢复失败"
    exit 1
fi 