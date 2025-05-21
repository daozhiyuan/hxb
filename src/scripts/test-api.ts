/**
 * 用于测试分析API的脚本
 */
import { GET as getCustomersAnalytics } from '@/app/api/analytics/customers/route';
import { GET as getUsersAnalytics } from '@/app/api/analytics/users/route';

async function testAPIs() {
  try {
    console.log('===== 测试客户分析API =====');
    // 模拟请求
    const customerRequest = new Request('http://localhost:3005/api/analytics/customers?period=month');
    const customerResponse = await getCustomersAnalytics(customerRequest);
    
    if (customerResponse.status === 200) {
      console.log('客户分析API测试成功!');
      const data = await customerResponse.json();
      console.log('数据:', JSON.stringify(data, null, 2));
    } else {
      console.error('客户分析API测试失败:', customerResponse.status);
      const error = await customerResponse.json();
      console.error('错误:', error);
    }
    
    console.log('\n===== 测试用户分析API =====');
    // 模拟请求
    const userRequest = new Request('http://localhost:3005/api/analytics/users?period=month');
    const userResponse = await getUsersAnalytics(userRequest);
    
    if (userResponse.status === 200) {
      console.log('用户分析API测试成功!');
      const data = await userResponse.json();
      console.log('数据:', JSON.stringify(data, null, 2));
    } else {
      console.error('用户分析API测试失败:', userResponse.status);
      const error = await userResponse.json();
      console.error('错误:', error);
    }
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testAPIs().catch(error => {
  console.error('执行测试脚本时发生错误:', error);
}); 