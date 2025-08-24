import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PromptBlueprintSchema } from '@promptforge/shared';
import { db } from '../db';
import { blueprints, rules } from '../db/schema';

const app = new Hono();

// GET /blueprints -> List all blueprints
app.get('/', async (c) => {
  const allBlueprints = await db.query.blueprints.findMany({
    with: {
      rules: true,
    },
  });
  return c.json(allBlueprints);
});

// POST /blueprints -> Create a new blueprint
const route = app.post(
  '/',
  zValidator('json', PromptBlueprintSchema.omit({ id: true })),
  async (c) => {
    const blueprintData = c.req.valid('json');

    const newBlueprint = await db.transaction(async (tx) => {
      const [insertedBlueprint] = await tx
        .insert(blueprints)
        .values({
          name: blueprintData.name,
          role: blueprintData.role,
          taskTemplate: blueprintData.taskTemplate,
          inputSlots: blueprintData.inputSlots,
          outputSchema: blueprintData.outputSchema,
        })
        .returning();

      if (blueprintData.rules && blueprintData.rules.length > 0) {
        const rulesToInsert = blueprintData.rules.map((rule) => ({
          ...rule,
          blueprintId: insertedBlueprint.id,
        }));
        await tx.insert(rules).values(rulesToInsert);
      }

      return insertedBlueprint;
    });

    return c.json(newBlueprint, 201);
  }
);

export default app;
export type BlueprintRoutes = typeof route;
