import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ExternalLink, Globe, Instagram, User } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const creators = [
  {
    name: "Sasanka Sekhar Kundu",
    role: "Full Stack Developer",
    description:
      "Sasanka focuses on building developer tools, web platforms, and student-focused applications.",
    portfolio: "https://sasankawrites.in",
    instagram: "https://www.instagram.com/sasankawrites",
    initials: "SK",
  },
  {
    name: "Somyajeet Singh",
    role: "Software Developer",
    description:
      "Somyajeet specializes in building scalable systems and modern web applications.",
    portfolio: "https://somyacodes.in",
    instagram: "https://www.instagram.com/somyajeet.op",
    initials: "SS",
  },
];

export default function Credits() {
  return (
    <div className="min-h-screen mesh-gradient flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 pb-16 w-full">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12 pt-8"
        >
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] mb-3">
            <span className="gradient-text">Credits</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            This platform was built to simplify exam scheduling for students.
          </p>
        </motion.div>

        {/* Creator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {creators.map((creator, i) => (
            <motion.div
              key={creator.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              className="glass-card p-6 group hover:border-primary/40 transition-all hover:scale-[1.02] duration-300"
            >
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold font-['Space_Grotesk'] text-foreground text-lg">
                    {creator.name}
                  </h3>
                  <p className="text-xs text-primary/80 font-medium">{creator.role}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {creator.description}
              </p>

              {/* Links */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={creator.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  Portfolio
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <a
                  href={creator.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  <Instagram className="h-3 w-3" />
                  Instagram
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tech */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card p-6 text-center"
        >
          <h2 className="font-semibold font-['Space_Grotesk'] text-foreground mb-3">
            Built With
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {["React", "TypeScript", "Vite", "Tailwind CSS", "Supabase", "shadcn/ui", "Framer Motion"].map(
              (tech) => (
                <span
                  key={tech}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary/80"
                >
                  {tech}
                </span>
              )
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
