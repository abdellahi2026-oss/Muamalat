'use server';

/**
 * @fileOverview Suggests appropriate commodity cards for Murabaha, Mudarabah, or Musharakah contracts.
 *
 * - suggestCommodityCards - A function that suggests commodity cards based on contract details.
 * - SuggestCommodityCardsInput - The input type for the suggestCommodityCards function.
 * - SuggestCommodityCardsOutput - The return type for the suggestCommodityCards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCommodityCardsInputSchema = z.object({
  contractType: z
    .enum(['Murabaha', 'Mudarabah', 'Musharakah'])
    .describe('The type of contract (Murabaha, Mudarabah, or Musharakah).'),
  contractDetails: z
    .string()
    .describe('A summary of contract details including at least the total value.'),
});
export type SuggestCommodityCardsInput = z.infer<typeof SuggestCommoditCardsInputSchema>;

const SuggestCommodityCardsOutputSchema = z.object({
  suggestedCards: z
    .array(z.string())
    .describe('An array of suggested commodity card numbers with their values. Example: ["Card-1234 (MRU 50000)"]'),
  reasoning: z
    .string()
    .describe('The reasoning behind the card suggestions.'),
});
export type SuggestCommodityCardsOutput = z.infer<typeof SuggestCommodityCardsOutputSchema>;

export async function suggestCommodityCards(
  input: SuggestCommodityCardsInput
): Promise<SuggestCommodityCardsOutput> {
  return suggestCommodityCardsFlow(input);
}

// In a real app, you would fetch this from Firestore.
const availableCommodityCards = [
    { cardNumber: '1234-5678-9012-3456', nominalValue: 10000, issuingBody: 'بنك البركة', status: 'available' },
    { cardNumber: '2345-6789-0123-4567', nominalValue: 50000, issuingBody: 'مصرف الراجحي', status: 'available' },
    { cardNumber: '3456-7890-1234-5678', nominalValue: 25000, issuingBody: 'بنك دبي الإسلامي', status: 'available' },
    { cardNumber: '5678-9012-3456-7890', nominalValue: 75000, issuingBody: 'بنك البركة', status: 'available' },
    { cardNumber: '6789-0123-4567-8901', nominalValue: 150000, issuingBody: 'بنك أبوظبي الإسلامي', status: 'available' },
];

const prompt = ai.definePrompt({
  name: 'suggestCommodityCardsPrompt',
  input: {schema: SuggestCommodityCardsInputSchema},
  output: {schema: SuggestCommodityCardsOutputSchema},
  prompt: `You are an expert in Islamic finance, specializing in commodity card usage for Murabaha contracts.

  Your task is to suggest suitable commodity cards from a provided list to cover the total value of a contract.
  The total value of the contract is mentioned in the contract details.
  
  Here are the available commodity cards:
  {{#each availableCards}}
  - Card Number: {{this.cardNumber}}, Value: {{this.nominalValue}}, Issuer: {{this.issuingBody}}
  {{/each}}

  Based on the following contract details, suggest one or more available cards whose total value is equal to or just above the contract's total value.
  Combine cards if necessary.

  Contract Type: {{{contractType}}}
  Contract Details: {{{contractDetails}}}

  Respond with an array of suggested card numbers, and a reasoning field explaining your choice.
  For each suggested card, include its value in the response, like this: 'Card-1234 (Value: 10000)'.
  If combining cards, list all of them.
  Ensure that the suggested cards are appropriate for the given contract type and details.
  Do not suggest more than 3 combinations.
  `,
});

const suggestCommodityCardsFlow = ai.defineFlow(
  {
    name: 'suggestCommodityCardsFlow',
    inputSchema: SuggestCommodityCardsInputSchema,
    outputSchema: SuggestCommodityCardsOutputSchema,
  },
  async input => {
    const {output} = await prompt({...input, availableCards: availableCommodityCards});
    return output!;
  }
);


    