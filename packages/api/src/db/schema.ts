import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const ruleTypeEnum = pgEnum("rule_type", ["HARD", "SOFT"]);

export const blueprints = pgTable("blueprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  role: text("role").notNull(),
  taskTemplate: text("task_template").notNull(),
  inputSlots: jsonb("input_slots")
    .$type<
      Record<string, { name: string; type: "string" | "number" | "date" }>
    >()
    .notNull()
    .default({}),
  outputSchema: jsonb("output_schema")
    .$type<Record<string, any>>()
    .notNull()
    .default({}),
});

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: ruleTypeEnum("type").notNull(),
  value: text("value").notNull(),
  blueprintId: uuid("blueprint_id")
    .notNull()
    .references(() => blueprints.id, { onDelete: "cascade" }),
});

export const blueprintRelations = relations(blueprints, ({ many }) => ({
  rules: many(rules),
}));

export const ruleRelations = relations(rules, ({ one }) => ({
  blueprint: one(blueprints, {
    fields: [rules.blueprintId],
    references: [blueprints.id],
  }),
}));
