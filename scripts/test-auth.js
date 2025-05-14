// 测试NextAuth会话路由的简单脚本
async function testSession() {
  try {
    console.log('测试NextAuth会话路由...');
    const response = await fetch('http://localhost:3005/api/auth/session', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('状态码:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('响应数据:', JSON.stringify(data, null, 2));
    } else {
      console.log('错误响应:', await response.text());
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 运行测试
testSession(); 