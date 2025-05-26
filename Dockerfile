FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置环境变量
ENV NEXTAUTH_URL=https://bb.keti.eu.org
ENV NEXT_PUBLIC_APP_URL=https://bb.keti.eu.org

# 生成 Prisma Client (确保在构建前完成)
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产环境镜像
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXTAUTH_URL=https://bb.keti.eu.org
ENV NEXT_PUBLIC_APP_URL=https://bb.keti.eu.org

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "server.js"] 