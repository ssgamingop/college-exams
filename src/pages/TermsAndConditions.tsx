import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const sections = [
  {
    id: "usage",
    title: "Platform Usage",
    content: `Exam Scheduler ("the Platform") is a free, web-based academic tool that allows students to search their roll number or name to view their exam schedules, room assignments, and related information.

By accessing or using the Platform, you agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use of the Platform immediately.`,
  },
  {
    id: "accuracy",
    title: "Data Accuracy",
    content: `All exam schedule data displayed on the Platform is uploaded and managed by authorized administrators. The Platform serves as a display layer for this data.

• Schedule accuracy depends entirely on the data provided by administrators
• Students should verify critical schedule information with their institution
• The Platform does not independently generate or validate exam schedules
• Updates to schedules are reflected only after administrators upload new data`,
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    content: `The Platform is provided on an "as is" and "as available" basis. The creators of this Platform make no warranties, expressed or implied, regarding:

• The accuracy, completeness, or reliability of exam schedule data
• Uninterrupted or error-free operation of the Platform
• The timeliness of data updates

In no event shall the Platform creators be liable for any direct, indirect, incidental, or consequential damages arising from the use of or inability to use the Platform, including but not limited to missed exams, incorrect room assignments, or scheduling conflicts.`,
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    content: `When using the Platform, you agree to:

• Use the Platform only for its intended purpose of viewing exam schedules
• Not attempt to access, modify, or delete data without proper authorization
• Not use automated tools to scrape or extract data from the Platform
• Not attempt to interfere with the Platform's operation or security
• Not impersonate administrators or other users

Violation of these terms may result in restricted access to the Platform.`,
  },
  {
    id: "admin",
    title: "Administrator Responsibilities",
    content: `Administrators who upload data to the Platform are responsible for:

• Ensuring the accuracy and completeness of uploaded exam schedules
• Uploading only data relevant to academic scheduling
• Protecting their administrator credentials
• Complying with their institution's data handling policies

The Platform creators are not responsible for errors in data uploaded by administrators.`,
  },
  {
    id: "changes",
    title: "Changes to Terms",
    content: `We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting to this page.

Continued use of the Platform after changes are posted constitutes acceptance of the updated terms. It is your responsibility to review these terms periodically.

If you have questions about these Terms, please contact us through the links provided on our Credits page.`,
  },
];

export default function TermsAndConditions() {
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
            <span className="gradient-text">Terms &amp; Conditions</span>
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
