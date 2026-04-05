import { useState } from "react";
import { useListPosts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Instagram, FileVideo, Search, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function Posts() {
  const [platform, setPlatform] = useState<"all" | "instagram" | "tiktok">("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: posts, isLoading } = useListPosts(
    { 
      platform: platform === "all" ? undefined : platform, 
      status: status === "all" ? undefined : (status as any)
    }
  );

  const filteredPosts = posts?.filter(post => 
    post.topic.toLowerCase().includes(search.toLowerCase()) || 
    post.context.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Content Library</h1>
        <p className="text-muted-foreground mt-2">Every idea, draft, and hit in one place.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search topics or context..." 
            className="pl-9 bg-background/50 border-muted focus-visible:ring-primary/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredPosts?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/30">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No posts found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          filteredPosts?.map((post, i) => (
            <Link key={post.id} href={`/posts/${post.id}`} className="block group">
              <Card className="bg-card border-border hover:border-primary/40 transition-all duration-300 transform group-hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    post.platform === 'instagram' 
                      ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20'
                      : 'bg-black text-white shadow-[0_0_10px_rgba(0,255,255,0.3)] border border-cyan-400/30'
                  }`}>
                    {post.platform === 'instagram' ? <Instagram className="w-6 h-6" /> : <FileVideo className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {post.topic}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {post.generatedCaption || post.context}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0 md:pl-4 md:border-l border-border mt-4 md:mt-0">
                    <div className="flex items-center text-xs text-muted-foreground gap-1.5 hidden md:flex">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(post.createdAt), 'MMM d, yyyy')}
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold tracking-wider ${
                      post.status === 'published' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      post.status === 'ready' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                      'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {post.status.toUpperCase()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 duration-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}