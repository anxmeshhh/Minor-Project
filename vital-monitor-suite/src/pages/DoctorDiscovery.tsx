import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Star, ArrowRight, ShieldCheck, MapPin, AlertTriangle, CalendarCheck, Search, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGloveCheckup, clearGloveAnomaly } from "@/lib/gloveData";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  "All Specialties", "Cardiologist", "Pulmonologist", "General Physician",
  "Electrophysiologist", "Sleep Medicine", "Orthopedic", "Neurologist",
];

const MOCK_DOCTORS = [
  { id: "d1", name: "Dr. Anjali Mehra", specialty: "Cardiologist", rating: 4.9, reviews: 128,
    distance: "1.2 km", location: "Apollo Hospital, Sector 15", lat: 28.46, lng: 77.03,
    nextAvailable: "Today, 3:00 PM", mode: "In-Person", match: 98, fee: 800, experience: "18 yrs" },
  { id: "d2", name: "Dr. Rajesh Gupta", specialty: "Cardiologist", rating: 4.8, reviews: 312,
    distance: "3.5 km", location: "Max Super Specialty, Vaishali", lat: 28.64, lng: 77.34,
    nextAvailable: "Tomorrow, 10:00 AM", mode: "In-Person", match: 94, fee: 1200, experience: "22 yrs" },
  { id: "d3", name: "Dr. Priya Nair", specialty: "Pulmonologist", rating: 4.9, reviews: 89,
    distance: "Online", location: "Medanta, Gurugram", lat: 28.44, lng: 77.04,
    nextAvailable: "In 15 minutes", mode: "Telehealth", match: 91, fee: 600, experience: "12 yrs" },
  { id: "d4", name: "Dr. Amit Singh", specialty: "General Physician", rating: 4.7, reviews: 245,
    distance: "0.8 km", location: "Fortis Clinic, Noida", lat: 28.57, lng: 77.35,
    nextAvailable: "Today, 5:30 PM", mode: "In-Person", match: 85, fee: 500, experience: "15 yrs" },
  { id: "d5", name: "Dr. Kavita Sharma", specialty: "Electrophysiologist", rating: 4.9, reviews: 67,
    distance: "5.2 km", location: "AIIMS, New Delhi", lat: 28.56, lng: 77.21,
    nextAvailable: "Wed, 11:00 AM", mode: "In-Person", match: 88, fee: 1500, experience: "20 yrs" },
  { id: "d6", name: "Dr. Vikram Patel", specialty: "Orthopedic", rating: 4.6, reviews: 189,
    distance: "2.1 km", location: "BLK Hospital, Rajinder Nagar", lat: 28.63, lng: 77.18,
    nextAvailable: "Today, 4:00 PM", mode: "In-Person", match: 78, fee: 700, experience: "14 yrs" },
];

export default function DoctorDiscovery() {
  const checkup = useGloveCheckup();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const filtered = MOCK_DOCTORS
    .filter(d => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
      const matchSpec = specialty === "All Specialties" || d.specialty === specialty;
      return matchSearch && matchSpec;
    })
    .sort((a, b) => b.match - a.match);

  const handleRequest = (doc: typeof MOCK_DOCTORS[0]) => {
    setRequestedIds(prev => new Set([...prev, doc.id]));
    toast.success(`Consultation request sent to ${doc.name}`, {
      description: `${doc.specialty} at ${doc.location}. Your complete health profile (vitals, meds, history) has been shared securely.`,
    });
  };

  const handleBook = (doc: typeof MOCK_DOCTORS[0]) => {
    toast.success(`Appointment booked with ${doc.name}`, {
      description: `${doc.nextAvailable} (${doc.mode}) at ${doc.location}`,
    });
    setTimeout(() => { clearGloveAnomaly(); navigate("/family"); }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="container py-8 max-w-5xl">

      {checkup?.hasAnomaly && (
        <Card className="p-5 mb-6 bg-critical/10 border-critical/30 border">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 text-critical shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-critical">AI-Powered Doctor Matching</h2>
              <p className="text-sm mt-1">Based on your Smart Glove reading ({checkup.details}), medical history, and current medications, our AI has ranked the most relevant specialists.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Find a Doctor</h1>
          <p className="text-muted-foreground mt-1 text-sm">Book based on AI suggestion or browse by specialty & location</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-44 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Map-like location display */}
      <div className="rounded-xl border border-border bg-panel p-4 mb-6 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Navigation className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Nearby Specialists</h2>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} doctors found</span>
        </div>
        <div className="relative h-32 bg-zinc-900 rounded-lg overflow-hidden border border-border/60">
          {/* Simple map visualization */}
          <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "20px 20px"}} />
          {filtered.map((d, i) => (
            <div key={d.id} className="absolute flex flex-col items-center" style={{
              left: `${15 + (i * 14) % 75}%`, top: `${20 + (i * 23) % 55}%`,
            }}>
              <div className={cn("h-3 w-3 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-150 cursor-pointer",
                d.match >= 90 ? "bg-emerald-400" : d.match >= 80 ? "bg-amber-400" : "bg-blue-400")} title={`${d.name} - ${d.distance}`} />
              <span className="text-[8px] text-muted-foreground mt-0.5 whitespace-nowrap">{d.name.split(" ").pop()}</span>
            </div>
          ))}
          <div className="absolute bottom-2 left-2 flex gap-3 text-[9px] text-muted-foreground">
            <span><span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1"/>90%+ match</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1"/>80%+ match</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1"/>Other</span>
          </div>
        </div>
      </div>

      {/* Doctor Cards */}
      <div className="space-y-4">
        {filtered.map(doc => {
          const requested = requestedIds.has(doc.id);
          return (
            <Card key={doc.id} className="p-5 bg-panel border-border/60 shadow-sm overflow-hidden relative">
              {checkup?.hasAnomaly && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg">{doc.match}% Match</div>
              )}
              <div className="flex flex-col md:flex-row gap-5">
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl font-bold">
                    {doc.name.split(" ").pop()?.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold truncate">{doc.name}</h3>
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <p className="text-primary font-medium text-sm">{doc.specialty} · {doc.experience}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center text-amber-500">
                      <Star className="h-4 w-4 fill-current mr-1" />
                      <span className="font-medium text-foreground">{doc.rating}</span>
                      <span className="ml-1 text-xs">({doc.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1"><MapPin className="h-4 w-4" />{doc.distance} · {doc.location}</div>
                    <Badge variant="secondary" className="text-[10px]">Rs. {doc.fee}</Badge>
                    <Badge variant={doc.mode==="Telehealth"?"default":"outline"} className="text-[10px]">{doc.mode}</Badge>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium bg-secondary/50 px-3 py-1.5 rounded-md">
                      <CalendarCheck className="h-4 w-4 text-primary" />{doc.nextAvailable}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleRequest(doc)} disabled={requested}
                        className={cn(requested && "border-emerald-700/40 text-emerald-400")}>
                        {requested ? "Request Sent ✓" : "Request Consultation"}
                      </Button>
                      <Button onClick={() => handleBook(doc)}>
                        <Stethoscope className="mr-2 h-4 w-4" />Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" className="text-muted-foreground">See more specialists <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </motion.div>
  );
}
