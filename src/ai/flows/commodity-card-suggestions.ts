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
    .describe('Details of the contract, including goods, units, price, etc.'),
});
export type SuggestCommodityCardsInput = z.infer<typeof SuggestCommodityCardsInputSchema>;

const SuggestCommodityCardsOutputSchema = z.object({
  suggestedCards: z
    .array(z.string())
    .describe('An array of suggested commodity card numbers.'),
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

const prompt = ai.definePrompt({
  name: 'suggestCommodityCardsPrompt',
  input: {schema: SuggestCommodityCardsInputSchema},
  output: {schema: SuggestCommodityCardsOutputSchema},
  prompt: `You are an expert in Islamic finance, specializing in commodity card usage for various contracts.

  Based on the following contract details and type, suggest suitable commodity card numbers. Provide a brief reasoning for each suggestion.

  Contract Type: {{{contractType}}}
  Contract Details: {{{contractDetails}}}

  Respond with an array of suggested card numbers, and a reasoning field explaining each suggestion.
  Ensure that the suggested cards are appropriate for the given contract type and details.
  Do not suggest more than 5 cards.
  `,
});

const suggestCommodityCardsFlow = ai.defineFlow(
  {
    name: 'suggestCommodityCardsFlow',
    inputSchema: SuggestCommodityCardsInputSchema,
    outputSchema: SuggestCommodityCardsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

