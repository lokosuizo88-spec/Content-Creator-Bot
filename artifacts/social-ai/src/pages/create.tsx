import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useSearch } from "wouter";
import { useCreatePost, useListTemplates } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  topic: z.string().min(2, "El tema debe tener al menos 2 caracteres."),
  context: z.string().optional(),
  platform: z.enum(["instagram", "tiktok"]),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const predefinedTemplates = [
  { id: "pre-1", name: "Educativo y directo", tone: "Educational, direct, concise", targetAudience: "Beginners, students", category: "education" },
  { id: "pre-2", name: "Divertido y viral", tone: "Funny, energetic, engaging", targetAudience: "Gen Z, young adults", category: "entertainment" },
  { id: "pre-3", name: "Inspiracional", tone: "Inspiring, uplifting, motivational", targetAudience: "Professionals, entrepreneurs", category: "lifestyle" },
];

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialTopic = searchParams.get("topic") || "";
  const initialPlatform = (searchParams.get("platform") as "instagram" | "tiktok") || "instagram";

  const { toast } = useToast();
  const createPost = useCreatePost();
  const { data: dbTemplates } = useListTemplates();

  const allTemplates = [...predefinedTemplates, ...(dbTemplates || [])];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: initialTopic,
      context: "",
      platform: initialPlatform,
      tone: "",
      targetAudience: "",
      category: "",
    },
  });

  const handleTemplateChange = (templateId: string) => {
    const template = allTemplates.find(t => t.id.toString() === templateId);
    if (template) {
      if (template.tone) form.setValue("tone", template.tone);
      if (template.targetAudience) form.setValue("targetAudience", template.targetAudience);
      if (template.category) form.setValue("category", template.category);
      toast({ title: "Plantilla aplicada" });
    }
  };

  function onSubmit(values: FormValues) {
    createPost.mutate(
      { data: { ...values, context: values.context || "", status: "draft" } },
      {
        onSuccess: (data) => {
          toast({
            title: "Post creado",
            description: "Listo para generar contenido con IA.",
          });
          setLocation(`/posts/${data.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo crear el post. Intentalo de nuevo.",
            variant: "destructive",
          });
        },
      }
    );
  }

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
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Nueva Idea de Contenido</h1>
        <p className="text-muted-foreground mt-2 text-lg">Define el tema. La IA hara el resto.</p>
      </div>

      <Card className="border-primary/20 bg-card shadow-2xl shadow-primary/5">
        <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              Informacion para la IA
            </CardTitle>
            <CardDescription>
              Cuanto mas contexto, mejor sera el resultado.
            </CardDescription>
          </div>
          
          <div className="w-64">
            <Select onValueChange={handleTemplateChange}>
              <SelectTrigger className="bg-background/50 h-9">
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <LayoutTemplate className="w-4 h-4" />
                  <span>Usar Plantilla...</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-foreground">Tema o Hook Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 5 trucos de CSS que no sabias para 2024" className="bg-background/50 text-lg py-6 focus-visible:ring-primary/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Plataforma</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Selecciona plataforma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Categoria</FormLabel>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="O escribe una propia..." 
                          className="bg-background/50" 
                          {...field} 
                          value={field.value || ""} 
                        />
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 w-[140px] shrink-0">
                              <SelectValue placeholder="Presets" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {commonCategories.map(c => (
                              <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Tono (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Energico, educativo, directo" className="bg-background/50" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Audiencia Objetivo (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Emprendedores, estudiantes de diseno" className="bg-background/50" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="context"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-foreground">Contexto Detallado</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Vuelca todo lo que tengas en mente. Puntos sueltos estan bien. De que trata exactamente este post?" 
                          className="min-h-[120px] bg-background/50 resize-y focus-visible:ring-primary/50"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createPost.isPending}
                  className="bg-studio-gradient hover:opacity-90 text-white shadow-[0_0_20px_rgba(255,0,255,0.4)] hover:shadow-[0_0_30px_rgba(255,0,255,0.6)] transition-all duration-300 px-8 py-6 h-auto text-lg font-bold gap-2"
                >
                  {createPost.isPending ? "Creando..." : "Crear y Abrir Estudio"}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
