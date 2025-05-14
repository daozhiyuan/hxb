// 专项修复脚本：检测并标记无法解密的加密证件号
// 用法：node scripts/fix-abnormal-idcards.js

const fs = require('fs');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'crmuser',
  password: 'crmpassword',
  database: 'crm',
};

// 需要检测的文件
const files = [
  'abnormal_idcards_users.txt',
  'abnormal_idcards_customers.txt',
  'abnormal_idcards_appeal.txt',
];

// 解析文件内容，提取ID和密文
function parseFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      result.push({ id: match[1], encrypted: match[2] });
    }
  }
  return result;
}

// 尝试解密（调用test-decrypt.js）
function tryDecrypt(encrypted) {
  try {
    const output = execSync(`node scripts/test-decrypt.js '${encrypted.replace(/'/g, "''")}'`, { encoding: 'utf8', stdio: 'pipe' });
    if (output.includes('解密成功') || output.includes('result:')) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

(async () => {
  let abnormal = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const records = parseFile(file);
    for (const rec of records) {
      if (!tryDecrypt(rec.encrypted)) {
        abnormal.push({ file, ...rec });
      }
    }
  }

  if (abnormal.length === 0) {
    console.log('未发现无法解密的密文，无需修复。');
    return;
  }

  // 生成SQL并执行修复
  const conn = await mysql.createConnection(dbConfig);
  for (const rec of abnormal) {
    let table = '';
    let field = '';
    if (rec.file.includes('users')) {
      table = 'users';
      field = 'idCardNumberEncrypted';
    } else if (rec.file.includes('customers')) {
      table = 'customers';
      field = 'idCardNumberEncrypted';
    } else if (rec.file.includes('appeal')) {
      table = 'Appeal';
      field = 'idNumber';
    }
    if (table && field) {
      const sql = `UPDATE \`${table}\` SET \`${field}\`='[解密失败]' WHERE id=${rec.id} LIMIT 1;`.replace(/\\`/g, '`');
      await conn.query(sql);
      console.log(`已标记${table}表ID=${rec.id}为[解密失败]`);
    }
  }
  await conn.end();
  console.log('专项修复完成。');
})(); 