import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetPost, 
  useGeneratePostContent, 
  usePublishPost, 
  useUpdatePost,
  useDeletePost,
  getGetPostQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Instagram, 
  FileVideo, 
  Trash2, 
  CheckCircle, 
  Copy, 
  RefreshCw,
  Hash,
  MessageSquare,
  ArrowLeft,
  Pencil
} from "lucide-react";
import { Link } from "wouter";

export default function PostDetail() {
  const [, params] = useRoute("/posts/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useGetPost(id, { 
    query: { enabled: !!id, queryKey: getGetPostQueryKey(id) } 
  });

  const generateMutation = useGeneratePostContent({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetPostQueryKey(id), data);
        toast({
          title: "Generation Complete",
          description: "AI has crafted your content.",
        });
      },
      onError: () => {
        toast({ title: "Failed to generate", variant: "destructive" });
      }
    }
  });

  const publishMutation = usePublishPost({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetPostQueryKey(id), data);
        toast({
          title: "Marked as Published",
          description: "This post is now tracked as published.",
        });
      },
      onError: () => {
        toast({ title: "Failed to publish", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeletePost({
    mutation: {
      onSuccess: () => {
        toast({ title: "Post deleted" });
        setLocation("/posts");
      }
    }
  });

  const updateMutation = useUpdatePost({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetPostQueryKey(id), data);
        setIsEditing(false);
        toast({ title: "Post updated" });
      }
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{ topic: string, context: string }>({ topic: "", context: "" });

  const handleEditClick = () => {
    if (post) {
      setEditData({ topic: post.topic, context: post.context });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id, data: editData });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `Copied ${type} to clipboard` });
  };

  if (isLoading || !post) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isInstagram = post.platform === "instagram";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <Link href="/posts" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${
              isInstagram 
                ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white' 
                : 'bg-black text-white border border-cyan-400/30'
            }`}>
              {isInstagram ? <Instagram className="w-4 h-4" /> : <FileVideo className="w-4 h-4" />}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-widest ${
              post.status === 'published' ? 'bg-green-500/10 text-green-500' :
              post.status === 'ready' ? 'bg-blue-500/10 text-blue-500' :
              'bg-zinc-500/10 text-zinc-400'
            }`}>
              {post.status}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-4 bg-card p-4 rounded-xl border border-border">
              <Input 
                value={editData.topic} 
                onChange={e => setEditData({ ...editData, topic: e.target.value })}
                className="text-2xl font-bold bg-background/50 border-primary/30"
              />
              <Textarea 
                value={editData.context}
                onChange={e => setEditData({ ...editData, context: e.target.value })}
                className="bg-background/50 min-h-[100px] border-primary/30"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="group relative pr-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight mb-2">
                {post.topic}
              </h1>
              <p className="text-lg text-muted-foreground whitespace-pre-wrap">
                {post.context}
              </p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                onClick={handleEditClick}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            {post.tone && <span className="bg-muted px-2.5 py-1 rounded-md">Tone: <strong className="text-foreground">{post.tone}</strong></span>}
            {post.targetAudience && <span className="bg-muted px-2.5 py-1 rounded-md">Audience: <strong className="text-foreground">{post.targetAudience}</strong></span>}
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
          <Button 
            className="flex-1 md:w-full bg-studio-gradient hover:opacity-90 text-white font-bold shadow-[0_0_15px_rgba(255,0,255,0.3)] gap-2 py-6"
            onClick={() => generateMutation.mutate({ id })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {post.generatedCaption ? "Regenerate AI" : "Generate AI"}
          </Button>

          {post.status === 'ready' && (
            <Button 
              variant="outline"
              className="flex-1 md:w-full border-green-500/30 text-green-500 hover:bg-green-500/10 gap-2"
              onClick={() => publishMutation.mutate({ id })}
              disabled={publishMutation.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              Mark Published
            </Button>
          )}

          <Button 
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 px-3"
            onClick={() => {
              if (confirm("Delete this post permanently?")) {
                deleteMutation.mutate({ id });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {post.generatedCaption ? (
        <div className="grid gap-6 mt-12">
          <Card className="border-border bg-card/50 overflow-hidden border-t-2 border-t-primary/50 relative">
            <div className="absolute top-0 right-0 p-4">
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary gap-1.5" onClick={() => handleCopy(post.generatedCaption!, "Caption")}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Caption
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-lg leading-relaxed text-foreground/90 font-medium">
                {post.generatedCaption}
              </div>
            </CardContent>
          </Card>

          {post.generatedHooks && (
            <Card className="border-border bg-card/50 relative">
              <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-secondary gap-1.5" onClick={() => handleCopy(post.generatedHooks!, "Hooks")}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="w-5 h-5 text-secondary" />
                  Video/Image Hooks
                </CardTitle>
                <CardDescription>First 3 seconds hooks to capture attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-outside ml-5 space-y-2 text-foreground/80">
                  {post.generatedHooks.split('\n').filter(h => h.trim().length > 0).map((hook, i) => (
                    <li key={i} className="pl-1">{hook.replace(/^[-*•]\s*/, '')}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {post.generatedHashtags && (
            <Card className="border-border bg-card/50 relative">
              <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-cyan-400 gap-1.5" onClick={() => handleCopy(post.generatedHashtags!, "Hashtags")}>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="w-5 h-5 text-cyan-400" />
                  Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-cyan-300 font-mono text-sm tracking-wide bg-background/50 p-4 rounded-lg border border-cyan-500/10">
                  {post.generatedHashtags}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="mt-12 text-center py-24 border border-dashed border-primary/20 rounded-2xl bg-card/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-50" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-6 shadow-xl border border-border">
              <Sparkles className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Awaiting AI Generation</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Your brief is ready. Click the generate button above to let AI craft your captions, hooks, and hashtags.
            </p>
            <Button 
              className="bg-studio-gradient hover:opacity-90 text-white font-bold shadow-[0_0_20px_rgba(255,0,255,0.4)] gap-2 px-8 py-6 text-lg"
              onClick={() => generateMutation.mutate({ id })}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Magic
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}