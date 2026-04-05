import { useListTemplates, useCreateTemplate, useDeleteTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LayoutTemplate, Trash2, Plus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  tone: z.string().min(2, "El tono es obligatorio."),
  targetAudience: z.string().optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Templates() {
  const { data: templates, isLoading } = useListTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tone: "",
      targetAudience: "",
      category: "",
      platform: "all",
    },
  });

  const onSubmit = (values: FormValues) => {
    createTemplate.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Plantilla creada correctamente" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        form.reset();
      },
      onError: () => {
        toast({ title: "Error al crear la plantilla", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteTemplate.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Plantilla eliminada" });
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Plantillas de Tono</h1>
        <p className="text-muted-foreground mt-2">Guarda tu configuracion favorita para crear posts mas rapido.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="border-primary/20 bg-card shadow-lg shadow-primary/5 sticky top-8">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plus className="w-5 h-5 text-primary" />
                Nueva Plantilla
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Tips semanales" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tono</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Educativo, profesional" {...field} />
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
                        <FormLabel>Audiencia Objetivo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Duenos de pequenos negocios" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria por Defecto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Negocios" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createTemplate.isPending} className="w-full bg-studio-gradient hover:opacity-90 font-bold">
                    {createTemplate.isPending ? "Guardando..." : "Guardar Plantilla"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold mb-4">Plantillas Guardadas</h2>
          {isLoading ? (
            <p>Cargando plantillas...</p>
          ) : templates?.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
              <LayoutTemplate className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Sin plantillas todavia. Crea tu primera en el panel izquierdo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates?.map((template) => (
                <Card key={template.id} className="bg-card border-border hover:border-primary/40 transition-colors group">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex justify-between items-start text-lg">
                      <span className="truncate pr-4">{template.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 shrink-0"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>Tono: <span className="font-semibold text-foreground/80">{template.tone}</span></CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pb-4">
                    {template.targetAudience && (
                      <div><span className="text-muted-foreground">Audiencia:</span> {template.targetAudience}</div>
                    )}
                    {template.category && (
                      <div><span className="text-muted-foreground">Categoria:</span> {template.category}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
