/**
 * 数据库备份脚本
 * 
 * 在进行批量数据修复前，先备份数据库中的敏感数据
 * 会将客户表中的身份证相关字段导出为JSON文件，以便在需要时恢复
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 初始化Prisma客户端
const prisma = new PrismaClient();

// 获取当前时间戳
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// 创建备份目录
function createBackupDirectory() {
  const backupDir = path.resolve(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`创建备份目录: ${backupDir}`);
  }
  
  return backupDir;
}

// 备份客户身份证数据
async function backupCustomerIdCardData() {
  try {
    console.log('开始备份客户身份证数据...');
    
    // 查询所有客户的身份证相关数据
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        idCardNumberEncrypted: true,
        idCardHash: true
      }
    });
    
    console.log(`找到 ${customers.length} 条客户记录`);
    
    // 创建备份目录
    const backupDir = createBackupDirectory();
    
    // 创建备份文件名
    const timestamp = getTimestamp();
    const backupFileName = `customers_idcard_backup_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    // 将数据写入文件
    fs.writeFileSync(
      backupFilePath,
      JSON.stringify({
        timestamp,
        count: customers.length,
        data: customers
      }, null, 2)
    );
    
    console.log(`客户身份证数据已备份到: ${backupFilePath}`);
    return backupFilePath;
  } catch (error) {
    console.error('备份客户身份证数据失败:', error);
    throw error;
  }
}

// 使用mysqldump备份整个数据库
async function backupFullDatabase() {
  try {
    console.log('尝试备份整个数据库...');
    
    // 从环境变量中获取数据库连接信息
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn('警告: 未找到DATABASE_URL环境变量，无法备份整个数据库');
      return null;
    }
    
    // 解析数据库连接字符串
    // 格式: mysql://user:password@host:port/database
    const matches = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!matches || matches.length < 6) {
      console.warn('警告: 无法解析数据库连接字符串，确保格式正确');
      return null;
    }
    
    const [, username, password, host, port, database] = matches;
    
    // 创建备份目录
    const backupDir = createBackupDirectory();
    
    // 创建备份文件名
    const timestamp = getTimestamp();
    const backupFileName = `full_database_backup_${timestamp}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);
    
    // 使用mysqldump命令备份数据库
    console.log(`执行mysqldump命令备份数据库 ${database}...`);
    
    try {
      // 设置环境变量以避免在命令行中暴露密码
      const env = {
        ...process.env,
        MYSQL_PWD: password
      };
      
      // 执行mysqldump命令
      execSync(
        `mysqldump -h ${host} -P ${port} -u ${username} ${database} > ${backupFilePath}`,
        { env }
      );
      
      console.log(`整个数据库已备份到: ${backupFilePath}`);
      return backupFilePath;
    } catch (error) {
      console.error('执行mysqldump命令失败:', error.message);
      console.log('尝试使用备选方法...');
      
      // 如果mysqldump命令失败，记录错误但不中断脚本
      return null;
    }
  } catch (error) {
    console.error('备份整个数据库失败:', error);
    // 仅记录错误，但不中断脚本
    return null;
  }
}

// 主函数：执行备份
async function main() {
  try {
    console.log('开始数据库备份流程...');
    
    // 备份客户身份证数据
    const idCardBackupPath = await backupCustomerIdCardData();
    
    // 尝试备份整个数据库
    const fullDatabaseBackupPath = await backupFullDatabase();
    
    // 总结
    console.log('\n=== 备份完成 ===');
    console.log(`客户身份证数据备份: ${idCardBackupPath || '失败'}`);
    console.log(`完整数据库备份: ${fullDatabaseBackupPath || '失败'}`);
    
    // 提示下一步操作
    console.log('\n现在可以安全地运行修复脚本:');
    console.log('  node scripts/fix-customer-idcards.js --all');
    console.log('或者:');
    console.log('  node scripts/fix-customer-idcards.js --id=21,22,23');
    
  } catch (error) {
    console.error('备份过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行主函数
main(); 