# 客户管理系统

## 项目概述
这是一个基于 Next.js 开发的客户管理系统，主要用于管理客户信息、申诉处理等功能。系统采用现代化的技术栈，提供友好的用户界面和完整的功能支持。

## 主要功能
1. 客户管理
   - 客户信息录入
   - 客户查重功能
   - 客户状态跟踪
   - 客户列表查看

2. 申诉管理
   - 申诉提交
   - 申诉状态跟踪
   - 申诉详情查看
   - 申诉列表管理

3. 文件管理
   - 支持多种文件格式上传
   - 文件预览功能
   - 文件安全存储

## 技术栈
- 前端框架：Next.js 14
- UI 组件：shadcn/ui
- 数据库：PostgreSQL
- ORM：Prisma
- 认证：NextAuth.js
- 文件存储：本地文件系统

## 系统要求
- Node.js 18.0.0 或更高版本
- PostgreSQL 12.0 或更高版本
- npm 或 yarn 包管理器

## 安装部署
1. 克隆项目
```bash
git clone [项目地址]
cd [项目目录]
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 环境配置
创建 `.env` 文件并配置以下环境变量：
```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3005"
```

4. 数据库迁移
```bash
npx prisma migrate dev
```

5. 启动开发服务器
```bash
npm run dev
# 或
yarn dev
```

## 项目结构
```
├── src/
│   ├── app/                 # 应用主目录
│   │   ├── api/            # API 路由
│   │   ├── appeals/        # 申诉相关页面
│   │   └── crm/           # 客户管理相关页面
│   ├── components/         # 可复用组件
│   ├── lib/               # 工具函数和配置
│   └── types/             # TypeScript 类型定义
├── prisma/                # 数据库模型和迁移
├── public/               # 静态资源
└── uploads/             # 上传文件存储目录
```

## 主要功能模块

### 客户管理模块
- 支持客户基本信息录入
- 提供身份证号码查重功能
- 支持客户状态更新和跟踪
- 提供客户列表分页查询

### 申诉管理模块
- 支持申诉信息提交
- 提供申诉状态跟踪
- 支持申诉详情查看
- 提供申诉列表管理

### 文件管理模块
- 支持多种文件格式上传
- 提供文件预览功能
- 实现文件安全存储

## 安全特性
- 使用 NextAuth.js 进行身份认证
- 实现数据加密存储
- 提供文件上传安全控制
- 实现 API 访问权限控制

## 开发团队
- 前端开发
- 后端开发
- UI/UX 设计
- 测试团队

## 版本历史
- v1.0.0 - 初始版本
  - 基础客户管理功能
  - 申诉管理功能
  - 文件上传功能

## 贡献指南
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证
[许可证类型]

## 联系方式
[联系信息] 