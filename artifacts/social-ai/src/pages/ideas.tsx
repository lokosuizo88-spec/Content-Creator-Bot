import { useState } from "react";
import { useListPosts, useCreatePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Plus, ArrowRight, Instagram, FileVideo } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Ideas() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "tiktok">("instagram");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ideas, isLoading } = useListPosts({ status: "idea" });
  const createPost = useCreatePost();

  const handleSaveIdea = () => {
    if (!topic.trim()) return;

    createPost.mutate({
      data: {
        topic,
        platform,
        context: "",
        status: "idea"
      }
    }, {
      onSuccess: () => {
        toast({ title: "Idea guardada" });
        setTopic("");
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey({ status: "idea" }) });
      }
    });
  };

  const handleDevelop = (idea: any) => {
    setLocation(`/create?topic=${encodeURIComponent(idea.topic)}&platform=${idea.platform}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Lightbulb className="w-8 h-8 text-yellow-400" />
          Banco de Ideas
        </h1>
        <p className="text-muted-foreground mt-2">Vuelca tus ideas aqui. Las desarrollas cuando quieras.</p>
      </div>

      <Card className="bg-card border-primary/30 shadow-lg shadow-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input 
              placeholder="Tu idea... Ej: 3 formas de mejorar tu postura en casa..." 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="flex-1 text-lg py-6 bg-background/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveIdea()}
            />
            <div className="flex gap-2">
              <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                <SelectTrigger className="w-[140px] py-6 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSaveIdea}
                disabled={!topic.trim() || createPost.isPending}
                className="py-6 px-6 bg-studio-gradient hover:opacity-90 font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : ideas?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/30">
            <p className="text-muted-foreground text-lg">Tu banco de ideas esta vacio. Hora de generar ideas.</p>
          </div>
        ) : (
          ideas?.map((idea) => (
            <Card key={idea.id} className="bg-card border-border hover:border-primary/40 transition-colors group">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    idea.platform === 'instagram' 
                      ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white'
                      : 'bg-black text-white border border-cyan-400/30'
                  }`}>
                    {idea.platform === 'instagram' ? <Instagram className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">{idea.topic}</h3>
                    <p className="text-sm text-muted-foreground">Guardada el {format(new Date(idea.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => handleDevelop(idea)}
                  className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                >
                  Desarrollar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
