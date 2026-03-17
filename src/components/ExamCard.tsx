import { Calendar, Clock, MapPin, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday, isBefore, parseISO } from "date-fns";

interface ExamCardProps {
  subject: string;
  date: string;
  time: string;
  room: string;
  type?: string;
  professor?: string | null;
  index: number;
}

export function ExamCard({ subject, date, time, room, type, professor, index }: ExamCardProps) {
  const examDate = parseISO(date);
  const isPast = isBefore(examDate, new Date()) && !isToday(examDate);
  const isExamToday = isToday(examDate);

  const statusColor = isPast
    ? "border-muted-foreground/20 opacity-60"
    : isExamToday
    ? "border-accent/50 shadow-accent/10 shadow-lg"
    : "border-primary/20";

  const statusBadge = isPast ? (
    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Completed</span>
  ) : isExamToday ? (
    <span className="text-xs bg-accent/20 px-2 py-0.5 rounded-full text-accent font-medium">Today</span>
  ) : (
    <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full text-primary">Upcoming</span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`glass-card p-5 border ${statusColor} transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground font-['Space_Grotesk']">{subject}</h3>
          {type && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${type === "practical" ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary"}`}>
              {type}
            </span>
          )}
        </div>
        {statusBadge}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>{format(examDate, "dd MMM yyyy")}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{room}</span>
        </div>
        {professor && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            <span>{professor}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
