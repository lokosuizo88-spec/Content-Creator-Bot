import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreatePost } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters."),
  context: z.string().min(5, "Context must be at least 5 characters."),
  platform: z.enum(["instagram", "tiktok"]),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createPost = useCreatePost();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      context: "",
      platform: "instagram",
      tone: "",
      targetAudience: "",
    },
  });

  function onSubmit(values: FormValues) {
    createPost.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({
            title: "Post created!",
            description: "Ready to generate some AI magic.",
          });
          setLocation(`/posts/${data.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create post. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Spark a New Idea</h1>
        <p className="text-muted-foreground mt-2 text-lg">Define the seed. AI will grow the tree.</p>
      </div>

      <Card className="border-primary/20 bg-card shadow-2xl shadow-primary/5">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Brief the AI
          </CardTitle>
          <CardDescription>
            The better the context, the more viral the result.
          </CardDescription>
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
                      <FormLabel className="text-foreground">Core Topic or Hook</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 5 hidden CSS features for 2024" className="bg-background/50 text-lg py-6 focus-visible:ring-primary/50" {...field} />
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
                      <FormLabel className="text-foreground">Platform</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select platform" />
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
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Tone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Energetic, educational, snarky" className="bg-background/50" {...field} />
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
                      <FormLabel className="text-foreground">Detailed Context</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide the raw brain dump. Bullet points are fine. What are we actually talking about?" 
                          className="min-h-[120px] bg-background/50 resize-y focus-visible:ring-primary/50"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-foreground">Target Audience (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Junior web developers, Agency owners" className="bg-background/50" {...field} />
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
                  {createPost.isPending ? "Planting seed..." : "Create & Open Studio"}
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