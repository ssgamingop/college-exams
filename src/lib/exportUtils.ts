import jsPDF from "jspdf";

interface ExamData {
  subject: string;
  date: string;
  time: string;
  room: string;
  type?: string;
  professor?: string | null;
}

interface StudentData {
  name: string;
  roll_number: string;
  batch: string;
  semester: number;
}

export function downloadICS(exam: ExamData) {
  const [year, month, day] = exam.date.split("-");
  const [hours, minutes] = exam.time.split(":");
  const start = `${year}${month}${day}T${hours}${minutes}00`;
  const endHour = String(Number(hours) + 2).padStart(2, "0");
  const end = `${year}${month}${day}T${endHour}${minutes}00`;

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:Exam - ${exam.subject}${exam.type ? ` (${exam.type})` : ""}
LOCATION:${exam.room}
DESCRIPTION:${exam.type ? `Type: ${exam.type}\n` : ""}${exam.professor ? `Professor: ${exam.professor}` : ""}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exam-${exam.subject.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSchedulePDF(student: StudentData, exams: ExamData[]) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("Exam Schedule", 20, 25);

  doc.setFontSize(12);
  doc.text(`Name: ${student.name}`, 20, 40);
  doc.text(`Roll Number: ${student.roll_number}`, 20, 48);
  doc.text(`Batch: ${student.batch} | Semester: ${student.semester}`, 20, 56);

  doc.setLineWidth(0.5);
  doc.line(20, 62, 190, 62);

  let y = 72;
  exams.forEach((exam, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(13);
    doc.text(`${i + 1}. ${exam.subject}${exam.type ? ` (${exam.type})` : ""}`, 20, y);
    doc.setFontSize(10);
    doc.text(`Date: ${exam.date}  |  Time: ${exam.time}  |  Room: ${exam.room}`, 25, y + 7);
    if (exam.professor) {
      doc.text(`Professor: ${exam.professor}`, 25, y + 13);
      y += 22;
    } else {
      y += 16;
    }
  });

  doc.save(`schedule-${student.roll_number}.pdf`);
}
