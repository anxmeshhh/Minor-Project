import { Link, NavLink, useNavigate } from "react-router-dom";
import { Activity, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { useVitalsCtx } from "@/context/VitalsContext";
import { useAuth, type Role } from "@/context/AuthContext";
import { useConnection } from "@/context/ConnectionContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Patient", roles: ["patient", "admin"] },
  { to: "/family", label: "Family Hub", roles: ["patient", "admin"] },
  { to: "/doctor", label: "Doctor", roles: ["doctor", "admin"] },
  { to: "/emergency", label: "Emergency", roles: ["patient", "doctor", "admin"] },
];

export function NavBar() {
  const { connected } = useVitalsCtx();
  const { mode } = useConnection();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-secondary text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
    );

  const visibleItems = user
    ? NAV_ITEMS.filter((i) => i.roles.includes(user.role))
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to={user ? "/" : "/login"} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tight">
            Vital<span className="text-primary">Glove</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={linkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full transition-colors",
                connected ? "bg-safe shadow-glow-safe" : "bg-critical animate-blink",
              )}
              aria-hidden
            />
            <span className="text-muted-foreground hidden sm:inline">
              {mode === "mock" ? "Sim" : "ESP32"} {connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden md:inline text-foreground">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{user.role}</div>
                  <div>{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <SettingsIcon className="mr-2 h-4 w-4" /> Connectivity
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
