'use client';

// 证件类型枚举
export enum IdCardType {
  CHINA_MAINLAND = 'CHINA_MAINLAND', // 中国大陆身份证
  PASSPORT = 'PASSPORT', // 护照
  HONG_KONG_ID = 'HONG_KONG_ID', // 香港身份证
  FOREIGN_ID = 'FOREIGN_ID', // 外国身份证
}

// 验证身份证号码格式（纯客户端版本）
export function validateIdCard(idCard: string, idCardType: IdCardType = IdCardType.CHINA_MAINLAND): boolean {
  try {
    if (!idCard) {
      return false;
    }

    // 去除空格
    idCard = idCard.trim();
    
    // 如果输入为空，直接返回false
    if (idCard.length === 0) {
      return false;
    }

    // 根据证件类型使用不同的验证规则
    switch (idCardType) {
      case IdCardType.CHINA_MAINLAND:
        // 中国大陆身份证：18位数字，最后一位可能是X
        return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/i.test(idCard);
      
      case IdCardType.PASSPORT:
        // 护照：1-2位字母 + 7-8位数字
        return /^[A-Z]{1,2}\d{7,8}$/i.test(idCard);
      
      case IdCardType.HONG_KONG_ID:
        // 香港身份证：1位字母 + 6位数字 + 可选的校验位（括号内）
        return /^[A-Z][0-9]{6}(\([0-9A]\))?$/i.test(idCard);
      
      case IdCardType.FOREIGN_ID:
        // 外国身份证：至少有5个字符，可以包含字母、数字和常见分隔符
        return idCard.length >= 5;
      
      default:
        // 默认只验证输入不为空
        return idCard.length > 0;
    }
  } catch (error) {
    console.error('验证身份证号码失败:', error);
    return false;
  }
} 