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

# 等待服务启动完成（不依赖健康检查API）
echo "等待服务启动完成..."
SERVER_IP=$(hostname -I | awk '{print $1}')
attempt=0
max_attempts=20
echo "等待应用启动，这可能需要最多1-2分钟..."
sleep 30  # 先等待30秒，让容器有足够时间启动

# 检查服务状态
if docker-compose ps | grep "Up" | grep "app"; then
    echo "服务已成功启动 ✓"
else
    echo "警告：服务可能未正常启动，请检查日志"
    docker-compose logs app
fi

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
echo "3. 更多管理命令请参考客户管理系统部署指南.md文档"
echo ""
echo "如需查看运行状态，请执行:"
echo "  docker-compose ps"
echo ""
echo "如需查看应用日志，请执行:"
echo "  docker-compose logs -f app"
echo ""
echo "谢谢使用！"

# 证件号码解密功能修复后的Docker部署脚本
# 用法: ./deploy.sh [start|stop|restart|rebuild|status]

APP_DIR="/home/ubu-1/keyingbao"
LOG_FILE="$APP_DIR/docker.log"

# 打印彩色输出
print_info() {
  echo -e "\033[0;34m[信息]\033[0m $1"
}

print_success() {
  echo -e "\033[0;32m[成功]\033[0m $1"
}

print_warning() {
  echo -e "\033[0;33m[警告]\033[0m $1"
}

print_error() {
  echo -e "\033[0;31m[错误]\033[0m $1"
}

# 检查Docker和Docker Compose是否已安装
check_docker() {
  print_info "检查Docker环境..."
  
  if ! command -v docker &> /dev/null; then
    print_error "Docker未安装，请先安装Docker"
    exit 1
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose未安装，请先安装Docker Compose"
    exit 1
  fi
  
  print_success "Docker环境检查通过"
}

# 启动服务
start_service() {
  print_info "正在启动服务..."
  cd "$APP_DIR"
  
  # 检查配置文件
  if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml不存在"
    exit 1
  fi
  
  # 启动Docker容器
  docker-compose up -d
  
  if [ $? -eq 0 ]; then
    print_success "服务已成功启动"
    docker-compose ps
  else
    print_error "服务启动失败"
    exit 1
  fi
}

# 停止服务
stop_service() {
  print_info "正在停止服务..."
  cd "$APP_DIR"
  
  docker-compose down
  
  if [ $? -eq 0 ]; then
    print_success "服务已停止"
  else
    print_error "服务停止失败"
    exit 1
  fi
}

# 重启服务
restart_service() {
  print_info "正在重启服务..."
  cd "$APP_DIR"
  
  docker-compose restart
  
  if [ $? -eq 0 ]; then
    print_success "服务已重启"
    docker-compose ps
  else
    print_error "服务重启失败"
    exit 1
  fi
}

# 重新构建并启动
rebuild_service() {
  print_info "正在重新构建服务..."
  cd "$APP_DIR"
  
  # 停止并移除现有容器
  docker-compose down
  
  # 强制重新构建镜像
  docker-compose build --no-cache app
  
  # 启动服务
  docker-compose up -d
  
  if [ $? -eq 0 ]; then
    print_success "服务已重新构建并启动"
    docker-compose ps
  else
    print_error "服务重新构建失败"
    exit 1
  fi
}

# 显示状态
status_service() {
  print_info "服务状态:"
  cd "$APP_DIR"
  
  docker-compose ps
  
  # 检查应用健康状态
  APP_CONTAINER=$(docker-compose ps -q app)
  if [ -n "$APP_CONTAINER" ]; then
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $APP_CONTAINER 2>/dev/null)
    if [ -n "$HEALTH" ]; then
      print_info "应用健康状态: $HEALTH"
    fi
    
    # 显示容器日志（最后10行）
    print_info "最近日志:"
    docker-compose logs --tail=10 app
  else
    print_warning "应用容器未运行"
  fi
}

# 主函数
main() {
  # 检查Docker环境
  check_docker
  
  # 基于命令行参数执行操作
  case "$1" in
    start)
      start_service
      ;;
    stop)
      stop_service
      ;;
    restart)
      restart_service
      ;;
    rebuild)
      rebuild_service
      ;;
    status)
      status_service
      ;;
    *)
      echo "用法: $0 {start|stop|restart|rebuild|status}"
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@"

exit 0 