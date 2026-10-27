const EXAM_DATE_KEY = "quizanki_exam_date";

export function getExamDate(): Date | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(EXAM_DATE_KEY);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function setExamDate(date: Date | null) {
  if (typeof window === "undefined") return;
  if (!date) {
    localStorage.removeItem(EXAM_DATE_KEY);
    return;
  }
  localStorage.setItem(EXAM_DATE_KEY, date.toISOString().slice(0, 10));
}

export function getDaysUntilExam(): number | null {
  const exam = getExamDate();
  if (!exam) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** Sınava kalan güne göre günlük yeni kelime ve due limiti döner. SM-2'ye dokunmaz. */
export function getExamAdjustedLimits(daysLeft: number | null): {
  newWordBudget: number;
  maxDue: number;
} {
  if (daysLeft === null || daysLeft > 90) {
    return { newWordBudget: 8, maxDue: 40 };
  }
  if (daysLeft > 60) return { newWordBudget: 6, maxDue: 50 };
  if (daysLeft > 30) return { newWordBudget: 4, maxDue: 60 };
  if (daysLeft > 14) return { newWordBudget: 2, maxDue: 80 };
  return { newWordBudget: 0, maxDue: 100 };
}
