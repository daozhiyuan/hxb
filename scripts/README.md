# CRM系统数据库维护脚本

本目录包含了用于维护CRM系统数据库的各种脚本，特别是处理客户身份证号码加密相关的功能。

## 脚本列表

### 1. 验证客户数据 (validate-customer-data.js)

此脚本用于验证客户数据的完整性，特别是身份证号码的加密和哈希值是否正确。

**使用方法:**
```bash
# 基本使用
node scripts/validate-customer-data.js

# 保存报告到文件
node scripts/validate-customer-data.js --output=reports/validation-report.json

# 显示详细日志
node scripts/validate-customer-data.js --verbose

# 限制处理记录数量
node scripts/validate-customer-data.js --limit=100

# 指定要验证的字段
node scripts/validate-customer-data.js --fields=id,name,idCardNumberEncrypted,idCardHash
```

### 2. 备份数据库 (backup-database.js)

在进行数据修复前，先备份数据库中的敏感数据，确保数据安全。

**使用方法:**
```bash
# 执行备份
node scripts/backup-database.js
```

此脚本会:
1. 备份客户身份证相关数据到JSON文件
2. 尝试使用mysqldump备份整个数据库
3. 将备份保存到`backups`目录

### 3. 通用身份证号码修复脚本 (fix-customer-idcards.js)

此脚本用于修复客户身份证号码加密数据问题，可以处理单个客户或批量处理。

**使用方法:**
```bash
# 处理所有客户记录
node scripts/fix-customer-idcards.js --all

# 处理指定ID的客户记录
node scripts/fix-customer-idcards.js --id=21,22,23

# 仅检查问题，不实际修复
node scripts/fix-customer-idcards.js --check-only --all

# 显示详细日志
node scripts/fix-customer-idcards.js --all --verbose

# 模拟执行，不实际更新数据库
node scripts/fix-customer-idcards.js --all --dry-run
```

### 4. 单一客户修复脚本 (fix-customer-21.js)

此脚本专门用于修复客户ID为21的身份证号码解密失败问题。

**使用方法:**
```bash
# 执行修复
node scripts/fix-customer-21.js
```

## 推荐的使用流程

当遇到身份证号码加密相关问题时，建议按以下步骤操作：

1. **验证数据**: 首先执行验证脚本，了解问题范围
   ```bash
   node scripts/validate-customer-data.js --output=reports/validation-report.json
   ```

2. **备份数据**: 在进行任何修改前先备份数据
   ```bash
   node scripts/backup-database.js
   ```

3. **检查但不修改**: 运行修复脚本的检查模式，查看会影响哪些记录
   ```bash
   node scripts/fix-customer-idcards.js --all --check-only
   ```

4. **执行修复**: 修复所有问题或指定的客户记录
   ```bash
   # 修复所有问题
   node scripts/fix-customer-idcards.js --all
   
   # 或修复特定客户
   node scripts/fix-customer-idcards.js --id=21,22,23
   ```

5. **再次验证**: 确认问题已解决
   ```bash
   node scripts/validate-customer-data.js
   ```

## 环境变量配置

这些脚本依赖于`.env`文件中的以下环境变量：

- `DATABASE_URL`: 数据库连接字符串，格式为`mysql://user:password@host:port/database`
- `ENCRYPTION_KEY`: 用于加密的密钥，必须设置
- `OLD_ENCRYPTION_KEY`: (可选) 旧的加密密钥，用于在密钥更新时解密历史数据

## 注意事项

1. 请在运行修复脚本前**务必备份数据**
2. 验证脚本不会修改数据库，可以安全运行
3. 使用`--dry-run`参数可以模拟修复过程而不实际更新数据库
4. 所有脚本运行日志会输出到控制台，也可以通过重定向保存到文件

# scripts 目录说明

## 核心脚本
- `fix-encrypted-data.cjs`：统一修复和迁移所有加密数据，兼容历史格式，推荐唯一使用。
- `generate-keys.cjs`：生成RSA密钥对（private.pem/public.pem），用于新加密方案。

## 已废弃脚本（已删除）
- fix-appeal-encryption.js
- fix-all-idcards.js
- fix-double-encrypted-id.js
- fix-idcard-db.js
- fix-invalid-id-formats.js
- restore-id-cards.js
- assign-real-idcards.js
- fix-special-id.js
- fix-customer-idcards.js

> 以上脚本因加密方案统一已全部废弃，不再维护。

## 使用说明
- 运行修复脚本：`node scripts/fix-encrypted-data.cjs`
- 生成密钥对：`node scripts/generate-keys.cjs`

## 注意事项
- 所有敏感数据修复、密钥生成操作请在安全环境下执行。
- 运行前请备份数据库和密钥文件。 