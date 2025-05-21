import { customers_status } from '@prisma/client';

export interface CustomerTag {
  id: number;
  name: string;
  color: string;
}

export interface CustomerFollowUp {
  id: number;
  content: string;
  createdAt: Date;
  customerId: number;
  createdById: number;
  type: string;
  createdBy: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface CustomerDetail {
  id: number;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  status: customers_status;
  notes: string | null;
  registrationDate: Date;
  updatedAt: Date;
  jobTitle: string | null;
  address: string | null;
  idCardHash: string | null;
  idCardNumberEncrypted: string | null;
  lastYearRevenue: number | null;
  registeredByPartnerId: number;
  followUpStatus?: string | null;
  industry?: string | null;
  source?: string | null;
  priority?: string | null;
  position?: string | null;
  
  // 关联数据
  tags: CustomerTag[];
  followUps: CustomerFollowUp[];
  registeredBy: {
    id: number;
    name: string | null;
    email: string;
  };

  // 动态添加的解密字段
  decryptedIdCardNumber?: string;
} 