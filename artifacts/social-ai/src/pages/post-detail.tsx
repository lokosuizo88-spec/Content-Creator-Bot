import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetPost, 
  useGeneratePostContent, 
  usePublishPost, 
  useUpdatePost,
  useDeletePost,
  getGetPostQueryKey,
  useRegenerateSection
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
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
  Pencil,
  Eye,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  CalendarDays
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function InstagramPreview({ post }: { post: any }) {
  return (
    <div className="w-[350px] mx-auto bg-black rounded-3xl overflow-hidden border-4 border-zinc-800 shadow-2xl relative mt-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-20"></div>
      <div className="p-3 flex items-center justify-between border-b border-zinc-800 bg-black z-10 relative mt-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-[2px]">
            <div className="w-full h-full bg-black rounded-full border border-black"></div>
          </div>
          <span className="text-white font-semibold text-sm">@tuusuario</span>
        </div>
      </div>
      <div className="aspect-square bg-zinc-900 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
        <Instagram className="w-16 h-16 text-zinc-700 relative z-10" />
      </div>
      <div className="p-3 bg-black">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-4">
            <Heart className="w-6 h-6 text-white" />
            <MessageCircle className="w-6 h-6 text-white" />
            <Send className="w-6 h-6 text-white" />
          </div>
          <Bookmark className="w-6 h-6 text-white" />
        </div>
        <div className="text-white text-sm">
          <span className="font-semibold mr-2">@tuusuario</span>
          <span className="whitespace-pre-wrap">{post.generatedCaption || "Sin caption todavia"}</span>
        </div>
        {post.generatedHashtags && (
          <div className="text-blue-400 text-sm mt-1">{post.generatedHashtags}</div>
        )}
      </div>
    </div>
  );
}

function TiktokPreview({ post }: { post: any }) {
  const firstHook = post.generatedHooks ? post.generatedHooks.split('\n')[0].replace(/^[-*•]\s*/, '') : "Hook de ejemplo";
  return (
    <div className="w-[350px] mx-auto h-[700px] bg-black rounded-3xl overflow-hidden border-4 border-zinc-800 shadow-2xl relative mt-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-20"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black">
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
           <h2 className="text-white text-3xl font-bold drop-shadow-lg">{firstHook}</h2>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-20">
        <div className="flex justify-between items-end">
          <div className="flex-1 pr-12">
            <h3 className="text-white font-bold text-sm mb-1">@tuusuario</h3>
            <p className="text-white text-sm line-clamp-2">{post.generatedCaption || "Descripcion aqui"}</p>
            {post.generatedHashtags && (
               <div className="text-white font-bold text-sm mt-1">{post.generatedHashtags.split(' ').slice(0,3).join(' ')}</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white border border-white"></div>
            <div className="flex flex-col items-center">
              <Heart className="w-8 h-8 text-white fill-white" />
              <span className="text-white text-xs mt-1">12K</span>
            </div>
            <div className="flex flex-col items-center">
              <MessageCircle className="w-8 h-8 text-white fill-white" />
              <span className="text-white text-xs mt-1">345</span>
            </div>
            <div className="flex flex-col items-center">
              <Send className="w-8 h-8 text-white fill-white" />
              <span className="text-white text-xs mt-1">112</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: "borrador",
    ready: "listo",
    published: "publicado",
    idea: "idea",
  };
  return map[status] || status;
};

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
          title: "Generacion completada",
          description: "La IA ha creado tu contenido.",
        });
      },
      onError: () => {
        toast({ title: "Error al generar contenido", variant: "destructive" });
      }
    }
  });

  const regenerateSectionMutation = useRegenerateSection({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetPostQueryKey(id), data);
        toast({ title: "Seccion regenerada" });
      }
    }
  });

  const publishMutation = usePublishPost({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetPostQueryKey(id), data);
        toast({
          title: "Marcado como publicado",
          description: "Este post queda registrado como publicado.",
        });
      },
      onError: () => {
        toast({ title: "Error al publicar", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeletePost({
    mutation: {
      onSuccess: () => {
        toast({ title: "Post eliminado" });
        setLocation("/posts");
      }
    }
  });

  const updateMutation = useUpdatePost({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetPostQueryKey(id), data);
        setIsEditing(false);
        setIsScheduling(false);
        toast({ title: "Post actualizado" });
      }
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [editData, setEditData] = useState<{ topic: string, context: string }>({ topic: "", context: "" });
  const [scheduleDate, setScheduleDate] = useState("");

  const handleEditClick = () => {
    if (post) {
      setEditData({ topic: post.topic, context: post.context });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id, data: editData });
  };

  const handleSaveSchedule = () => {
    const isoDate = new Date(scheduleDate).toISOString();
    updateMutation.mutate({ id, data: { scheduledAt: isoDate } });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${type} copiado al portapapeles` });
  };

  const handleSelectVariation = (caption: string) => {
    updateMutation.mutate({ id, data: { generatedCaption: caption } });
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
  let variations: string[] = [];
  try {
    if (post.generatedVariations) {
      variations = JSON.parse(post.generatedVariations);
    }
  } catch (e) {
    console.error("Failed to parse variations", e);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <Link href="/posts" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a la Biblioteca
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
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
              {statusLabel(post.status)}
            </span>
            {post.category && (
              <span className="text-xs px-2 py-1 bg-muted rounded-full">
                {post.category}
              </span>
            )}
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => setIsScheduling(!isScheduling)}>
                <CalendarDays className="w-3.5 h-3.5 mr-1" />
                {post.scheduledAt ? format(new Date(post.scheduledAt), "d MMM, HH:mm", { locale: es }) : "Programar"}
              </Button>
            </div>
          </div>

          {isScheduling && (
             <div className="mb-4 p-3 bg-card border border-primary/30 rounded-xl flex gap-2 items-center w-max">
               <Input type="datetime-local" className="bg-background" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
               <Button size="sm" onClick={handleSaveSchedule}>Guardar</Button>
             </div>
          )}

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
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>Guardar Cambios</Button>
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
            {post.tone && <span className="bg-muted px-2.5 py-1 rounded-md">Tono: <strong className="text-foreground">{post.tone}</strong></span>}
            {post.targetAudience && <span className="bg-muted px-2.5 py-1 rounded-md">Audiencia: <strong className="text-foreground">{post.targetAudience}</strong></span>}
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:w-full border-primary/30 hover:bg-primary/10 text-primary gap-2">
                <Eye className="w-4 h-4" />
                Vista Previa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-transparent border-none shadow-none p-0">
              <DialogTitle className="sr-only">Vista previa del post</DialogTitle>
              {isInstagram ? <InstagramPreview post={post} /> : <TiktokPreview post={post} />}
            </DialogContent>
          </Dialog>

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
            {post.generatedCaption ? "Regenerar Todo" : "Generar con IA"}
          </Button>

          {post.status === 'ready' && (
            <Button 
              variant="outline"
              className="flex-1 md:w-full border-green-500/30 text-green-500 hover:bg-green-500/10 gap-2"
              onClick={() => publishMutation.mutate({ id })}
              disabled={publishMutation.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              Marcar como Publicado
            </Button>
          )}

          <Button 
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 px-3"
            onClick={() => {
              if (confirm("Eliminar este post permanentemente?")) {
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
            <div className="absolute top-0 right-0 p-4 flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary gap-1.5" onClick={() => regenerateSectionMutation.mutate({ id, data: { section: "caption" } })} disabled={regenerateSectionMutation.isPending}>
                <RefreshCw className={`w-3.5 h-3.5 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} /> Regenerar
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary gap-1.5" onClick={() => handleCopy(post.generatedCaption!, "Caption")}>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </Button>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Caption Principal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-lg leading-relaxed text-foreground/90 font-medium">
                {post.generatedCaption}
              </div>
            </CardContent>
          </Card>

          {variations.length > 0 && (
            <Card className="border-border bg-card/50 relative">
              <div className="absolute top-0 right-0 p-4">
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary gap-1.5" onClick={() => regenerateSectionMutation.mutate({ id, data: { section: "variations" } })} disabled={regenerateSectionMutation.isPending}>
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} /> Regenerar
                </Button>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Variaciones Alternativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {variations.map((v, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-background/50 hover:border-primary/50 transition-colors group">
                      <p className="whitespace-pre-wrap text-sm mb-4">{v}</p>
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => handleSelectVariation(v)}>Usar como Principal</Button>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleCopy(v, "Variacion")}><Copy className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {post.generatedHooks && (
            <Card className="border-border bg-card/50 relative">
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-secondary gap-1.5" onClick={() => regenerateSectionMutation.mutate({ id, data: { section: "hooks" } })} disabled={regenerateSectionMutation.isPending}>
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} /> Regenerar
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-secondary gap-1.5" onClick={() => handleCopy(post.generatedHooks!, "Hooks")}>
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </Button>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="w-5 h-5 text-secondary" />
                  Hooks para Video/Imagen
                </CardTitle>
                <CardDescription>Primeros 3 segundos para captar la atencion</CardDescription>
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
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-cyan-400 gap-1.5" onClick={() => regenerateSectionMutation.mutate({ id, data: { section: "hashtags" } })} disabled={regenerateSectionMutation.isPending}>
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerateSectionMutation.isPending ? 'animate-spin' : ''}`} /> Regenerar
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-cyan-400 gap-1.5" onClick={() => handleCopy(post.generatedHashtags!, "Hashtags")}>
                  <Copy className="w-3.5 h-3.5" /> Copiar
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
            <h3 className="text-2xl font-bold mb-3 text-foreground">Esperando generacion de IA</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Tu brief esta listo. Pulsa el boton de generar para que la IA cree tus captions, hooks y hashtags.
            </p>
            <Button 
              className="bg-studio-gradient hover:opacity-90 text-white font-bold shadow-[0_0_20px_rgba(255,0,255,0.4)] gap-2 px-8 py-6 text-lg"
              onClick={() => generateMutation.mutate({ id })}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generar Contenido
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
