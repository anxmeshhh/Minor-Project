import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Download, Trash2, Eye, FilePlus2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFamilyHealth } from "@/hooks/useFamilyHealth";
import { documentsStore, formatBytes, type DocType, type DocumentRecord } from "@/lib/familyHealth";
import { toast } from "sonner";
import { format } from "date-fns";

const DOC_TYPES: DocType[] = ["prescription", "report", "scan", "insurance", "bill", "other"];

const typeColor: Record<DocType, string> = {
  prescription: "bg-primary/15 text-primary",
  report: "bg-safe/15 text-safe",
  scan: "bg-caution/15 text-caution",
  insurance: "bg-secondary text-secondary-foreground",
  bill: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};

export default function Documents() {
  const { email, members, documents, refresh } = useFamilyHealth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [pending, setPending] = useState<File | null>(null);
  const [memberId, setMemberId] = useState<string>("");
  const [docType, setDocType] = useState<DocType>("prescription");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const [previewing, setPreviewing] = useState<{ doc: DocumentRecord; url: string } | null>(null);

  const filtered = useMemo(() => {
    return documents
      .filter((d) => filterMember === "all" || d.memberId === filterMember)
      .filter((d) => filterType === "all" || d.type === filterType)
      .filter((d) => d.title.toLowerCase().includes(search.toLowerCase()) || (d.notes?.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [documents, filterMember, filterType, search]);

  const onPick = () => fileRef.current?.click();

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Max file size is 15 MB");
      return;
    }
    setPending(f);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setMemberId(members[0]?.id || "");
    setDocType("prescription");
    setNotes("");
    setOpen(true);
    e.target.value = "";
  };

  const save = async () => {
    if (!pending || !memberId) { toast.error("Pick a member"); return; }
    await documentsStore.add(email, pending, {
      memberId,
      type: docType,
      title: title.trim() || pending.name,
      notes: notes.trim() || undefined,
    });
    refresh();
    setOpen(false);
    setPending(null);
    toast.success("Document uploaded");
  };

  const remove = async (d: DocumentRecord) => {
    await documentsStore.remove(email, d.id);
    refresh();
    toast.success("Deleted");
  };

  const openPreview = async (d: DocumentRecord) => {
    const blob = await documentsStore.getBlob(d);
    if (!blob) { toast.error("File missing"); return; }
    const url = URL.createObjectURL(blob);
    setPreviewing({ doc: d, url });
  };

  const closePreview = () => {
    if (previewing) URL.revokeObjectURL(previewing.url);
    setPreviewing(null);
  };

  const download = async (d: DocumentRecord) => {
    const blob = await documentsStore.getBlob(d);
    if (!blob) { toast.error("File missing"); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = d.fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container py-8 max-w-6xl"
    >
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Documents & Prescriptions
          </h1>
          <p className="text-sm text-muted-foreground">All medical paperwork in one place. Stays on your device.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" hidden onChange={onFileSelected}
            accept="image/*,application/pdf,.doc,.docx,.txt" />
          <Button onClick={onPick} className="gap-2"><Upload className="h-4 w-4" />Upload</Button>
        </div>
      </div>

      <Card className="p-4 mb-4 bg-panel border-border/60 flex flex-wrap gap-3 items-end">
        <div className="grid gap-1.5">
          <Label className="text-xs">Member</Label>
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <Input 
            placeholder="Search by title or notes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} document{filtered.length === 1 ? "" : "s"}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center bg-panel border-border/60">
          <FilePlus2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No documents yet. Upload prescriptions, lab reports, scans or insurance.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-4 bg-panel border-border/60 shadow-card h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={`${typeColor[d.type]} capitalize border-0`}>{d.type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatBytes(d.size)}</span>
                  </div>
                  <h3 className="mt-2 font-medium line-clamp-2">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{memberName(d.memberId)} · {format(d.uploadedAt, "PP")}</p>
                  {d.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{d.notes}</p>}
                  <div className="mt-auto pt-4 flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => openPreview(d)} className="gap-1.5"><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button size="sm" variant="ghost" onClick={() => download(d)} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d)} className="ml-auto text-critical hover:text-critical"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload metadata dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tag this document</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {pending && (
              <div className="text-xs text-muted-foreground">
                <div className="font-mono-tabular text-foreground truncate">{pending.name}</div>
                <div>{formatBytes(pending.size)} · {pending.type || "unknown"}</div>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger><SelectValue placeholder="Pick a member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewing?.doc.title}</DialogTitle></DialogHeader>
          {previewing && (
            <div className="rounded-md overflow-hidden bg-card border border-border/60 max-h-[70vh]">
              {previewing.doc.mimeType.startsWith("image/") ? (
                <img src={previewing.url} alt={previewing.doc.title} className="w-full max-h-[70vh] object-contain bg-black" />
              ) : previewing.doc.mimeType === "application/pdf" ? (
                <iframe src={previewing.url} title={previewing.doc.title} className="w-full h-[70vh] bg-white" />
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Preview not available for this file type. Use “Save” to download.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => previewing && download(previewing.doc)} className="gap-1.5">
              <Download className="h-4 w-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
