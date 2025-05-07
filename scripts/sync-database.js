#!/usr/bin/env node

/**
 * 数据库同步脚本 - 解决数据库表与Prisma模型不匹配的问题
 * 
 * 此脚本可以通过以下方式运行:
 * node scripts/sync-database.js
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始数据库同步过程...');

// 检查是否有.env文件，如果没有则创建一个
const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('创建.env文件...');
  fs.writeFileSync(
    envPath,
    'DATABASE_URL="mysql://crmuser:crmpassword@localhost:3306/crm"\n'
  );
}

// 1. 执行prisma generate以确保客户端代码与模型匹配
console.log('正在生成Prisma客户端...');
const generateResult = spawnSync('npx', ['prisma', 'generate'], {
  stdio: 'inherit',
  shell: true
});

if (generateResult.status !== 0) {
  console.error('Prisma客户端生成失败！');
  process.exit(1);
}

// 2. 执行prisma db push以将模型变更应用到数据库
console.log('正在同步数据库结构...');
console.log('注意: 这将尝试更改数据库结构以匹配Prisma模型。');

const dbPushResult = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--accept-data-loss'],
  {
    stdio: 'inherit',
    shell: true
  }
);

if (dbPushResult.status !== 0) {
  console.error('数据库同步失败！');
  console.log('尝试使用强制重置选项...');
  
  console.log('警告: 这可能会导致数据丢失！');
  const forceResetResult = spawnSync(
    'npx',
    ['prisma', 'db', 'push', '--force-reset'],
    {
      stdio: 'inherit',
      shell: true
    }
  );
  
  if (forceResetResult.status !== 0) {
    console.error('强制重置数据库也失败！请手动检查数据库连接和结构。');
    process.exit(1);
  }
  
  console.log('数据库已强制重置并同步。');
} else {
  console.log('数据库同步成功！');
}

console.log('数据库同步过程完成。'); 