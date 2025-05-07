#!/bin/bash

# 设置变量
DB_NAME="crm"
DB_USER="crmuser"
DB_PASSWORD="crmpassword"
DB_HOST="localhost"
DB_PORT="3306"
BACKUP_DIR="database/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# 创建备份目录（如果不存在）
mkdir -p $BACKUP_DIR

# 执行备份
echo "开始备份数据库 $DB_NAME..."
MYSQL_PWD=$DB_PASSWORD mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER $DB_NAME > $BACKUP_FILE

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "数据库备份成功：$BACKUP_FILE"
    
    # 保留最近7天的备份
    find $BACKUP_DIR -name "backup_*.sql" -type f -mtime +7 -delete
    echo "已清理7天前的备份文件"
    
    # 提交到git
    git add $BACKUP_FILE
    git commit -m "数据库备份: $DATE"
    git push origin main
    
    echo "备份文件已同步到代码仓库"
else
    echo "数据库备份失败"
    exit 1
fi 