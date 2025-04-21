// noinspection JSUnusedLocalSymbols
'use server';
/**
 * @fileOverview Flow for checking customer duplication based on ID number.
 *
 * - checkCustomerDuplication - A function that checks if a customer ID is already registered.
 * - CheckCustomerDuplicationInput - The input type for the checkCustomerDuplication function.
 * - CheckCustomerDuplicationOutput - The return type for the checkCustomerDuplication function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {checkIdentity, CustomerInfo, IdentityVerificationResult} from '@/services/identity-verification';

const CheckCustomerDuplicationInputSchema = z.object({
  idNumber: z.string().describe('The customer ID number to check for duplication.'),
});
export type CheckCustomerDuplicationInput = z.infer<typeof CheckCustomerDuplicationInputSchema>;

const CheckCustomerDuplicationOutputSchema = z.object({
  isDuplicate: z.boolean().describe('Whether the customer ID is already registered.'),
});
export type CheckCustomerDuplicationOutput = z.infer<typeof CheckCustomerDuplicationOutputSchema>;

export async function checkCustomerDuplication(input: CheckCustomerDuplicationInput): Promise<CheckCustomerDuplicationOutput> {
  return checkCustomerDuplicationFlow(input);
}

const checkCustomerDuplicationFlow = ai.defineFlow<
  typeof CheckCustomerDuplicationInputSchema,
  typeof CheckCustomerDuplicationOutputSchema
>(
  {
    name: 'checkCustomerDuplicationFlow',
    inputSchema: CheckCustomerDuplicationInputSchema,
    outputSchema: CheckCustomerDuplicationOutputSchema,
  },
  async input => {
    const customerInfo: CustomerInfo = {idNumber: input.idNumber};
    const identityVerificationResult: IdentityVerificationResult = await checkIdentity(customerInfo);

    return {
      isDuplicate: identityVerificationResult.isRegistered,
    };
  }
);
