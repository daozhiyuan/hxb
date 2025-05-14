import { NextResponse } from 'next/server';

// 安全的响应头
const SECURE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * 统一的成功响应函数
 * @param data 响应数据
 * @param status HTTP状态码，默认200
 * @param additionalHeaders 额外的响应头
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
) {
  const responseData = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(responseData, {
    status,
    headers: {
      ...SECURE_HEADERS,
      ...additionalHeaders
    }
  });
}

/**
 * 统一的错误响应函数
 * @param message 错误消息
 * @param status HTTP状态码，默认400
 * @param errorCode 可选的错误代码
 * @param additionalHeaders 额外的响应头
 */
export function errorResponse(
  message: string,
  status: number = 400,
  errorCode?: string,
  additionalHeaders: Record<string, string> = {}
) {
  const responseData: {
    success: false;
    error: {
      message: string;
      code?: string;
    };
    timestamp: string;
    details?: any;
  } = {
    success: false,
    error: {
      message
    },
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    responseData.error.code = errorCode;
  }

  // 开发环境下可附加详细错误信息
  if (process.env.NODE_ENV === 'development' && additionalHeaders['x-error-details']) {
    responseData.details = additionalHeaders['x-error-details'];
    delete additionalHeaders['x-error-details'];
  }

  return NextResponse.json(responseData, {
    status,
    headers: {
      ...SECURE_HEADERS,
      ...additionalHeaders
    }
  });
}

/**
 * 处理未授权响应
 * @param message 可选的错误消息
 */
export function unauthorizedResponse(message: string = '未授权访问') {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * 处理禁止访问响应
 * @param message 可选的错误消息
 */
export function forbiddenResponse(message: string = '禁止访问') {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * 处理资源不存在响应
 * @param resource 资源类型名称
 * @param id 可选的资源ID
 */
export function notFoundResponse(resource: string, id?: string | number) {
  const message = id 
    ? `${resource} ID: ${id} 不存在` 
    : `${resource}不存在`;
  return errorResponse(message, 404, 'NOT_FOUND');
}

/**
 * 处理验证错误响应
 * @param errors 验证错误信息
 */
export function validationErrorResponse(errors: Record<string, any>) {
  return errorResponse(
    '请求数据验证失败', 
    422, 
    'VALIDATION_ERROR',
    { 'x-error-details': JSON.stringify(errors) }
  );
}

/**
 * 处理服务器内部错误响应
 * @param error 错误对象
 */
export function serverErrorResponse(error: unknown) {
  console.error('服务器错误:', error);
  
  const headers: Record<string, string> = {};
  
  // 开发环境下包含详细错误信息
  if (process.env.NODE_ENV === 'development') {
    headers['x-error-details'] = error instanceof Error 
      ? `${error.name}: ${error.message}\n${error.stack}` 
      : String(error);
  }
  
  return errorResponse(
    '服务器内部错误',
    500,
    'SERVER_ERROR',
    headers
  );
} 