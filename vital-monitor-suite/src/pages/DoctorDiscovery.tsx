import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Star, ArrowRight, ShieldCheck, MapPin, AlertTriangle, CalendarCheck, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGloveCheckup, clearGloveAnomaly } from "@/lib/gloveData";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MOCK_DOCTORS = [
  {
    id: "d1",
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiologist",
    rating: 4.9,
    reviews: 128,
    distance: "2.4 miles away",
    nextAvailable: "Today, 3:00 PM (Telehealth)",
    image: "https://i.pravatar.cc/150?img=47",
    match: 98,
  },
  {
    id: "d2",
    name: "Dr. Michael Chen",
    specialty: "Cardiologist",
    rating: 4.8,
    reviews: 312,
    distance: "5.1 miles away",
    nextAvailable: "Tomorrow, 10:00 AM (In-Person)",
    image: "https://i.pravatar.cc/150?img=11",
    match: 94,
  },
  {
    id: "d3",
    name: "Dr. Emily Rodriguez",
    specialty: "Electrophysiologist",
    rating: 4.9,
    reviews: 89,
    distance: "Online Only",
    nextAvailable: "In 15 minutes (Telehealth)",
    image: "https://i.pravatar.cc/150?img=44",
    match: 91,
  },
];

export default function DoctorDiscovery() {
  const checkup = useGloveCheckup();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");

  const filteredDoctors = MOCK_DOCTORS.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) || doc.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty = specialty === "all" || doc.specialty.toLowerCase() === specialty.toLowerCase();
    return matchesSearch && matchesSpecialty;
  });

  const handleBook = (doctorName: string) => {
    toast.success(`Appointment booked with ${doctorName}`, {
      description: "We've shared your recent Glove data with the doctor securely.",
    });
    setTimeout(() => {
      clearGloveAnomaly();
      navigate("/family");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container py-8 max-w-4xl"
    >
      {checkup?.hasAnomaly && (
        <Card className="p-5 mb-8 bg-critical/10 border-critical/30 border">
          <div className="flex gap-4">
            <div className="mt-1">
              <AlertTriangle className="h-6 w-6 text-critical" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-critical">Intelligent Matchmaking</h2>
              <p className="text-sm mt-1 text-foreground">
                Based on your recent Smart Glove reading ({checkup.details}), our AI has identified the most relevant top-rated specialists available for immediate consultation.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Specialist Directory</h1>
          <p className="text-muted-foreground mt-1 text-sm">Find and book the right doctor for your family.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search doctors..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-40 bg-background">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              <SelectItem value="cardiologist">Cardiology</SelectItem>
              <SelectItem value="electrophysiologist">Electrophysiology</SelectItem>
              <SelectItem value="general practice">General Practice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDoctors.map((doc) => (
          <Card key={doc.id} className="p-5 bg-panel border-border/60 shadow-sm overflow-hidden relative">
            {/* Match Badge (Only show if there is an active checkup anomaly) */}
            {checkup?.hasAnomaly && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg">
                {doc.match}% Match
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-5">
              {/* Avatar */}
              <div className="shrink-0">
                <img src={doc.image} alt={doc.name} className="w-20 h-20 rounded-full border-2 border-primary/20 object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold truncate">{doc.name}</h3>
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                </div>
                <p className="text-primary font-medium text-sm">{doc.specialty}</p>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current mr-1" />
                    <span className="font-medium text-foreground">{doc.rating}</span>
                    <span className="ml-1 text-xs text-muted-foreground">({doc.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {doc.distance}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm font-medium bg-secondary/50 px-3 py-1.5 rounded-md">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    {doc.nextAvailable}
                  </div>
                  <Button onClick={() => handleBook(doc.name)} className="shrink-0">
                    <Stethoscope className="mr-2 h-4 w-4" /> Book Consultation
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" className="text-muted-foreground">
          See more specialists <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
