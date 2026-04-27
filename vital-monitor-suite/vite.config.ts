import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// ── VitalGlove Demo API ──────────────────────────────────────────────────
// Serves mock vitals at /api/latest and exposes /api/demo/* control endpoints
// so the Demo Panel can inject named scenarios and switch data sources.
// Also accepts ESP32 telemetry at POST /api/telemetry.

interface VitalsSnapshot {
  timestamp: number; hr: number; spo2: number; temp: number;
  gforce: number; fall: boolean; alert: boolean; risk: number;
}

function computeRisk(v: Omit<VitalsSnapshot, "timestamp" | "alert" | "risk">): number {
  let r = 10;
  if (v.hr > 120 || v.hr < 50) r += 35; else if (v.hr > 100) r += 15;
  if (v.spo2 < 94) r += 30; if (v.spo2 < 90) r += 15;
  if (v.temp > 38 || v.temp < 35) r += 20;
  if (v.fall) r += 50; if (v.gforce > 3) r += 15;
  return Math.min(100, r + Math.round((Math.random() - 0.5) * 5));
}

function mockApiPlugin(): Plugin {
  let tick = 0;

  // ── shared demo state (mutated by /api/demo/trigger) ──
  let scenario: string | null = null;          // null = normal cycling mock
  let scenarioStartTick = 0;
  let esp32Latest: VitalsSnapshot | null = null;
  let dataSource: "mock" | "esp32" = "mock";

  function buildVitals(): VitalsSnapshot {
    tick += 1;
    const t = tick / 10;

    // Base sinusoidal mock
    let hr    = Math.round(78 + Math.sin(t) * 8 + (Math.random() - 0.5) * 4);
    let spo2  = Math.round(97 + Math.sin(t / 3) * 1 + (Math.random() - 0.5) * 1);
    let temp  = +(36.6 + Math.sin(t / 5) * 0.4 + (Math.random() - 0.5) * 0.2).toFixed(1);
    let gforce = +(1 + Math.abs(Math.sin(t / 2)) * 0.3 + (Math.random() - 0.5) * 0.2).toFixed(2);
    let fall  = false;

    if (scenario) {
      const age = tick - scenarioStartTick;   // ticks elapsed since trigger
      switch (scenario) {
        case "hypoxia":
          spo2   = Math.max(82, Math.round(97 - (age / 40) * 15) + Math.round((Math.random() - 0.5) * 2));
          hr     = Math.round(75 + Math.min(age / 40, 1) * 28 + (Math.random() - 0.5) * 3);
          break;
        case "fall":
          fall   = age < 5;
          gforce = age < 5 ? +(4.5 + Math.random() * 1.5).toFixed(2) : +(1.2 + Math.random() * 0.2).toFixed(2);
          break;
        case "tachycardia":
          hr     = Math.round(100 + Math.min(age * 1.5, 50) + (Math.random() - 0.5) * 5);
          break;
        case "fever":
          temp   = +(36.6 + Math.min(age / 30, 1) * 2.4 + (Math.random() - 0.5) * 0.1).toFixed(1);
          break;
      }
    }

    const v = { hr, spo2, temp: Number(temp), gforce: Number(gforce), fall };
    const risk  = computeRisk(v);
    const alert = hr < 50 || hr > 120 || spo2 < 94 || fall;
    return { timestamp: Date.now(), ...v, alert, risk };
  }

  function parseBody(req: import("http").IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let b = "";
      req.on("data", (d: Buffer) => { b += d.toString(); });
      req.on("end", () => resolve(b));
    });
  }

  return {
    name: "mock-vitalglove-api",
    configureServer(server) {

      // GET /api/latest — the main vitals poll used by useVitals()
      server.middlewares.use("/api/latest", (_req, res) => {
        const data = (dataSource === "esp32" && esp32Latest &&
                      Date.now() - esp32Latest.timestamp < 6000)
          ? esp32Latest
          : buildVitals();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(data));
      });

      // GET /api/demo/status — polled by DemoPanel
      server.middlewares.use("/api/demo/status", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({
          scenario,
          dataSource,
          scenarioAge: scenario ? tick - scenarioStartTick : null,
          esp32Connected: !!esp32Latest && Date.now() - esp32Latest.timestamp < 6000,
        }));
      });

      // POST /api/demo/trigger — DemoPanel triggers a scenario or switches source
      server.middlewares.use("/api/demo/trigger", async (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
        try {
          const { scene, source } = JSON.parse(await parseBody(req)) as { scene?: string; source?: string };
          if (scene !== undefined) {
            scenario = (scene === "normal") ? null : scene;
            scenarioStartTick = tick;
          }
          if (source === "mock" || source === "esp32") dataSource = source;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, scenario, dataSource }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "bad body" }));
        }
      });

      // POST /api/telemetry — receives JSON from ESP32 glove.cpp sendTelemetry()
      server.middlewares.use("/api/telemetry", async (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
        try {
          const p = JSON.parse(await parseBody(req)) as Record<string, number | boolean>;
          const hr     = Math.round((p.hr     as number) ?? 0);
          const spo2   = Math.round((p.spo2   as number) ?? 0);
          const temp   = (p.temp   as number) ?? 0;
          const gforce = (p.gforce as number) ?? 1;
          const fall   = !!(p.fall);
          const v      = { hr, spo2, temp, gforce, fall };
          esp32Latest  = {
            timestamp: Date.now(), ...v,
            alert: hr < 50 || hr > 120 || spo2 < 94 || fall,
            risk:  computeRisk(v),
          };
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "bad body" }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mockApiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
