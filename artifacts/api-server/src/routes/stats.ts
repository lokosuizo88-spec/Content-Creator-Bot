import { Router, type IRouter } from "express";
import { desc, eq, sql, isNotNull, gte, and } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";

const router: IRouter = Router();

function serializePost(p: typeof postsTable.$inferSelect) {
  return {
    ...p,
    scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      status: postsTable.status,
      platform: postsTable.platform,
      count: sql<number>`count(*)::int`,
    })
    .from(postsTable)
    .groupBy(postsTable.status, postsTable.platform);

  const scheduledRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(isNotNull(postsTable.scheduledAt));

  let totalPosts = 0;
  let draftPosts = 0;
  let readyPosts = 0;
  let publishedPosts = 0;
  let ideaPosts = 0;
  let instagramPosts = 0;
  let tiktokPosts = 0;

  for (const row of rows) {
    totalPosts += row.count;
    if (row.status === "draft") draftPosts += row.count;
    if (row.status === "ready") readyPosts += row.count;
    if (row.status === "published") publishedPosts += row.count;
    if (row.status === "idea") ideaPosts += row.count;
    if (row.platform === "instagram") instagramPosts += row.count;
    if (row.platform === "tiktok") tiktokPosts += row.count;
  }

  const scheduledPosts = scheduledRows[0]?.count ?? 0;

  res.json({
    totalPosts,
    draftPosts,
    readyPosts,
    publishedPosts,
    ideaPosts,
    scheduledPosts,
    instagramPosts,
    tiktokPosts,
  });
});

router.get("/stats/recent", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.status, "ready"))
    .orderBy(desc(postsTable.updatedAt))
    .limit(10);

  const ideas = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.status, "idea"))
    .orderBy(desc(postsTable.createdAt))
    .limit(5);

  const all = [...posts, ...ideas].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  ).slice(0, 10);

  res.json(all.map(serializePost));
});

router.get("/stats/by-category", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: postsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(postsTable)
    .where(isNotNull(postsTable.category))
    .groupBy(postsTable.category)
    .orderBy(sql`count(*) desc`);

  res.json(
    rows.map((r) => ({
      category: r.category ?? "other",
      count: r.count,
    }))
  );
});

router.get("/stats/scheduled", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .where(
      and(
        isNotNull(postsTable.scheduledAt),
        gte(postsTable.scheduledAt, new Date())
      )
    )
    .orderBy(postsTable.scheduledAt);

  res.json(posts.map(serializePost));
});

export default router;
