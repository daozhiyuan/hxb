import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { reencryptData } from "@/lib/encryption";
import { isSuperAdmin } from '@/lib/auth-helpers';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse
} from '@/lib/api-response';
import { IdCardType } from "@/lib/client-validation";

const { encryptIdCard, decryptIdCard, isValidEncryptedFormat, hashIdCard } =
  require("@/lib/encryption");

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RepairStatus = 'unchanged' | 'failed' | 'temporary_fix' | 'reencrypted' | 'encrypt_failed' | 'already_valid' | 'error';

/**
 * 修复证件数据的API
 * 支持多种修复操作:
 * 1. 修复 idCardType (将 NULL 和空值设为默认值)
 * 2. 修复 customer.idNumber (重新加密/解密/格式修正)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return unauthorizedResponse();
    }

    if (!isSuperAdmin(session)) {
      return forbiddenResponse('仅超级管理员可执行此操作');
    }

    const body = await request.json().catch(() => ({}));
    const { operation = 'fix_id_cards', customerId } = body;

    switch (operation) {
      case 'fix_id_card_type':
        return await fixIdCardType();
      case 'fix_id_cards':
        return customerId
          ? await fixSingleCustomerIdCard(Number(customerId))
          : await fixAllCustomersIdCards();
      default:
        return errorResponse('未知的修复操作', 400);
    }
  } catch (error) {
    console.error('修复操作失败:', error);
    return serverErrorResponse(error);
  }
}

async function fixIdCardType() {
  try {
    console.log('开始修复历史数据中的证件类型...');

    const customersResult = await prisma.$executeRaw`
      UPDATE customers
      SET idCardType = 'CHINA_MAINLAND'
      WHERE idCardType IS NULL OR idCardType = ''
    `;

    const appealsResult = await prisma.$executeRaw`
      UPDATE Appeal
      SET idCardType = 'CHINA_MAINLAND'
      WHERE idCardType IS NULL OR idCardType = ''
    `;

    return successResponse({
      success: true,
      customersFixed: Number(customersResult),
      appealsFixed: Number(appealsResult),
      totalFixed: Number(customersResult) + Number(appealsResult),
      message: '历史数据证件类型修复完成'
    });
  } catch (error) {
    console.error('修复历史数据证件类型失败:', error);
    return serverErrorResponse(error);
  }
}

async function fixSingleCustomerIdCard(customerId: number) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        idNumber: true,
        idNumberHash: true,
        idCardType: true,
      }
    });

    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    const idCardType = (customer.idCardType as IdCardType) || IdCardType.CHINA_MAINLAND;

    const result: {
      message: string;
      before: string;
      after: string;
      status: RepairStatus;
    } = {
      message: '',
      before: '',
      after: '',
      status: 'unchanged',
    };

    if (!customer.idNumber) {
      return NextResponse.json({
        message: '客户没有证件号码数据',
        status: 'failed',
      });
    }

    result.before = customer.idNumber;

    try {
      const decrypted = decryptIdCard(customer.idNumber);

      if (
        decrypted.includes('解密失败') ||
        decrypted.includes('格式错误') ||
        decrypted.includes('无效') ||
        decrypted.includes('异常')
      ) {
        const tempIdNumber = `11010119900101${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0')}`;
        const encryptedTemp = encryptIdCard(tempIdNumber, idCardType);
        const hashTemp = hashIdCard(tempIdNumber, idCardType);

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idNumber: encryptedTemp,
            idNumberHash: hashTemp,
            idCardType,
          },
        });

        result.message = '解密失败，已设置临时数据。请在管理界面重新设置正确的证件号码。';
        result.after = tempIdNumber;
        result.status = 'temporary_fix';
        return NextResponse.json(result);
      }

      if (!isValidEncryptedFormat(customer.idNumber) || customer.idNumber === decrypted) {
        try {
          const newEncrypted = encryptIdCard(decrypted, idCardType);
          const newHash = hashIdCard(decrypted, idCardType);

          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              idNumber: newEncrypted,
              idNumberHash: newHash,
              idCardType,
            },
          });

          result.message = '成功重新加密证件号码';
          result.after = newEncrypted;
          result.status = 'reencrypted';
        } catch (encryptError) {
          console.error('重新加密失败:', encryptError);
          result.message = '重新加密失败: ' +
            (encryptError instanceof Error ? encryptError.message : '未知错误');
          result.status = 'encrypt_failed';
        }
      } else {
        result.message = '证件号码格式正确，无需修复';
        result.after = customer.idNumber;
        result.status = 'already_valid';
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('修复证件号码时出错:', error);
      return NextResponse.json({
        message: '处理出错: ' + (error instanceof Error ? error.message : '未知错误'),
        status: 'error',
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`修复客户ID ${customerId} 的证件数据失败:`, error);
    return NextResponse.json({
      error: '修复失败，请查看服务器日志',
      details: error instanceof Error ? error.message : '未知错误',
      customerId
    }, { status: 500 });
  }
}

async function fixAllCustomersIdCards() {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        idNumber: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        idNumber: true,
        idCardType: true,
      }
    });

    const results = {
      total: customers.length,
      fixed: 0,
      fixedWithHash: 0,
      resetToTemp: 0,
      alreadyValid: 0,
      unfixable: 0,
      details: [] as Array<{
        id: number;
        name: string;
        status: 'fixed' | 'fixed_with_hash' | 'already_valid' | 'unfixable' | 'reset_to_temp';
      }>
    };

    for (const customer of customers) {
      if (!customer.idNumber) continue;

      if (isValidEncryptedFormat(customer.idNumber)) {
        results.alreadyValid++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'already_valid'
        });
        continue;
      }

      console.log(`尝试修复客户 ID ${customer.id} 的证件数据: ${customer.idNumber}`);

      const idCardType = (customer.idCardType as IdCardType) || IdCardType.CHINA_MAINLAND;

      if (customer.id === 21) {
        const tempIdCard = '110101199001011234';
        const encryptedTemp = encryptIdCard(tempIdCard, idCardType);

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idNumber: encryptedTemp,
            idNumberHash: hashIdCard(tempIdCard, idCardType)
          }
        });

        results.resetToTemp++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'reset_to_temp'
        });
        continue;
      }

      const reencryptedData = reencryptData(customer.idNumber);
      if (!reencryptedData) {
        const tempIdCard = '110101199001011234';
        const encryptedTemp = encryptIdCard(tempIdCard, idCardType);

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            idNumber: encryptedTemp,
            idNumberHash: hashIdCard(tempIdCard, idCardType)
          }
        });

        results.resetToTemp++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'reset_to_temp'
        });
        continue;
      }

      const idCardPattern = /^\d{17}[\dX]$/i;
      const possibleIdNumber = customer.idNumber;
      const updatedHash = idCardPattern.test(possibleIdNumber)
        ? hashIdCard(possibleIdNumber, idCardType)
        : null;

      const updateData: { idNumber: string; idNumberHash?: string } = {
        idNumber: reencryptedData
      };

      if (updatedHash) {
        updateData.idNumberHash = updatedHash;
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: updateData
      });

      if (updatedHash) {
        results.fixedWithHash++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'fixed_with_hash'
        });
      } else {
        results.fixed++;
        results.details.push({
          id: customer.id,
          name: customer.name,
          status: 'fixed'
        });
      }
    }

    return NextResponse.json({
      message: '批量修复证件号码数据完成',
      results
    });
  } catch (error) {
    console.error('批量修复证件数据失败:', error);
    return NextResponse.json({
      error: '批量修复失败，请查看服务器日志'
    }, { status: 500 });
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
