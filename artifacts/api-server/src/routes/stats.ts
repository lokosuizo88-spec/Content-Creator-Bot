import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      status: postsTable.status,
      platform: postsTable.platform,
      count: sql<number>`count(*)::int`,
    })
    .from(postsTable)
    .groupBy(postsTable.status, postsTable.platform);

  let totalPosts = 0;
  let draftPosts = 0;
  let readyPosts = 0;
  let publishedPosts = 0;
  let instagramPosts = 0;
  let tiktokPosts = 0;

  for (const row of rows) {
    totalPosts += row.count;
    if (row.status === "draft") draftPosts += row.count;
    if (row.status === "ready") readyPosts += row.count;
    if (row.status === "published") publishedPosts += row.count;
    if (row.platform === "instagram") instagramPosts += row.count;
    if (row.platform === "tiktok") tiktokPosts += row.count;
  }

  res.json({ totalPosts, draftPosts, readyPosts, publishedPosts, instagramPosts, tiktokPosts });
});

router.get("/stats/recent", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .orderBy(desc(postsTable.createdAt))
    .limit(10);

  res.json(posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })));
});

export default router;
