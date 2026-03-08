#!/bin/bash
# HXB Docker deployment helper
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_CMD="docker compose"
SERVICE_WEB="web"
SERVICE_DB="db"
PUBLIC_PORT="3000"

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

check_dependencies() {
  print_info "检查 Docker / Compose 环境..."

  if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker 未安装，请先安装 Docker"
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose 插件不可用，请先安装/启用 docker compose"
    exit 1
  fi

  print_success "Docker 环境检查通过"
}

prepare_dirs() {
  print_info "准备运行目录..."
  mkdir -p "$APP_DIR/backups" "$APP_DIR/logs" "$APP_DIR/public/uploads" "$APP_DIR/mysql-init"
  chmod -R 777 "$APP_DIR/public/uploads" "$APP_DIR/logs" "$APP_DIR/backups"
}

prepare_mysql_init() {
  if [ ! -f "$APP_DIR/mysql-init/01-init.sql" ]; then
    print_info "生成 mysql-init/01-init.sql ..."
    cat > "$APP_DIR/mysql-init/01-init.sql" <<'EOF'
-- 初始化脚本
ALTER DATABASE hxb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
EOF
  fi
}

compose() {
  cd "$APP_DIR"
  $COMPOSE_CMD "$@"
}

wait_for_web() {
  local max_attempts=30
  local attempt=1
  print_info "等待 Web 服务健康响应..."

  while [ $attempt -le $max_attempts ]; do
    if curl -fsS "http://127.0.0.1:${PUBLIC_PORT}/api/health" >/dev/null 2>&1; then
      print_success "Web 服务健康检查通过"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  print_warning "未在预期时间内收到 /api/health 成功响应"
  return 1
}

show_status() {
  compose ps
  echo
  print_info "最近 ${SERVICE_WEB} 日志:"
  compose logs --tail=20 "$SERVICE_WEB" || true
}

start_service() {
  print_info "启动服务..."
  prepare_dirs
  prepare_mysql_init
  compose up -d
  wait_for_web || true
  show_status
}

stop_service() {
  print_info "停止服务..."
  compose down
  print_success "服务已停止"
}

restart_service() {
  print_info "重启服务..."
  compose restart "$SERVICE_DB" "$SERVICE_WEB"
  wait_for_web || true
  show_status
}

rebuild_service() {
  print_info "重新构建并启动服务..."
  prepare_dirs
  prepare_mysql_init
  compose down
  compose build --no-cache "$SERVICE_WEB"
  compose up -d
  wait_for_web || true
  show_status
}

status_service() {
  print_info "查看服务状态..."
  show_status
}

main() {
  check_dependencies

  case "${1:-}" in
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

main "$@"
