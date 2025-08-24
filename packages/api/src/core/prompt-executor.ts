import { Groq } from 'groq-sdk';
import type { PromptBlueprint, PromptRule } from '@promptforge/shared';
import { z, type ZodTypeAny } from 'zod';

class PromptExecutor {
  private groq: Groq;
  private maxRetries = 3;

  constructor() {
    this.groq = new Groq({
      apiKey: Bun.env.GROQ_API_KEY,
    });
  }

  private buildSystemPrompt(blueprint: PromptBlueprint, violations: string[] = []): string {
    const rulesText = blueprint.rules
      .map(rule => `- ${rule.value}`)
      .join('\n');

    let prompt = `
      ROLE: You are a ${blueprint.role}.
      === STRICT RULES ===
      ${rulesText}
      === OUTPUT FORMAT ===
      You must respond with a JSON object that strictly adheres to the following schema:
      ${JSON.stringify(blueprint.outputSchema, null, 2)}
    `.trim();

    if (violations.length > 0) {
      prompt += `\n\n=== PREVIOUS VIOLATIONS ===\n- ${violations.join('\n- ')}\nFIX THESE ERRORS IMMEDIATELY.`;
    }

    return prompt;
  }

  private checkRules(output: any, rules: PromptRule[]): string[] {
    const violations: string[] = [];
    for (const rule of rules) {
      if (rule.type === 'HARD') {
        const ruleRegex = /NEVER mention (\w+)/;
        const match = rule.value.match(ruleRegex);
        if (match) {
          const forbiddenWord = match[1];
          if (JSON.stringify(output).includes(forbiddenWord)) {
            violations.push(`Violation: Mentioned forbidden word "${forbiddenWord}".`);
          }
        }
      }
    }
    return violations;
  }

  private buildZodSchemaFromBlueprint(schema: Record<string, any>): z.ZodObject<any> {
    const shape: { [key: string]: ZodTypeAny } = {};
    for (const key in schema) {
      const type = schema[key];
      switch (type) {
        case 'string':
          shape[key] = z.string();
          break;
        case 'number':
          shape[key] = z.number();
          break;
        case 'boolean':
          shape[key] = z.boolean();
          break;
        default:
          shape[key] = z.any();
      }
    }
    return z.object(shape);
  }

  private substituteInputs(template: string, inputs: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, key) => {
      return inputs[key] !== undefined ? String(inputs[key]) : placeholder;
    });
  }

  public async execute(blueprint: PromptBlueprint, inputs: Record<string, any>) {
    let attempt = 0;
    let violations: string[] = [];
    let duration = 0;

    const finalTaskTemplate = this.substituteInputs(blueprint.taskTemplate, inputs);

    while (attempt < this.maxRetries) {
      const systemPrompt = this.buildSystemPrompt(blueprint, violations);
      const userPrompt = `TASK: ${finalTaskTemplate}`;

      const startTime = performance.now();
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'llama3-70b-8192',
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      const endTime = performance.now();
      duration = endTime - startTime;

      const rawOutput = chatCompletion.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error('No response from LLM');
      }

      let parsedOutput: any;
      try {
        parsedOutput = JSON.parse(rawOutput);
      } catch (error) {
        violations = ['Response was not valid JSON.'];
        attempt++;
        continue;
      }

      const outputZodSchema = this.buildZodSchemaFromBlueprint(blueprint.outputSchema);
      const validationResult = outputZodSchema.safeParse(parsedOutput);

      if (!validationResult.success) {
        violations = validationResult.error.issues.map(e => `Schema Violation: ${e.path.join('.')} - ${e.message}`);
        attempt++;
        continue;
      }

      violations = this.checkRules(validationResult.data, blueprint.rules);
      if (violations.length === 0) {
        return { result: validationResult.data, duration };
      }

      attempt++;
    }

    throw new Error(`Failed to produce a valid response after ${this.maxRetries} attempts. Last violations: ${violations.join(', ')}`);
  }
}

export const promptExecutor = new PromptExecutor();
