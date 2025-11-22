'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a short summary of a contract.
 *
 * - `generateContractSummary`: A function that takes contract details as input and returns a summary.
 * - `ContractSummaryInput`: The input type for the `generateContractSummary` function.
 * - `ContractSummaryOutput`: The return type for the `generateContractSummary` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContractSummaryInputSchema = z.object({
  contractType: z.string().describe('The type of contract (e.g., Murabaha, Mudarabah, Musharakah, Wakalah).'),
  clientName: z.string().describe('The name of the client involved in the contract.'),
  contractAmount: z.number().describe('The total amount of the contract.'),
  startDate: z.string().describe('The start date of the contract (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the contract (YYYY-MM-DD).'),
  paymentMethod: z.string().describe('The method of payment for the contract.'),
  otherDetails: z.string().optional().describe('Any other relevant details about the contract.'),
});

export type ContractSummaryInput = z.infer<typeof ContractSummaryInputSchema>;

const ContractSummaryOutputSchema = z.object({
  summary: z.string().describe('A short summary of the contract details.'),
});

export type ContractSummaryOutput = z.infer<typeof ContractSummaryOutputSchema>;

export async function generateContractSummary(input: ContractSummaryInput): Promise<ContractSummaryOutput> {
  return contractSummaryGeneratorFlow(input);
}

const contractSummaryPrompt = ai.definePrompt({
  name: 'contractSummaryPrompt',
  input: {schema: ContractSummaryInputSchema},
  output: {schema: ContractSummaryOutputSchema},
  prompt: `You are an expert in summarizing financial contracts. Please provide a concise summary of the following contract details:\n\nContract Type: {{{contractType}}}\nClient Name: {{{clientName}}}\nContract Amount: {{{contractAmount}}}\nStart Date: {{{startDate}}}\nEnd Date: {{{endDate}}}\nPayment Method: {{{paymentMethod}}}\nOther Details: {{{otherDetails}}}\n\nSummary:`,
});

const contractSummaryGeneratorFlow = ai.defineFlow(
  {
    name: 'contractSummaryGeneratorFlow',
    inputSchema: ContractSummaryInputSchema,
    outputSchema: ContractSummaryOutputSchema,
  },
  async input => {
    const {output} = await contractSummaryPrompt(input);
    return output!;
  }
);
