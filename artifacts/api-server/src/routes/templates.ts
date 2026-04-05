import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import { CreateTemplateBody, DeleteTemplateParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(templatesTable)
    .orderBy(desc(templatesTable.createdAt));

  res.json(
    templates.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db
    .insert(templatesTable)
    .values({
      name: parsed.data.name,
      tone: parsed.data.tone,
      targetAudience: parsed.data.targetAudience ?? null,
      category: parsed.data.category ?? null,
      platform: parsed.data.platform ?? null,
    })
    .returning();

  res.status(201).json({
    ...template,
    createdAt: template.createdAt.toISOString(),
  });
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .delete(templatesTable)
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
