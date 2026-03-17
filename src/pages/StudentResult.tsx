import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExamCard } from "@/components/ExamCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { downloadICS, downloadSchedulePDF } from "@/lib/exportUtils";
import { ArrowLeft, Download, CalendarPlus, GraduationCap, FolderKanban, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  batch: string;
  semester: number;
  cohort: string;
}

interface Project {
  id: string;
  serial_no: number;
  project_name: string;
}

interface Exam {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  type: string;
  professor: string | null;
}

export default function StudentResult() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [studentRes, projectsRes, examsRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", id).single(),
        supabase.from("projects").select("*").eq("student_id", id),
        supabase.from("exams").select("*").eq("student_id", id).order("date", { ascending: true }),
      ]);
      setStudent(studentRes.data);
      setProjects(projectsRes.data || []);
      setExams(examsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Student not found</p>
          <Link to="/" className="text-primary hover:underline">Go back</Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const upcomingExams = exams.filter((e) => new Date(`${e.date}T${e.time}`) > now);
  const nextExam = upcomingExams[0];

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to search</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 space-y-6">
        {/* Student Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold font-['Space_Grotesk'] text-foreground">{student.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Roll: {student.roll_number} · Batch: {student.batch} · Semester {student.semester} · Cohort: {student.cohort}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Project Assignment */}
        {projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <FolderKanban className="h-4 w-4 text-accent" />
              <h2 className="font-semibold font-['Space_Grotesk'] text-sm text-foreground">Project Assignments</h2>
            </div>
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">#{p.serial_no}</span>
                  <span className="text-foreground font-medium">{p.project_name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Countdown */}
        {nextExam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <CountdownTimer
              targetDate={nextExam.date}
              targetTime={nextExam.time}
              subject={nextExam.subject}
            />
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex gap-3"
        >
          <Button
            onClick={() => downloadSchedulePDF(student, exams)}
            variant="outline"
            className="glass-card border-primary/20 hover:bg-primary/10 gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {nextExam && (
            <Button
              onClick={() => downloadICS(nextExam)}
              variant="outline"
              className="glass-card border-primary/20 hover:bg-primary/10 gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar
            </Button>
          )}
        </motion.div>

        {/* Exam Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="font-semibold font-['Space_Grotesk'] text-foreground">Exam Schedule</h2>
          </div>
          {exams.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No exams scheduled yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exams.map((exam, i) => (
                <ExamCard key={exam.id} {...exam} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
