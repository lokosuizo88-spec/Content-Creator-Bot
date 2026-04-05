import { useState } from "react";
import { useGetScheduledPosts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Instagram, FileVideo, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: "BORRADOR",
    ready: "LISTO",
    published: "PUBLICADO",
    idea: "IDEA",
  };
  return map[status] || status.toUpperCase();
};

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { data: posts, isLoading } = useGetScheduledPosts();

  const scheduledDates = posts?.map(p => new Date(p.scheduledAt!)) || [];

  const selectedDatePosts = posts?.filter(p => 
    date && p.scheduledAt && isSameDay(new Date(p.scheduledAt), date)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-primary" />
          Calendario de Contenido
        </h1>
        <p className="text-muted-foreground mt-2">Gestiona tu calendario de publicaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 lg:col-span-4">
          <Card className="bg-card border-primary/20 shadow-lg">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={es}
                modifiers={{ scheduled: scheduledDates }}
                modifiersStyles={{
                  scheduled: { fontWeight: 'bold', backgroundColor: 'var(--primary-20)', border: '1px solid hsl(var(--primary))' }
                }}
                className="w-full mx-auto"
                classNames={{
                  months: "w-full flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 w-full",
                  day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 w-full rounded-md hover:bg-muted mx-auto",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-7 lg:col-span-8 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {date ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona una fecha'}
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
              {selectedDatePosts?.length || 0} posts
            </Badge>
          </h2>

          {isLoading ? (
            <p>Cargando calendario...</p>
          ) : selectedDatePosts?.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/30">
              <p className="text-muted-foreground text-lg">No hay posts programados para este dia.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedDatePosts?.map(post => (
                <Link key={post.id} href={`/posts/${post.id}`} className="block group">
                  <Card className="bg-card border-border hover:border-primary/40 transition-all duration-300 group-hover:translate-x-1">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        post.platform === 'instagram' 
                          ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white'
                          : 'bg-black text-white border border-cyan-400/30'
                      }`}>
                        {post.platform === 'instagram' ? <Instagram className="w-6 h-6" /> : <FileVideo className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{post.topic}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {format(new Date(post.scheduledAt!), 'HH:mm')} - {post.category || 'Sin categoria'}
                        </p>
                      </div>
                      <Badge className={
                        post.status === 'published' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                      }>
                        {statusLabel(post.status)}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
