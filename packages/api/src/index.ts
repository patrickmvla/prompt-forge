import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PromptBlueprintSchema } from "@promptforge/shared";
import { db } from "./db";
import { blueprints, rules } from "./db/schema";
import { promptExecutor } from "./core/prompt-executor";
import { z } from "zod";
import { eq } from "drizzle-orm";

const app = new Hono();

const executionPayloadSchema = z.object({
  blueprint: PromptBlueprintSchema,
  inputs: z.record(z.string(), z.any()),
});

const routes = app
  // --- Blueprint Routes ---
  .get("/blueprints", async (c) => {
    const allBlueprints = await db.query.blueprints.findMany({
      with: {
        rules: true,
      },
    });
    return c.json(allBlueprints);
  })
  .post(
    "/blueprints",
    zValidator("json", PromptBlueprintSchema.omit({ id: true })),
    async (c) => {
      const blueprintData = c.req.valid("json");

      const createdBlueprint = await db.transaction(async (tx) => {
        const [insertedBlueprint] = await tx
          .insert(blueprints)
          .values({
            name: blueprintData.name,
            role: blueprintData.role,
            taskTemplate: blueprintData.taskTemplate,
            inputSlots: blueprintData.inputSlots,
            outputSchema: blueprintData.outputSchema,
          })
          .returning({ id: blueprints.id });

        if (blueprintData.rules && blueprintData.rules.length > 0) {
          const rulesToInsert = blueprintData.rules.map((rule) => ({
            id: rule.id,
            type: rule.type,
            value: rule.value,
            blueprintId: insertedBlueprint.id,
          }));
          await tx.insert(rules).values(rulesToInsert);
        }
        return insertedBlueprint;
      });

      const newBlueprintWithRelations = await db.query.blueprints.findFirst({
        where: (bp, { eq }) => eq(bp.id, createdBlueprint.id),
        with: {
          rules: true,
        },
      });

      return c.json(newBlueprintWithRelations, 201);
    }
  )
  .put(
    "/blueprints/:id",
    zValidator("json", PromptBlueprintSchema),
    async (c) => {
      const { id } = c.req.param();
      const blueprintData = c.req.valid("json");

      const updatedBlueprint = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(blueprints)
          .set({
            name: blueprintData.name,
            role: blueprintData.role,
            taskTemplate: blueprintData.taskTemplate,
            inputSlots: blueprintData.inputSlots,
            outputSchema: blueprintData.outputSchema,
          })
          .where(eq(blueprints.id, id))
          .returning({ id: blueprints.id });

        await tx.delete(rules).where(eq(rules.blueprintId, id));
        if (blueprintData.rules && blueprintData.rules.length > 0) {
          const rulesToInsert = blueprintData.rules.map((rule) => ({
            id: rule.id,
            type: rule.type,
            value: rule.value,
            blueprintId: updated.id,
          }));
          await tx.insert(rules).values(rulesToInsert);
        }
        return updated;
      });

      const updatedBlueprintWithRelations = await db.query.blueprints.findFirst(
        {
          where: (bp, { eq }) => eq(bp.id, updatedBlueprint.id),
          with: {
            rules: true,
          },
        }
      );

      return c.json(updatedBlueprintWithRelations);
    }
  )
  .delete("/blueprints/:id", async (c) => {
    const { id } = c.req.param();
    const [deletedBlueprint] = await db
      .delete(blueprints)
      .where(eq(blueprints.id, id))
      .returning();

    if (!deletedBlueprint) {
      return c.json({ error: "Blueprint not found" }, 404);
    }

    return c.json({ message: "Blueprint deleted successfully" });
  })
  // --- Execution Route ---
  .post("/execute", zValidator("json", executionPayloadSchema), async (c) => {
    const { blueprint, inputs } = c.req.valid("json");

    try {
      const { result, duration } = await promptExecutor.execute(
        blueprint,
        inputs
      );
      return c.json({ ok: true, result, duration });
    } catch (error) {
      console.error(error);
      return c.json(
        {
          ok: false,
          message: "Failed to execute prompt blueprint.",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

export default app;
export type ApiRoutes = typeof routes;
