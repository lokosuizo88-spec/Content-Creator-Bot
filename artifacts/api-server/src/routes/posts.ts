import { Router, type IRouter } from "express";
import { eq, desc, and, isNotNull, gte } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import {
  CreatePostBody,
  UpdatePostBody,
  GetPostParams,
  UpdatePostParams,
  DeletePostParams,
  GeneratePostContentParams,
  RegenerateSectionParams,
  RegenerateSectionBody,
  PublishPostParams,
  ListPostsQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function serializePost(p: typeof postsTable.$inferSelect) {
  return {
    ...p,
    scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/posts/export", async (req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .orderBy(desc(postsTable.createdAt));

  const headers = [
    "id", "topic", "context", "platform", "status", "category",
    "tone", "targetAudience", "generatedCaption", "generatedHashtags",
    "scheduledAt", "createdAt",
  ];

  const escape = (v: unknown) => {
    if (v == null) return "";
    const str = String(v).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = posts.map((p) => [
    p.id, p.topic, p.context, p.platform, p.status, p.category ?? "",
    p.tone ?? "", p.targetAudience ?? "",
    p.generatedCaption ?? "", p.generatedHashtags ?? "",
    p.scheduledAt ? p.scheduledAt.toISOString() : "",
    p.createdAt.toISOString(),
  ].map(escape).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `social-ai-posts-${new Date().toISOString().slice(0, 10)}.csv`;

  res.json({ csv, filename });
});

router.get("/posts", async (req, res): Promise<void> => {
  const parsed = ListPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { platform, status, category } = parsed.data;

  const conditions = [];
  if (platform && platform !== "all") {
    conditions.push(eq(postsTable.platform, platform));
  }
  if (status) {
    conditions.push(eq(postsTable.status, status));
  }
  if (category) {
    conditions.push(eq(postsTable.category, category));
  }

  const posts = await db
    .select()
    .from(postsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(postsTable.createdAt));

  res.json(posts.map(serializePost));
});

router.post("/posts", async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;

  const [post] = await db
    .insert(postsTable)
    .values({
      topic: parsed.data.topic,
      context: parsed.data.context,
      platform: parsed.data.platform,
      tone: parsed.data.tone ?? null,
      targetAudience: parsed.data.targetAudience ?? null,
      category: parsed.data.category ?? null,
      scheduledAt: scheduledAt ?? undefined,
      status: parsed.data.status ?? "draft",
    })
    .returning();

  res.status(201).json(serializePost(post));
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

  res.json(serializePost(post));
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
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.generatedCaption !== undefined) updateData.generatedCaption = parsed.data.generatedCaption;
  if (parsed.data.generatedHashtags !== undefined) updateData.generatedHashtags = parsed.data.generatedHashtags;
  if (parsed.data.generatedHooks !== undefined) updateData.generatedHooks = parsed.data.generatedHooks;
  if (parsed.data.generatedVariations !== undefined) updateData.generatedVariations = parsed.data.generatedVariations;
  if (parsed.data.scheduledAt !== undefined) {
    updateData.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  }

  const [post] = await db
    .update(postsTable)
    .set(updateData)
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(serializePost(post));
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

async function generateContent(post: typeof postsTable.$inferSelect) {
  const platformName = post.platform === "instagram" ? "Instagram" : "TikTok";
  const toneInstruction = post.tone ? `Tone: ${post.tone}.` : "";
  const audienceInstruction = post.targetAudience ? `Target audience: ${post.targetAudience}.` : "";

  const systemPrompt = `You are an expert social media content creator specializing in viral ${platformName} content.
${toneInstruction} ${audienceInstruction}
Always respond with valid JSON only, no extra text or markdown.`;

  const userPrompt = `Create ${platformName} content for:
Topic: ${post.topic}
Context: ${post.context}

Respond with a JSON object with exactly these fields:
- "caption": A compelling ${platformName} caption (${post.platform === "instagram" ? "up to 2200 chars, engaging, with line breaks" : "short and punchy, max 150 chars"})
- "hashtags": Relevant hashtags as a single string (${post.platform === "instagram" ? "20-30 hashtags" : "5-10 trending hashtags"})
- "hooks": Array of 3 scroll-stopping opening hooks (short, punchy, designed to stop the scroll)
- "variations": Array of 3 alternative full captions with different angles/styles for A/B testing

Return only the JSON object.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as {
      caption?: string;
      hashtags?: string;
      hooks?: string[];
      variations?: string[];
    };
  } catch {
    return {};
  }
}

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

  const parsed = await generateContent(post);

  const [updated] = await db
    .update(postsTable)
    .set({
      generatedCaption: parsed.caption ?? null,
      generatedHashtags: parsed.hashtags ?? null,
      generatedHooks: parsed.hooks ? JSON.stringify(parsed.hooks) : null,
      generatedVariations: parsed.variations ? JSON.stringify(parsed.variations) : null,
      status: "ready",
    })
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(serializePost(updated));
});

router.post("/posts/:id/regenerate-section", async (req, res): Promise<void> => {
  const params = RegenerateSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RegenerateSectionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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

  const section = body.data.section;
  const platformName = post.platform === "instagram" ? "Instagram" : "TikTok";
  const toneInstruction = post.tone ? `Tone: ${post.tone}.` : "";
  const audienceInstruction = post.targetAudience ? `Target audience: ${post.targetAudience}.` : "";

  const sectionPrompts: Record<string, string> = {
    caption: `Generate a new ${platformName} caption for:
Topic: ${post.topic}
Context: ${post.context}
${toneInstruction} ${audienceInstruction}
Respond with JSON: { "caption": "..." }`,

    hashtags: `Generate new ${platformName} hashtags for:
Topic: ${post.topic}
${post.platform === "instagram" ? "Include 20-30 hashtags" : "Include 5-10 trending hashtags"}.
Respond with JSON: { "hashtags": "..." }`,

    hooks: `Generate 3 new scroll-stopping opening hooks for a ${platformName} post about:
Topic: ${post.topic}
Context: ${post.context}
${toneInstruction}
Each hook must be short, punchy, and designed to stop the scroll.
Respond with JSON: { "hooks": ["hook1", "hook2", "hook3"] }`,

    variations: `Generate 3 alternative ${platformName} captions with different angles for:
Topic: ${post.topic}
Context: ${post.context}
${toneInstruction} ${audienceInstruction}
Each variation should have a different style, angle, or emotional approach.
Respond with JSON: { "variations": ["caption1", "caption2", "caption3"] }`,
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are an expert ${platformName} content creator. Respond with valid JSON only.`,
      },
      { role: "user", content: sectionPrompts[section] ?? "" },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (section === "caption" && parsed.caption) updateData.generatedCaption = String(parsed.caption);
  if (section === "hashtags" && parsed.hashtags) updateData.generatedHashtags = String(parsed.hashtags);
  if (section === "hooks" && Array.isArray(parsed.hooks)) updateData.generatedHooks = JSON.stringify(parsed.hooks);
  if (section === "variations" && Array.isArray(parsed.variations)) updateData.generatedVariations = JSON.stringify(parsed.variations);

  const [updated] = await db
    .update(postsTable)
    .set(updateData)
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(serializePost(updated));
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

  res.json(serializePost(post));
});

export default router;
