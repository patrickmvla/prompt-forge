import { z } from 'zod';

export const PromptRuleSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['HARD', 'SOFT']),
  value: z.string(),
});

export const AssertionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['equalTo', 'notEqualTo', 'contains', 'greaterThan', 'lessThan']),
  field: z.string(),
  expectedValue: z.any(),
});

export const PromptTestSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  inputs: z.record(z.string(), z.any()),
  assertions: z.array(AssertionSchema).nullable(),
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
  tests: z.array(PromptTestSchema).optional(),
});

export type PromptBlueprint = z.infer<typeof PromptBlueprintSchema>;
export type PromptRule = z.infer<typeof PromptRuleSchema>;
export type PromptTest = z.infer<typeof PromptTestSchema>;
export type Assertion = z.infer<typeof AssertionSchema>;
