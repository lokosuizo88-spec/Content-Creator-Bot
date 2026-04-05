import { Router, type IRouter } from "express";
import { eq, desc, count, and } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import {
  CreatePostBody,
  UpdatePostBody,
  GetPostParams,
  UpdatePostParams,
  DeletePostParams,
  GeneratePostContentParams,
  PublishPostParams,
  ListPostsQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/posts", async (req, res): Promise<void> => {
  const parsed = ListPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { platform, status } = parsed.data;

  const conditions = [];
  if (platform && platform !== "all") {
    conditions.push(eq(postsTable.platform, platform));
  }
  if (status) {
    conditions.push(eq(postsTable.status, status));
  }

  const posts = await db
    .select()
    .from(postsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(postsTable.createdAt));

  res.json(posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })));
});

router.post("/posts", async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({
      topic: parsed.data.topic,
      context: parsed.data.context,
      platform: parsed.data.platform,
      tone: parsed.data.tone ?? null,
      targetAudience: parsed.data.targetAudience ?? null,
      status: "draft",
    })
    .returning();

  res.status(201).json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

router.get("/posts/:id", async (req, res): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

router.put("/posts/:id", async (req, res): Promise<void> => {
  const params = UpdatePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.topic !== undefined) updateData.topic = parsed.data.topic;
  if (parsed.data.context !== undefined) updateData.context = parsed.data.context;
  if (parsed.data.platform !== undefined) updateData.platform = parsed.data.platform;
  if (parsed.data.tone !== undefined) updateData.tone = parsed.data.tone;
  if (parsed.data.targetAudience !== undefined) updateData.targetAudience = parsed.data.targetAudience;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.generatedCaption !== undefined) updateData.generatedCaption = parsed.data.generatedCaption;
  if (parsed.data.generatedHashtags !== undefined) updateData.generatedHashtags = parsed.data.generatedHashtags;
  if (parsed.data.generatedHooks !== undefined) updateData.generatedHooks = parsed.data.generatedHooks;

  const [post] = await db
    .update(postsTable)
    .set(updateData)
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

router.delete("/posts/:id", async (req, res): Promise<void> => {
  const params = DeletePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .delete(postsTable)
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/posts/:id/generate", async (req, res): Promise<void> => {
  const params = GeneratePostContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const platformName = post.platform === "instagram" ? "Instagram" : "TikTok";
  const toneInstruction = post.tone ? `Tone: ${post.tone}.` : "";
  const audienceInstruction = post.targetAudience ? `Target audience: ${post.targetAudience}.` : "";

  const systemPrompt = `You are an expert social media content creator specializing in ${platformName} content. 
You create engaging, viral-worthy content that drives high engagement. 
${toneInstruction} ${audienceInstruction}
Always respond with valid JSON only, no extra text.`;

  const userPrompt = `Create ${platformName} content for the following:
Topic: ${post.topic}
Context: ${post.context}

Respond with a JSON object containing exactly these fields:
- "caption": A compelling ${platformName} caption (${post.platform === "instagram" ? "up to 2200 characters, engaging, with line breaks for readability" : "short and punchy, max 150 chars for TikTok description"})
- "hashtags": A string of relevant hashtags separated by spaces (${post.platform === "instagram" ? "20-30 hashtags" : "5-10 trending hashtags"})
- "hooks": Three different opening hook ideas as a JSON array of strings, each designed to stop the scroll and capture attention immediately

Return only the JSON object, no markdown formatting.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  
  let parsed: { caption?: string; hashtags?: string; hooks?: string[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    req.log.error({ rawContent }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const [updated] = await db
    .update(postsTable)
    .set({
      generatedCaption: parsed.caption ?? null,
      generatedHashtags: parsed.hashtags ?? null,
      generatedHooks: parsed.hooks ? JSON.stringify(parsed.hooks) : null,
      status: "ready",
    })
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.post("/posts/:id/publish", async (req, res): Promise<void> => {
  const params = PublishPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .update(postsTable)
    .set({ status: "published" })
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

export default router;
