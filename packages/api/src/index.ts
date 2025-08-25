import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  PromptBlueprintSchema,
  PromptTestSchema,
  AssertionSchema,
} from "@promptforge/shared";
import { db } from "./db";
import { blueprints, rules, tests } from "./db/schema";
import { promptExecutor } from "./core/prompt-executor";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { assertionEngine } from "./core/assertion-engine";

const app = new Hono();

const executionPayloadSchema = z.object({
  blueprint: PromptBlueprintSchema,
  inputs: z.record(z.string(), z.any()),
});

const routes = app
  // --- Blueprint CRUD ---
  .get("/blueprints", async (c) => {
    const allBlueprints = await db.query.blueprints.findMany({
      with: { rules: true, tests: true },
    });
    return c.json(allBlueprints);
  })
  .post(
    "/blueprints",
    zValidator("json", PromptBlueprintSchema.omit({ id: true, tests: true })),
    async (c) => {
      const blueprintData = c.req.valid("json");

      try {
        const newBlueprint = await db.transaction(async (tx) => {
          const [inserted] = await tx
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
            const rulesToInsert = blueprintData.rules.map(
              ({ id, ...rest }) => ({
                ...rest,
                blueprintId: inserted.id,
              })
            );
            await tx.insert(rules).values(rulesToInsert);
          }
          return inserted;
        });

        const newBlueprintWithRelations = await db.query.blueprints.findFirst({
          where: (bp, { eq }) => eq(bp.id, newBlueprint.id),
          with: { rules: true, tests: true },
        });
        return c.json(newBlueprintWithRelations, 201);
      } catch (error) {
        // THIS WILL CATCH THE DATABASE ERROR
        console.error("!!! FAILED TO CREATE BLUEPRINT TRANSACTION:", error);

        // Return a detailed error response for debugging
        return c.json(
          {
            message: "Failed to create blueprint due to a server error.",
            errorDetails:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : String(error),
          },
          500
        );
      }
    }
  )
  .put(
    "/blueprints/:id",
    zValidator("json", PromptBlueprintSchema.omit({ tests: true })),
    async (c) => {
      const { id } = c.req.param();
      const blueprintData = c.req.valid("json");

      const updated = await db.transaction(async (tx) => {
        const [updatedBp] = await tx
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
          // Omit the client-generated 'id' from each rule before inserting
          const rulesToInsert = blueprintData.rules.map(({ id, ...rest }) => ({
            ...rest,
            blueprintId: updatedBp.id,
          }));
          await tx.insert(rules).values(rulesToInsert);
        }
        return updatedBp;
      });

      const updatedBlueprintWithRelations = await db.query.blueprints.findFirst(
        {
          where: (bp, { eq }) => eq(bp.id, updated.id),
          with: { rules: true, tests: true },
        }
      );
      return c.json(updatedBlueprintWithRelations);
    }
  )
  .delete("/blueprints/:id", async (c) => {
    const { id } = c.req.param();
    const [deleted] = await db
      .delete(blueprints)
      .where(eq(blueprints.id, id))
      .returning();
    if (!deleted) return c.json({ error: "Blueprint not found" }, 404);
    return c.json({ message: "Blueprint deleted" });
  })
  // --- Test CRUD ---
  .post(
    "/blueprints/:blueprintId/tests",
    zValidator("json", PromptTestSchema.omit({ id: true })),
    async (c) => {
      const { blueprintId } = c.req.param();
      const testData = c.req.valid("json");
      const [newTest] = await db
        .insert(tests)
        .values({ ...testData, blueprintId })
        .returning();
      return c.json(newTest, 201);
    }
  )
  .put(
    "/tests/:testId",
    zValidator("json", PromptTestSchema.omit({ id: true })),
    async (c) => {
      const { testId } = c.req.param();
      const testData = c.req.valid("json");
      const [updatedTest] = await db
        .update(tests)
        .set(testData)
        .where(eq(tests.id, testId))
        .returning();
      if (!updatedTest) return c.json({ error: "Test not found" }, 404);
      return c.json(updatedTest);
    }
  )
  .delete("/tests/:testId", async (c) => {
    const { testId } = c.req.param();
    const [deletedTest] = await db
      .delete(tests)
      .where(eq(tests.id, testId))
      .returning();
    if (!deletedTest) return c.json({ error: "Test not found" }, 404);
    return c.json({ message: "Test deleted" });
  })
  // --- Test Runner ---
  .post("/tests/:testId/run", async (c) => {
    const { testId } = c.req.param();
    const test = await db.query.tests.findFirst({
      where: eq(tests.id, testId),
      with: {
        blueprint: {
          with: {
            rules: true,
          },
        },
      },
    });

    if (!test || !test.blueprint) {
      return c.json({ error: "Test or associated blueprint not found" }, 404);
    }

    try {
      const { result, duration } = await promptExecutor.execute(
        test.blueprint,
        test.inputs
      );

      const parsedAssertions = z
        .array(AssertionSchema)
        .parse(test.assertions || []);

      const assertionResults = assertionEngine.run(result, parsedAssertions);
      const allPassed = assertionResults.every((r) => r.passed);

      return c.json({
        ok: true,
        passed: allPassed,
        result,
        duration,
        assertionResults,
      });
    } catch (error) {
      return c.json(
        {
          ok: false,
          message: "Test execution failed",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  })
  // --- Execution ---
  .post("/execute", zValidator("json", executionPayloadSchema), async (c) => {
    const { blueprint, inputs } = c.req.valid("json");
    try {
      const { result, duration } = await promptExecutor.execute(
        blueprint,
        inputs
      );
      return c.json({ ok: true, result, duration });
    } catch (error) {
      return c.json(
        {
          ok: false,
          message: "Failed to execute",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

export default app;
export type ApiRoutes = typeof routes;
