import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const sections = [
  {
    id: "introduction",
    title: "Introduction",
    content: `Exam Scheduler ("the Platform") is a web-based tool designed to help students quickly find their exam schedules, room assignments, and related academic information. This Privacy Policy explains how we collect, use, and protect your information when you use our Platform.`,
  },
  {
    id: "data-usage",
    title: "Data Usage",
    content: `The Platform may collect and store the following types of data:

• Student roll numbers and names (uploaded by administrators)
• Exam schedule information including dates, times, rooms, and subjects
• Basic usage analytics such as page views and search queries
• Session data for administrator authentication

We only collect data that is necessary for the Platform to function properly. Student data is uploaded by authorized administrators and is used solely for displaying exam schedules.`,
  },
  {
    id: "data-protection",
    title: "Data Protection",
    content: `We take reasonable measures to protect the data stored on our Platform:

• All data is transmitted over encrypted HTTPS connections
• Administrator access is protected by secure authentication
• Database access is restricted through Row Level Security policies
• No personal data is sold, rented, or shared with third parties for marketing purposes

We do not collect sensitive personal information beyond what is required for academic scheduling.`,
  },
  {
    id: "purpose",
    title: "Purpose & Scope",
    content: `The Platform is intended exclusively for academic scheduling purposes. It is operated as a student utility project and is not intended for commercial use.

Data uploaded to the Platform should only contain information relevant to exam scheduling. Administrators are responsible for ensuring the accuracy and appropriateness of the data they upload.`,
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. Any changes will be reflected on this page. Continued use of the Platform after changes are posted constitutes acceptance of the updated policy.

If you have questions about this Privacy Policy, please contact us through the links provided on our Credits page.`,
  },
];

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState(sections[0].id);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8 pt-8"
        >
          <h1 className="text-4xl font-bold font-['Space_Grotesk'] mb-3">
            <span className="gradient-text">Privacy Policy</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Last updated: March 2026
          </p>
        </motion.div>

        {/* Section Nav */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                activeSection === s.id
                  ? "bg-primary/20 text-primary"
                  : "bg-primary/5 text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}
            >
              {s.title}
            </button>
          ))}
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
              className="glass-card p-6 scroll-mt-24"
            >
              <h2 className="font-semibold font-['Space_Grotesk'] text-foreground text-lg mb-3">
                {section.title}
              </h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
