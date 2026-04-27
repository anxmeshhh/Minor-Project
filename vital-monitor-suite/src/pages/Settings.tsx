import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Wifi, ServerCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useConnection } from "@/context/ConnectionContext";
import { useVitalsCtx } from "@/context/VitalsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { mode, deviceUrl, setMode, setDeviceUrl } = useConnection();
  const { connected, lastUpdated } = useVitalsCtx();
  const [draftUrl, setDraftUrl] = useState(deviceUrl);

  const save = () => {
    if (mode === "device") {
      try {
        new URL(draftUrl);
      } catch {
        toast.error("Enter a valid URL (e.g. http://192.168.4.1/data)");
        return;
      }
      setDeviceUrl(draftUrl.trim());
    }
    toast.success("Connectivity updated");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container py-8 max-w-3xl"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Choose where VitalGlove pulls live readings from.</p>
      </div>

      <Card className="p-6 bg-panel border-border/60 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <ServerCog className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Data source</h2>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
              connected ? "bg-safe/15 text-safe" : "bg-critical/15 text-critical",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-safe" : "bg-critical animate-blink")} />
            {connected ? "Receiving data" : "No signal"}
          </span>
        </div>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "mock" | "device")} className="space-y-3">
          <label
            htmlFor="mode-mock"
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border/60 p-4 cursor-pointer transition-colors",
              mode === "mock" ? "bg-card border-primary/60" : "bg-card/40 hover:bg-card/70",
            )}
          >
            <RadioGroupItem id="mode-mock" value="mock" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <span className="font-medium">Simulated stream</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Built-in mock generator at <code className="font-mono-tabular">/api/latest</code>. Works offline,
                great for demos.
              </p>
            </div>
          </label>

          <label
            htmlFor="mode-device"
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border/60 p-4 cursor-pointer transition-colors",
              mode === "device" ? "bg-card border-primary/60" : "bg-card/40 hover:bg-card/70",
            )}
          >
            <RadioGroupItem id="mode-device" value="device" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                <span className="font-medium">Real ESP32 over Wi-Fi</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Point to a device on your local network that returns the same JSON shape.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="device-url">Device URL</Label>
                <Input
                  id="device-url"
                  placeholder="http://192.168.4.1/data"
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  disabled={mode !== "device"}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: ensure the ESP32 sends <code>Access-Control-Allow-Origin: *</code>.
                </p>
              </div>
            </div>
          </label>
        </RadioGroup>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {lastUpdated ? `Last reading: ${new Date(lastUpdated).toLocaleTimeString()}` : "Waiting for first reading…"}
          </p>
          <Button onClick={save}>Save</Button>
        </div>
      </Card>

      <Card className="mt-4 p-5 bg-panel-elevated border-border/60">
        <h3 className="font-medium mb-2">Expected JSON shape</h3>
        <pre className="text-xs font-mono-tabular bg-card/60 rounded-md p-3 overflow-x-auto border border-border/60">
{`{
  "timestamp": 1718000000000,
  "hr": 78, "spo2": 97, "temp": 36.6,
  "gforce": 1.1, "fall": false,
  "alert": false, "risk": 12
}`}
        </pre>
      </Card>
    </motion.div>
  );
}
