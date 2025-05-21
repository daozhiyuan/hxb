# 客户管理系统

## 项目概述
基于 Next.js 14 开发的现代化客户管理系统，提供完整的客户信息管理、申诉处理、文件管理等功能。采用 RSA+AES-GCM 混合加密方案保护敏感数据。

## 核心功能
1. 客户管理
   - 客户信息录入与更新
   - 身份证号码查重（支持多种证件类型）
   - 客户状态跟踪
   - 高级搜索与筛选

2. 申诉管理
   - 申诉信息提交
   - 申诉状态跟踪
   - 申诉详情查看
   - 批量处理功能

3. 文件管理
   - 多格式文件上传
   - 文件预览
   - 安全存储与访问控制

## 技术架构
- **前端**：Next.js 14 + React 18 + Tailwind CSS
- **后端**：Node.js + Prisma ORM
- **数据库**：MySQL 8+
- **认证**：NextAuth.js
- **加密**：RSA-2048 + AES-256-GCM
- **部署**：Docker + PM2

## 快速开始

### 环境要求
- Node.js 18+
- MySQL 8+
- Docker（可选）

### 安装步骤
1. 克隆项目
```bash
git clone [项目地址]
cd [项目目录]
```

2. 安装依赖
```bash
npm install
```

3. 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

4. 生成密钥
```bash
node scripts/generate-keys.cjs
```

5. 数据库迁移
```bash
npx prisma migrate deploy
```

6. 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm run build
npm start
```

## 项目结构
```
├── src/
│   ├── app/                # 应用主目录
│   │   ├── api/           # API 路由
│   │   ├── appeals/       # 申诉相关页面
│   │   └── crm/          # 客户管理页面
│   ├── components/        # 可复用组件
│   ├── lib/              # 工具函数
│   └── types/            # TypeScript 类型
├── prisma/               # 数据库模型
├── scripts/             # 维护脚本
├── public/             # 静态资源
└── uploads/           # 文件存储
```

## 安全特性
- RSA+AES-GCM 混合加密
- 完整的权限控制
- 数据访问审计
- 防SQL注入
- XSS防护

## 维护与支持
- 详细文档：`客户管理系统部署指南.md`
- 脚本说明：`scripts/README.md`
- 技术支持：support@example.com

## 版本历史
- v1.0.0 (2024-05-14)
  - 统一加密方案
  - 完善数据安全
  - 优化用户体验

## 许可证
[许可证类型] 