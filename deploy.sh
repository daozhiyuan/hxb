#!/bin/bash
# 客户管理系统一键部署脚本
set -e

# 显示欢迎信息
echo "======================================================"
echo "        客户管理系统一键部署脚本"
echo "======================================================"
echo ""

# 检查Docker和Docker Compose是否安装
echo "检查依赖组件..."
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

echo "- Docker和Docker Compose已安装 ✓"

# 创建必要的目录
echo "创建必要的目录结构..."
mkdir -p ./backups ./logs ./public/uploads ./mysql-init
chmod -R 777 ./public/uploads ./logs ./backups

# 检查或创建.env文件
if [ ! -f .env ]; then
    echo "创建.env配置文件..."
    
    # 生成随机密码和密钥
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-16)
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
    NEXTAUTH_SECRET=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
    
    # 获取服务器IP地址
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # 创建.env文件
    cat > .env << EOF
# 数据库配置
MYSQL_ROOT_PASSWORD=$DB_PASSWORD
MYSQL_DATABASE=nextn

# 加密密钥（用于证件号码加密解密）
ENCRYPTION_KEY=$ENCRYPTION_KEY
# OLD_ENCRYPTION_KEY=

# NextAuth配置
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://$SERVER_IP:3005

# 系统配置
NODE_ENV=production
EOF

    echo "- .env文件创建成功 ✓"
    echo ""
    echo "⚠️  重要：系统已自动生成加密密钥。请备份.env文件，密钥丢失将导致无法解密数据！"
    echo ""
else
    echo "- 检测到现有.env文件，将使用已有配置 ✓"
fi

# 更新Docker配置文件中的环境变量
echo "更新Docker配置..."
if [ -f docker-compose.yml ]; then
    source .env
    # 使用sed替换docker-compose.yml中的环境变量
    sed -i "s/MYSQL_ROOT_PASSWORD=password/MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD/g" docker-compose.yml
    sed -i "s/your_32byte_strong_encryption_key_here/$ENCRYPTION_KEY/g" docker-compose.yml
    sed -i "s#NEXTAUTH_URL=http://localhost:3005#NEXTAUTH_URL=$NEXTAUTH_URL#g" docker-compose.yml
    sed -i "s/NEXTAUTH_SECRET=supersecretstring/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/g" docker-compose.yml
    
    # 更新docker-compose-mysql.yml
    sed -i "s/MYSQL_ROOT_PASSWORD=password/MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD/g" docker-compose-mysql.yml
    
    echo "- Docker配置更新完成 ✓"
else
    echo "错误: 未找到docker-compose.yml文件"
    exit 1
fi

# 添加启动脚本到mysql-init目录
echo "配置数据库初始化脚本..."
cat > ./mysql-init/01-init.sql << 'EOF'
-- 初始化脚本
-- 确保正确的字符集
ALTER DATABASE nextn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 设置安全选项
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
EOF

echo "- 数据库初始化脚本配置完成 ✓"

# 启动服务
echo ""
echo "开始部署服务..."
docker-compose down || true
docker-compose up -d

# 等待服务启动完成
echo "等待服务启动完成..."
attempt=0
max_attempts=30
until $(curl --output /dev/null --silent --head --fail http://localhost:3005/api/health); do
    attempt=$((attempt+1))
    if [ $attempt -gt $max_attempts ]; then
        echo "错误: 服务启动超时，请检查日志"
        echo "可以使用命令 'docker-compose logs app' 查看详细日志"
        exit 1
    fi
    printf '.'
    sleep 5
done

echo ""
echo "======================================================"
echo "        客户管理系统部署完成！"
echo "======================================================"
echo ""
echo "访问地址: http://$SERVER_IP:3005"
echo "默认超级管理员账号: admin@example.com"
echo "默认密码: adminpassword (请首次登录后立即修改)"
echo ""
echo "重要提示:"
echo "1. 您的加密密钥已保存在.env文件中，请妥善保管"
echo "2. 系统已配置每日自动备份，备份文件位于./backups目录"
echo "3. 更多管理命令请参考deployment-guide.md文档"
echo ""
echo "如需查看运行状态，请执行:"
echo "  docker-compose ps"
echo ""
echo "如需查看应用日志，请执行:"
echo "  docker-compose logs -f app"
echo ""
echo "谢谢使用！" 