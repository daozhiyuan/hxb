
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto'; // For hashing and encryption
import {CustomerStatus} from "@prisma/client";

// Define the expected input schema using Zod
const registerCustomerSchema = z.object({
  name: z.string().min(1, { message: '客户姓名不能为空' }).trim(),
  companyName: z.string().optional().nullable(),
  lastYearRevenue: z.number().optional().nullable(),
  idCardNumber: z.string().regex(/^\d{17}(\d|X)$/i, { message: '无效的身份证号码格式' }).trim(), // Basic validation for 18 digits/X
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.FOLLOWING).optional(),
  notes: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(), // Added jobTitle
});

// AES-256-GCM Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_DERIVATION_ITERATIONS = 100000;

// --- Helper Functions for Encryption/Decryption ---

// IMPORTANT: Store this securely, e.g., in environment variables!
const getEncryptionKey = () => {
  const secret = process.env.ID_CARD_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ID_CARD_ENCRYPTION_SECRET is not set in environment variables.');
  }
  // Derive a 32-byte key from the secret using PBKDF2 for better security
  // In a real app, the salt for PBKDF2 should ideally be stored per user or globally
  // For simplicity here, we'll use a fixed (but should be unique & stored) salt or derive without salt if needed.
  // WARNING: Using a fixed salt or no salt for PBKDF2 is not ideal for security.
  // Consider a more robust key management strategy in production.
  const salt = Buffer.alloc(SALT_LENGTH, 'fixed-salt-for-pbkdf2'); // Example: Use a fixed salt (less secure)
  return crypto.pbkdf2Sync(secret, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
};

const encryptIdCard = (idCardNumber: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  let encrypted = cipher.update(idCardNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  // Store IV and AuthTag with the encrypted data: IV + AuthTag + EncryptedData
  return iv.toString('hex') + tag.toString('hex') + encrypted;
};

// --- Hash Function ---
const hashIdCard = (idCardNumber: string): string => {
  return crypto.createHash('sha256').update(idCardNumber).digest('hex');
};

// --- API Handler ---
export async function POST(request: Request) {
    // Early check for the encryption secret
    if (!process.env.ID_CARD_ENCRYPTION_SECRET) {
        console.error('Missing ID_CARD_ENCRYPTION_SECRET environment variable.');
        return NextResponse.json({ message: '服务器配置错误：缺少 ID_CARD_ENCRYPTION_SECRET 环境变量' }, { status: 500 });
    }

  try {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication and Authorization
    if (!session || !session.user || session.user.role !== 'PARTNER') {
      return NextResponse.json({ message: '未授权操作' }, { status: 403 });
    }

    // 2. Parse and Validate Request Body
    const body = await request.json();
    const validation = registerCustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: '请求数据无效', errors: validation.error.format() }, { status: 400 });
    }

    const { name, companyName, lastYearRevenue, idCardNumber, phone, address, status, notes, jobTitle } = validation.data;

    // 3. Hash ID Card for duplication check
    const idCardHash = hashIdCard(idCardNumber);

    // 4. Check for existing customer with the same ID card hash
    const existingCustomer = await prisma.customer.findUnique({
      where: { idCardHash: idCardHash },
      select: { id: true, registeredByPartnerId: true } // Select minimal fields
    });

    if (existingCustomer) {
      // Optional: Check if it was registered by the *same* partner? Decide based on business logic.
      // For now, any duplication is considered a conflict.
      return NextResponse.json({ message: '冲突：该客户已被其他合作伙伴报备' }, { status: 409 }); // 409 Conflict
    }

    // 5. Encrypt ID Card for storage
    const encryptedIdCard = encryptIdCard(idCardNumber);

    // 6. Create Customer Record in Database
    const newCustomer = await prisma.customer.create({
      data: {
        name: name,
        companyName: companyName,
        lastYearRevenue: lastYearRevenue,
        idCardNumberEncrypted: encryptedIdCard,
        idCardHash: idCardHash,
        phone: phone,
        address: address,
        status: status,
        notes: notes,
        registeredByPartnerId: parseInt(session.user.id, 10), // Get partner ID from session
        jobTitle: jobTitle, // Added jobTitle
        // registrationDate, createdAt, updatedAt will be handled by default values
      },
    });

    // 7. Return Success Response
    return NextResponse.json({ message: '客户报备成功', customerId: newCustomer.id }, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error('客户报备 API 出错:', error);
    // Handle specific errors like missing encryption key
    if (error instanceof Error && error.message.includes('ID_CARD_ENCRYPTION_SECRET')) {
         return NextResponse.json({ message: '服务器配置错误，无法加密数据' }, { status: 500 });
    }
    // General error
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 });
  }
}
