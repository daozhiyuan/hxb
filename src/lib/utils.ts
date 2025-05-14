import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { createHash } from 'crypto'
import { IdCardType } from './client-validation'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateIdNumberHash(idNumber: string, idCardType: IdCardType = IdCardType.CHINA_MAINLAND): Promise<string> {
  return createHash('sha256').update(`${idCardType}:${idNumber}`).digest('hex');
}
