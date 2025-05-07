import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { createHash } from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateIdNumberHash(idNumber: string): Promise<string> {
  return createHash('sha256').update(idNumber).digest('hex');
}
