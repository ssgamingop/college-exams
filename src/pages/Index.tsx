import { SearchBar } from "@/components/SearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { GraduationCap, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen mesh-gradient flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-['Space_Grotesk'] font-semibold text-lg text-foreground">
              Exam Scheduler
            </span>
            <p className="text-[10px] text-muted-foreground/70 -mt-0.5">by Sasanka &amp; Somyajeet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-primary/5"
          >
            <Shield className="h-3.5 w-3.5" />
            Admin
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-10 max-w-xl"
        >
          <h1 className="text-4xl sm:text-5xl font-bold font-['Space_Grotesk'] mb-4">
            Find Your{" "}
            <span className="gradient-text">Exam Schedule</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Search by your name or roll number to instantly view your upcoming exams, room assignments, and more.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-2xl"
        >
          <SearchBar />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-xs text-muted-foreground/60"
        >
          No login required — just search and go
        </motion.p>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
