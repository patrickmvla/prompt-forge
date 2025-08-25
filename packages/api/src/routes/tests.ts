import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PromptTestSchema } from '@promptforge/shared';
import { db } from '../db';
import { tests } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// POST /:blueprintId/tests -> Create a new test for a blueprint
app.post(
  '/:blueprintId/tests',
  zValidator('json', PromptTestSchema.omit({ id: true })),
  async (c) => {
    const { blueprintId } = c.req.param();
    const testData = c.req.valid('json');

    const [newTest] = await db
      .insert(tests)
      .values({ ...testData, blueprintId })
      .returning();

    return c.json(newTest, 201);
  }
);

// PUT /tests/:testId -> Update a test
app.put(
  '/tests/:testId',
  zValidator('json', PromptTestSchema.omit({ id: true })),
  async (c) => {
    const { testId } = c.req.param();
    const testData = c.req.valid('json');

    const [updatedTest] = await db
      .update(tests)
      .set(testData)
      .where(eq(tests.id, testId))
      .returning();

    if (!updatedTest) {
      return c.json({ error: 'Test not found' }, 404);
    }
    return c.json(updatedTest);
  }
);

// DELETE /tests/:testId -> Delete a test
app.delete('/tests/:testId', async (c) => {
  const { testId } = c.req.param();
  const [deletedTest] = await db
    .delete(tests)
    .where(eq(tests.id, testId))
    .returning();

  if (!deletedTest) {
    return c.json({ error: 'Test not found' }, 404);
  }
  return c.json({ message: 'Test deleted successfully' });
});


export default app;
