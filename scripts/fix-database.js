const { PrismaClient } = require('@prisma/client');

// 创建Prisma客户端并指定正确的数据库连接
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "mysql://crmuser:crmpassword@localhost:3306/crm"
    }
  }
});

// 创建测试客户数据以确保界面显示正常
async function fixDatabase() {
  try {
    console.log('开始执行数据库修复...');
    
    // 检查customer_tags表是否存在
    console.log('检查customer_tags表是否存在...');
    try {
      await prisma.$executeRawUnsafe(`
        SELECT 1 FROM customer_tags LIMIT 1
      `);
      console.log('customer_tags表存在，继续检查...');
    } catch (error) {
      console.error('customer_tags表不存在，创建表...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS customer_tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(191) NOT NULL,
          color VARCHAR(191) NOT NULL,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL
        );
      `);
      console.log('customer_tags表创建成功！');
    }

    // 检查customers表是否存在
    console.log('检查customers表是否存在...');
    
    try {
      await prisma.$executeRawUnsafe(`
        SELECT 1 FROM customers LIMIT 1
      `);
      console.log('customers表存在，继续检查...');
      
      // 检查并添加缺少的字段
      console.log('检查Customer表中缺少的字段...');
      
      // 检查position字段
      try {
        await prisma.$executeRawUnsafe(`SELECT position FROM customers LIMIT 1`);
        console.log('position字段已存在');
      } catch (error) {
        console.log('添加position字段到customers表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE customers ADD COLUMN position VARCHAR(100) DEFAULT NULL
        `);
        console.log('position字段添加成功');
      }
      
      // 检查department字段
      try {
        await prisma.$executeRawUnsafe(`SELECT department FROM customers LIMIT 1`);
        console.log('department字段已存在');
      } catch (error) {
        console.log('添加department字段到customers表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE customers ADD COLUMN department VARCHAR(100) DEFAULT NULL
        `);
        console.log('department字段添加成功');
      }
      
      // 检查industry字段
      try {
        await prisma.$executeRawUnsafe(`SELECT industry FROM customers LIMIT 1`);
        console.log('industry字段已存在');
      } catch (error) {
        console.log('添加industry字段到customers表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE customers ADD COLUMN industry VARCHAR(100) DEFAULT NULL
        `);
        console.log('industry字段添加成功');
      }
      
      // 检查source字段
      try {
        await prisma.$executeRawUnsafe(`SELECT source FROM customers LIMIT 1`);
        console.log('source字段已存在');
      } catch (error) {
        console.log('添加source字段到customers表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE customers ADD COLUMN source VARCHAR(50) DEFAULT NULL
        `);
        console.log('source字段添加成功');
      }
      
      // 检查priority字段
      try {
        await prisma.$executeRawUnsafe(`SELECT priority FROM customers LIMIT 1`);
        console.log('priority字段已存在');
      } catch (error) {
        console.log('添加priority字段到customers表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE customers ADD COLUMN priority VARCHAR(20) DEFAULT NULL
        `);
        console.log('priority字段添加成功');
      }
      
    } catch (error) {
      console.error('customers表不存在，尝试创建表...');
      
      try {
        // 创建customers表
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(191) NOT NULL,
            companyName VARCHAR(191),
            phone VARCHAR(191),
            email VARCHAR(191),
            status ENUM('FOLLOWING', 'NEGOTIATING', 'PENDING', 'SIGNED', 'COMPLETED', 'LOST') NOT NULL,
            notes VARCHAR(191),
            registrationDate DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL,
            jobTitle VARCHAR(191),
            registeredByPartnerId INT NOT NULL,
            address VARCHAR(191),
            idCardHash VARCHAR(191) UNIQUE,
            idCardNumberEncrypted VARCHAR(191),
            lastYearRevenue DOUBLE,
            department VARCHAR(100),
            followUpStatus VARCHAR(50),
            industry VARCHAR(100),
            lastContactedAt DATETIME(3),
            lastFollowUpAt DATETIME(3),
            logs JSON,
            nextFollowUpAt DATETIME(3),
            position VARCHAR(100),
            priority VARCHAR(20),
            source VARCHAR(50),
            INDEX (registeredByPartnerId)
          );
        `);
        
        console.log('customers表创建成功！');
      } catch (createError) {
        console.error('创建customers表失败:', createError);
        return;
      }
    }
    
    // 检查关系表是否存在
    console.log('检查CustomerToCustomerTag关系表是否存在...');
    try {
      await prisma.$executeRawUnsafe(`
        SELECT 1 FROM _CustomerToCustomerTag LIMIT 1
      `);
      console.log('_CustomerToCustomerTag表存在，继续检查...');
    } catch (error) {
      console.error('_CustomerToCustomerTag表不存在，创建表...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _CustomerToCustomerTag (
          A INT NOT NULL,
          B INT NOT NULL,
          UNIQUE KEY _CustomerToCustomerTag_AB_unique (A, B),
          INDEX _CustomerToCustomerTag_B_index (B)
        );
      `);
      console.log('_CustomerToCustomerTag表创建成功！');
    }

    // 创建标签
    const tags = await prisma.customerTag.findMany();
    if (tags.length === 0) {
      console.log('添加默认标签...');
      await prisma.customerTag.createMany({
        data: [
          { name: '重要客户', color: '#ff0000', updatedAt: new Date() },
          { name: '潜在客户', color: '#00ff00', updatedAt: new Date() },
          { name: '长期客户', color: '#0000ff', updatedAt: new Date() }
        ]
      });
      console.log('默认标签添加成功！');
    }

    // 检查表中是否有数据
    console.log('检查客户表中是否有数据...');
    const count = await prisma.$executeRawUnsafe(`
      SELECT COUNT(*) as count FROM customers
    `);
    
    const customersCount = Number(count[0]?.count || 0);
    console.log(`表中有 ${customersCount} 条数据`);
    
    // 如果没有数据，添加测试数据
    if (customersCount === 0) {
      console.log('添加测试客户数据...');
      
      // 获取用户ID作为registeredByPartnerId
      const users = await prisma.user.findMany({
        where: {
          role: 'PARTNER'
        },
        take: 1
      });
      
      if (users.length === 0) {
        console.log('没有找到合作伙伴用户，使用ID 1');
      }
      
      const partnerId = users.length > 0 ? users[0].id : 1;
      
      // 添加3条测试数据
      for (let i = 1; i <= 3; i++) {
        const customer = await prisma.customer.create({
          data: {
            name: `测试客户${i}`,
            companyName: `测试公司${i}`,
            phone: `1380013800${i}`,
            status: i === 1 ? 'FOLLOWING' : (i === 2 ? 'NEGOTIATING' : 'SIGNED'),
            registrationDate: new Date(),
            updatedAt: new Date(),
            registeredByPartnerId: partnerId,
            address: i === 1 ? '北京市朝阳区' : (i === 2 ? '上海市浦东新区' : '广州市天河区'),
            jobTitle: i === 1 ? '经理' : (i === 2 ? '总监' : 'CEO'),
            department: `部门${i}`,
            industry: `行业${i}`
          }
        });
        
        // 关联标签
        if (tags.length > 0) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO _CustomerToCustomerTag (A, B) VALUES (?, ?)
          `, customer.id, (i % tags.length) + 1);
        }
      }
      
      console.log('测试数据添加成功！');
    }
    
    // 检查FollowUp表
    try {
      await prisma.$executeRawUnsafe(`
        SELECT 1 FROM FollowUp LIMIT 1
      `);
      console.log('FollowUp表存在，继续检查...');
      
      // 检查并添加缺少的字段
      console.log('检查FollowUp表中缺少的字段...');
      
      // 检查attachments字段
      try {
        await prisma.$executeRawUnsafe(`SELECT attachments FROM FollowUp LIMIT 1`);
        console.log('attachments字段已存在');
      } catch (error) {
        console.log('添加attachments字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN attachments JSON DEFAULT NULL
        `);
        console.log('attachments字段添加成功');
      }
      
      // 检查duration字段
      try {
        await prisma.$executeRawUnsafe(`SELECT duration FROM FollowUp LIMIT 1`);
        console.log('duration字段已存在');
      } catch (error) {
        console.log('添加duration字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN duration INT DEFAULT 30
        `);
        console.log('duration字段添加成功');
      }
      
      // 检查location字段
      try {
        await prisma.$executeRawUnsafe(`SELECT location FROM FollowUp LIMIT 1`);
        console.log('location字段已存在');
      } catch (error) {
        console.log('添加location字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN location VARCHAR(200) DEFAULT NULL
        `);
        console.log('location字段添加成功');
      }
      
      // 检查nextSteps字段
      try {
        await prisma.$executeRawUnsafe(`SELECT nextSteps FROM FollowUp LIMIT 1`);
        console.log('nextSteps字段已存在');
      } catch (error) {
        console.log('添加nextSteps字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN nextSteps TEXT DEFAULT NULL
        `);
        console.log('nextSteps字段添加成功');
      }
      
      // 检查notes字段
      try {
        await prisma.$executeRawUnsafe(`SELECT notes FROM FollowUp LIMIT 1`);
        console.log('notes字段已存在');
      } catch (error) {
        console.log('添加notes字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN notes TEXT DEFAULT NULL
        `);
        console.log('notes字段添加成功');
      }
      
      // 检查outcome字段
      try {
        await prisma.$executeRawUnsafe(`SELECT outcome FROM FollowUp LIMIT 1`);
        console.log('outcome字段已存在');
      } catch (error) {
        console.log('添加outcome字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN outcome VARCHAR(100) DEFAULT NULL
        `);
        console.log('outcome字段添加成功');
      }
      
      // 检查participants字段
      try {
        await prisma.$executeRawUnsafe(`SELECT participants FROM FollowUp LIMIT 1`);
        console.log('participants字段已存在');
      } catch (error) {
        console.log('添加participants字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN participants JSON DEFAULT NULL
        `);
        console.log('participants字段添加成功');
      }
      
      // 检查sentiment字段
      try {
        await prisma.$executeRawUnsafe(`SELECT sentiment FROM FollowUp LIMIT 1`);
        console.log('sentiment字段已存在');
      } catch (error) {
        console.log('添加sentiment字段到FollowUp表...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE FollowUp ADD COLUMN sentiment VARCHAR(20) DEFAULT NULL
        `);
        console.log('sentiment字段添加成功');
      }
      
    } catch (error) {
      console.error('FollowUp表不存在，创建表...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS FollowUp (
          id INT AUTO_INCREMENT PRIMARY KEY,
          content TEXT NOT NULL,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          customerId INT NOT NULL,
          createdById INT NOT NULL,
          type VARCHAR(191) NOT NULL DEFAULT 'MEETING',
          attachments JSON DEFAULT NULL,
          duration INT DEFAULT 30,
          location VARCHAR(200) DEFAULT NULL,
          nextSteps TEXT DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          outcome VARCHAR(100) DEFAULT NULL,
          participants JSON DEFAULT NULL,
          sentiment VARCHAR(20) DEFAULT NULL,
          INDEX (customerId),
          INDEX (createdById)
        );
      `);
      console.log('FollowUp表创建成功！');
    }
    
    console.log('数据库修复完成！');
  } catch (error) {
    console.error('数据库修复过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复
fixDatabase()
  .then(() => console.log('脚本执行完毕'))
  .catch(error => console.error('脚本执行失败:', error)); 