import { useState } from "react";
import { useListPosts, useExportPosts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Instagram, FileVideo, Search, Calendar, ChevronRight, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: "BORRADOR",
    ready: "LISTO",
    published: "PUBLICADO",
    idea: "IDEA",
  };
  return map[status] || status.toUpperCase();
};

export default function Posts() {
  const [platform, setPlatform] = useState<"all" | "instagram" | "tiktok">("all");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: posts, isLoading } = useListPosts(
    { 
      platform: platform === "all" ? undefined : platform, 
      status: status === "all" ? undefined : (status as any),
      category: category === "all" ? undefined : category
    }
  );

  const exportMutation = useExportPosts({
    query: {
      enabled: false,
    }
  });

  const handleExport = async () => {
    try {
      const { data } = await exportMutation.refetch();
      if (data && data.csv) {
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
        toast({ title: "Exportacion exitosa", description: "CSV descargado." });
      }
    } catch (error) {
      toast({ title: "Error al exportar", variant: "destructive" });
    }
  };

  const filteredPosts = posts?.filter(post => 
    post.topic.toLowerCase().includes(search.toLowerCase()) || 
    post.context.toLowerCase().includes(search.toLowerCase())
  );

  const commonCategories = ["lifestyle", "food", "fitness", "travel", "beauty", "fashion", "education", "business", "entertainment", "tech", "other"];
  const categoryLabels: Record<string, string> = {
    lifestyle: "Estilo de vida",
    food: "Comida",
    fitness: "Fitness",
    travel: "Viajes",
    beauty: "Belleza",
    fashion: "Moda",
    education: "Educacion",
    business: "Negocios",
    entertainment: "Entretenimiento",
    tech: "Tecnologia",
    other: "Otro",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Biblioteca de Contenido</h1>
          <p className="text-muted-foreground mt-2">Todas tus ideas, borradores y publicaciones en un solo lugar.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="shrink-0 gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por tema o contexto..." 
            className="pl-9 bg-background/50 border-muted focus-visible:ring-primary/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="ready">Listo</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorias</SelectItem>
              {commonCategories.map(c => (
                <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>
              ))}
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
            <h3 className="text-xl font-bold mb-2">No se encontraron posts</h3>
            <p className="text-muted-foreground">Prueba a cambiar los filtros o el termino de busqueda.</p>
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
                      {format(new Date(post.createdAt), 'd MMM yyyy', { locale: es })}
                    </div>
                    {post.category && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 rounded-full py-0.5">
                        {post.category}
                      </span>
                    )}
                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold tracking-wider ${
                      post.status === 'published' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      post.status === 'ready' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                      post.status === 'idea' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {statusLabel(post.status)}
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
