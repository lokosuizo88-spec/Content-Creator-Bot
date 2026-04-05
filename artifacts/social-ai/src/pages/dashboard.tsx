import { useGetStatsSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Activity, LayoutDashboard, Instagram, FileVideo, CheckCircle, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: recentPosts, isLoading: recentLoading } = useGetRecentActivity();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your creative studio pipeline.
          </p>
        </div>
        <Link href="/create" className="shrink-0">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_25px_rgba(255,0,255,0.5)] transition-all duration-300 gap-2 font-bold px-6">
            <PlusCircle className="w-5 h-5" />
            New Post Idea
          </Button>
        </Link>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card hover:border-primary/50 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalPosts}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card hover:border-secondary/50 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
              <Clock className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.draftPosts}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card hover:border-green-500/50 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready & Published</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.readyPosts + stats.publishedPosts}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card hover:border-blue-500/50 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Split</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="flex items-end gap-4 mt-2">
               <div className="flex items-center gap-1.5">
                 <Instagram className="w-4 h-4 text-pink-500" />
                 <span className="font-semibold">{stats.instagramPosts}</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <FileVideo className="w-4 h-4 text-cyan-400" />
                 <span className="font-semibold">{stats.tiktokPosts}</span>
               </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Activity</h2>
          <Link href="/posts">
            <Button variant="link" className="text-muted-foreground hover:text-primary">
              View All
            </Button>
          </Link>
        </div>
        
        <div className="space-y-4">
          {recentLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : recentPosts?.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
              <p className="text-muted-foreground">No recent posts found.</p>
              <Link href="/create" className="mt-4 inline-block">
                <Button variant="outline" className="border-primary/50 text-primary">Start creating</Button>
              </Link>
            </div>
          ) : (
            recentPosts?.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="block">
                <Card className="bg-card border-border hover:border-primary/50 transition-all duration-200 group cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      post.platform === 'instagram' 
                        ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white'
                        : 'bg-black text-white shadow-[0_0_5px_rgba(0,255,255,0.5)] border border-cyan-400/30'
                    }`}>
                      {post.platform === 'instagram' ? <Instagram className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{post.topic}</h4>
                      <p className="text-sm text-muted-foreground truncate">{post.context}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        post.status === 'published' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                        post.status === 'ready' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {post.status.toUpperCase()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}