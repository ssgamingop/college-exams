import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, LogOut, Users, BookOpen, Trash2, GraduationCap, FolderKanban, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import { motion } from "framer-motion";

const PAGE_SIZE = 15;

interface Student {
  id: string;
  name: string;
  roll_number: string;
  batch: string;
  semester: number;
  cohort: string;
}

interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  type: string;
  professor: string | null;
  student_id: string;
  students?: { name: string; roll_number: string } | null;
}

interface Project {
  id: string;
  serial_no: number;
  project_name: string;
  student_id: string;
  students?: { name: string; roll_number: string } | null;
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | string)[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            typeof item === "string" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(item)}
                className="h-8 w-8 p-0 text-xs"
              >
                {item}
              </Button>
            )
          )}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Pagination state
  const [studentPage, setStudentPage] = useState(1);
  const [examPage, setExamPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/admin");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    setLoadingData(true);
    const [studentsRes, examsRes, projectsRes] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("exams").select("*, students(name, roll_number)").order("date"),
      supabase.from("projects").select("*, students(name, roll_number)").order("serial_no"),
    ]);
    setStudents(studentsRes.data || []);
    setExams((examsRes.data as Exam[]) || []);
    setProjects((projectsRes.data as Project[]) || []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (user && isAdmin) fetchData();
  }, [user, isAdmin]);

  // Paginated slices
  const studentTotalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const paginatedStudents = useMemo(
    () => students.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE),
    [students, studentPage]
  );

  const examTotalPages = Math.max(1, Math.ceil(exams.length / PAGE_SIZE));
  const paginatedExams = useMemo(
    () => exams.slice((examPage - 1) * PAGE_SIZE, examPage * PAGE_SIZE),
    [exams, examPage]
  );

  const projectTotalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const paginatedProjects = useMemo(
    () => projects.slice((projectPage - 1) * PAGE_SIZE, projectPage * PAGE_SIZE),
    [projects, projectPage]
  );

  // Reset page when data changes
  useEffect(() => { setStudentPage(1); }, [students.length]);
  useEffect(() => { setExamPage(1); }, [exams.length]);
  useEffect(() => { setProjectPage(1); }, [projects.length]);

  const handleStudentCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const toInsert = rows
          .filter((r) => r.name && r.roll_number && r.batch && r.semester)
          .map((r) => ({
            name: r.name.trim().slice(0, 200),
            roll_number: r.roll_number.trim().slice(0, 50),
            batch: r.batch.trim().slice(0, 20),
            semester: parseInt(r.semester, 10) || 1,
            cohort: (r.cohort || "").trim().slice(0, 100),
          }));

        if (toInsert.length === 0) {
          toast.error("No valid rows found. Required columns: name, roll_number, batch, semester, cohort");
          return;
        }

        const { error } = await supabase.from("students").upsert(toInsert, { onConflict: "roll_number" });
        if (error) {
          toast.error("Upload failed: " + error.message);
        } else {
          toast.success(`${toInsert.length} students imported`);
          fetchData();
        }
      },
    });
    e.target.value = "";
  };

  const handleExamCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const { data: allStudents } = await supabase.from("students").select("id, roll_number");
        const rollMap = new Map((allStudents || []).map((s) => [s.roll_number, s.id]));

        const toInsert = rows
          .filter((r) => r.subject && r.date && r.time && r.room && r.roll_number)
          .map((r) => ({
            subject: r.subject.trim().slice(0, 200),
            date: r.date.trim(),
            time: r.time.trim(),
            room: r.room.trim().slice(0, 50),
            type: (r.type || "theory").trim().toLowerCase(),
            professor: r.professor?.trim().slice(0, 100) || null,
            student_id: rollMap.get(r.roll_number.trim()) || "",
          }))
          .filter((r) => r.student_id);

        if (toInsert.length === 0) {
          toast.error("No valid rows found. Required: subject, date, time, room, roll_number");
          return;
        }

        const { error } = await supabase.from("exams").insert(toInsert);
        if (error) {
          toast.error("Upload failed: " + error.message);
        } else {
          toast.success(`${toInsert.length} exams imported`);
          fetchData();
        }
      },
    });
    e.target.value = "";
  };

  const handleProjectCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const { data: allStudents } = await supabase.from("students").select("id, roll_number");
        const rollMap = new Map((allStudents || []).map((s) => [s.roll_number, s.id]));

        const toInsert = rows
          .filter((r) => r.serial_no && r.project_name && r.roll_number)
          .map((r) => ({
            serial_no: parseInt(r.serial_no, 10) || 0,
            project_name: r.project_name.trim().slice(0, 300),
            student_id: rollMap.get(r.roll_number.trim()) || "",
          }))
          .filter((r) => r.student_id);

        if (toInsert.length === 0) {
          toast.error("No valid rows found. Required: serial_no, project_name, roll_number");
          return;
        }

        const { error } = await supabase.from("projects").insert(toInsert);
        if (error) {
          toast.error("Upload failed: " + error.message);
        } else {
          toast.success(`${toInsert.length} problem statements imported`);
          fetchData();
        }
      },
    });
    e.target.value = "";
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Student deleted");
      fetchData();
    }
  };

  const deleteExam = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Exam deleted");
      fetchData();
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Problem statement deleted");
      fetchData();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-['Space_Grotesk'] font-semibold text-foreground">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/admin"); }} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="students">
          <TabsList className="glass-card mb-6">
            <TabsTrigger value="students" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Exams ({exams.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-3.5 w-3.5" />
              Problem Statements ({projects.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Students Tab ── */}
          <TabsContent value="students">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="glass-card px-4 py-2 cursor-pointer hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload Students CSV
                  <input type="file" accept=".csv" onChange={handleStudentCSV} className="hidden" />
                </label>
                <span className="text-xs text-muted-foreground">Columns: name, roll_number, batch, semester, cohort</span>
              </div>

              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Cohort</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.roll_number}</TableCell>
                        <TableCell>{s.batch}</TableCell>
                        <TableCell>{s.semester}</TableCell>
                        <TableCell>{s.cohort}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteStudent(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No students yet. Upload a CSV to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <Pagination page={studentPage} totalPages={studentTotalPages} onPageChange={setStudentPage} />
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Exams Tab ── */}
          <TabsContent value="exams">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="glass-card px-4 py-2 cursor-pointer hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload Exams CSV
                  <input type="file" accept=".csv" onChange={handleExamCSV} className="hidden" />
                </label>
                <span className="text-xs text-muted-foreground">Columns: roll_number, subject, date, time, room, type, professor</span>
              </div>

              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExams.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.subject}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${e.type === "practical" ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary"}`}>
                            {e.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.students?.name || "—"}
                        </TableCell>
                        <TableCell>{e.date}</TableCell>
                        <TableCell>{e.time}</TableCell>
                        <TableCell>{e.room}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteExam(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {exams.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No exams yet. Upload a CSV to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <Pagination page={examPage} totalPages={examTotalPages} onPageChange={setExamPage} />
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Problem Statements Tab ── */}
          <TabsContent value="projects">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="glass-card px-4 py-2 cursor-pointer hover:bg-primary/5 transition-colors flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload Problem Statements CSV
                  <input type="file" accept=".csv" onChange={handleProjectCSV} className="hidden" />
                </label>
                <span className="text-xs text-muted-foreground">Columns: serial_no, project_name, roll_number</span>
              </div>

              <div className="glass-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Sr. No</TableHead>
                      <TableHead>Problem Statement</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProjects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{p.serial_no}</TableCell>
                        <TableCell className="font-medium">{p.project_name}</TableCell>
                        <TableCell>{p.students?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.students?.roll_number || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteProject(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {projects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No problem statements yet. Upload a CSV to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <Pagination page={projectPage} totalPages={projectTotalPages} onPageChange={setProjectPage} />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
