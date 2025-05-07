'use client';

// 验证身份证号码格式（纯客户端版本）
export function validateIdCard(idCard: string): boolean {
  try {
    // 基本格式验证
    const pattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/;
    if (!pattern.test(idCard)) {
      return false;
    }

    // 校验码验证
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = '10X98765432';
    let sum = 0;
    
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }
    
    const checkCode = checkCodes[sum % 11];
    return checkCode === idCard[17].toUpperCase();
  } catch (error) {
    console.error('验证身份证号码失败:', error);
    return false;
  }
} 