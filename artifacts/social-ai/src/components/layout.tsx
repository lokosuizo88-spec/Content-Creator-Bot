import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, List, Activity, LayoutTemplate, Lightbulb, CalendarDays } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Inicio", icon: LayoutDashboard },
    { href: "/create", label: "Nuevo Post", icon: PlusCircle },
    { href: "/posts", label: "Mis Posts", icon: List },
    { href: "/templates", label: "Plantillas", icon: LayoutTemplate },
    { href: "/ideas", label: "Banco de Ideas", icon: Lightbulb },
    { href: "/calendar", label: "Calendario", icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row dark">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-studio-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SocialAI</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link key={item.href} href={item.href} className="block">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 transition-all duration-200 ${
                    isActive 
                      ? "bg-primary/10 text-primary hover:bg-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-xl border border-primary/20">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Plan Pro Activo</h4>
            <p className="text-xs text-muted-foreground mb-3">Generaciones de IA ilimitadas</p>
            <Button size="sm" variant="outline" className="w-full border-primary/30 hover:bg-primary/10">
              Gestionar Plan
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
