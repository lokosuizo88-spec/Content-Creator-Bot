import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  context: text("context").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("draft"),
  category: text("category"),
  generatedCaption: text("generated_caption"),
  generatedHashtags: text("generated_hashtags"),
  generatedHooks: text("generated_hooks"),
  generatedVariations: text("generated_variations"),
  tone: text("tone"),
  targetAudience: text("target_audience"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
