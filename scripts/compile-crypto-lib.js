#!/usr/bin/env node

/**
 * 编译加密库脚本
 * 
 * 此脚本使用 TypeScript 编译器 API 编译 decryptIdCard.ts 和相关文件，
 * 将结果输出到 dist/lib 目录，供修复脚本使用。
 * 
 * 用法: node scripts/compile-crypto-lib.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保 dist 目录存在
const distDir = path.join(__dirname, '../dist');
const libDir = path.join(distDir, 'lib');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log(`创建目录: ${distDir}`);
}

if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir);
  console.log(`创建目录: ${libDir}`);
}

console.log('开始编译加密库...');
console.log(`当前工作目录: ${process.cwd()}`);
console.log(`查找 tsconfig.scripts.json...`);

// 检查配置文件是否存在
const tsconfigPath = path.join(__dirname, '../tsconfig.scripts.json');
if (fs.existsSync(tsconfigPath)) {
  console.log(`找到配置文件: ${tsconfigPath}`);
  console.log(`配置文件内容:\n${fs.readFileSync(tsconfigPath, 'utf8')}`);
} else {
  console.error(`❌ 找不到配置文件: ${tsconfigPath}`);
  process.exit(1);
}

try {
  // 使用特定的 tsconfig 运行 tsc，启用详细输出
  console.log('执行命令: npx tsc -p tsconfig.scripts.json --listFiles');
  execSync('npx tsc -p tsconfig.scripts.json --listFiles', { stdio: 'inherit' });
  console.log('✅ 编译成功! JavaScript 文件应该已生成到 dist/lib 目录');
  
  // 列出生成的文件
  console.log('检查生成的文件:');
  const generatedFiles = fs.readdirSync(libDir);
  
  if (generatedFiles.length === 0) {
    console.log('⚠️ 警告：没有找到任何生成的文件！');
    console.log('检查 tsconfig.scripts.json 中的 outDir 设置和 include 路径是否正确。');
  } else {
    console.log(`生成的文件: ${generatedFiles.join(', ')}`);
  }
  
  console.log('现在可以运行修复脚本: node scripts/fix-all-double-encrypted-ids.js');
} catch (error) {
  console.error('❌ 编译失败:', error.message);
  process.exit(1);
} 