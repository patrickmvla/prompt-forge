import { z } from 'zod';

export const PromptRuleSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['HARD', 'SOFT']),
  value: z.string(),
});

export const PromptBlueprintSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
  rules: z.array(PromptRuleSchema),
  inputSlots: z.record(z.string(), z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'date']),
  })),
  outputSchema: z.record(z.string(), z.any()),
  taskTemplate: z.string(),
});

export type PromptBlueprint = z.infer<typeof PromptBlueprintSchema>;
export type PromptRule = z.infer<typeof PromptRuleSchema>;
