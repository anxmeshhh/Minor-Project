import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth, DEMO_CREDENTIALS, type Role } from "@/context/AuthContext";
import { toast } from "sonner";

// Role-based redirect after login
// / stays as public Demo landing. Each role gets its own dashboard.
const roleLanding: Record<Role, string> = {
  patient: "/dashboard",   // Patient vitals dashboard
  doctor:  "/doctor",      // Doctor fleet / alerts
  admin:   "/admin",       // Admin control center
};


export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(roleLanding[user.role], { replace: true });
    }
  }, [user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = login(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error || "Login failed");
      return;
    }
    toast.success("Welcome back");
    const stored = JSON.parse(localStorage.getItem("vg.session") || "{}");
    navigate(roleLanding[(stored.role as Role) || "patient"], { replace: true });
  };

  const fill = (c: { email: string; password: string }) => {
    setEmail(c.email);
    setPassword(c.password);
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex items-center gap-2 justify-center">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Vital<span className="text-primary">Glove</span>
          </span>
        </div>

        <Card className="p-6 bg-panel border-border/60 shadow-card">
          <h1 className="text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Access your patient, clinician, or admin view.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            New here?{" "}
            <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
          </p>
        </Card>

        <Card className="mt-4 p-4 bg-panel-elevated border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Demo credentials</p>
          </div>
          <div className="space-y-2">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => fill(c)}
                className="w-full text-left rounded-md border border-border/60 bg-card/60 hover:bg-card transition-colors p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.role}</span>
                  <span className="text-xs text-primary">Use these →</span>
                </div>
                <div className="font-mono-tabular text-sm mt-1">{c.email}</div>
                <div className="font-mono-tabular text-xs text-muted-foreground">{c.password}</div>
              </button>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
