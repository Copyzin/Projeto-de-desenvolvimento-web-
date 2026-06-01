// Fonte unica de verdade da grade horaria (dias, periodos e faixas de horario),
// usada tanto na montagem do admin quanto na visualizacao de aluno/professor.

export type Period = "matutino" | "vespertino" | "noturno";
export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type PeriodRow =
  | { kind: "lesson"; label: string; lessonNumber: number }
  | { kind: "interval"; label: string };

export const DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terca" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
];

export const LESSON_NUMBERS = [1, 2, 3, 4];

export const PERIOD_ROWS: Record<Period, PeriodRow[]> = {
  matutino: [
    { kind: "lesson", label: "07:30 - 08:30", lessonNumber: 1 },
    { kind: "lesson", label: "08:30 - 09:30", lessonNumber: 2 },
    { kind: "interval", label: "09:30 - 10:00" },
    { kind: "lesson", label: "10:00 - 11:00", lessonNumber: 3 },
    { kind: "lesson", label: "11:00 - 12:00", lessonNumber: 4 },
  ],
  vespertino: [
    { kind: "lesson", label: "13:30 - 14:30", lessonNumber: 1 },
    { kind: "lesson", label: "14:30 - 15:30", lessonNumber: 2 },
    { kind: "interval", label: "15:30 - 16:00" },
    { kind: "lesson", label: "16:00 - 17:00", lessonNumber: 3 },
    { kind: "lesson", label: "17:00 - 18:00", lessonNumber: 4 },
  ],
  noturno: [
    { kind: "lesson", label: "18:30 - 19:30", lessonNumber: 1 },
    { kind: "lesson", label: "19:30 - 20:30", lessonNumber: 2 },
    { kind: "interval", label: "20:30 - 21:00" },
    { kind: "lesson", label: "21:00 - 22:00", lessonNumber: 3 },
    { kind: "lesson", label: "22:00 - 23:00", lessonNumber: 4 },
  ],
};

export const PERIOD_LABELS: Record<Period, string> = {
  matutino: "Matutino",
  vespertino: "Vespertino",
  noturno: "Noturno",
};

export function slotKey(dayOfWeek: DayOfWeek, lessonNumber: number) {
  return `${dayOfWeek}-${lessonNumber}`;
}

export function splitSlotKey(key: string) {
  const [dayOfWeek, lessonNumber] = key.split("-");
  return { dayOfWeek: dayOfWeek as DayOfWeek, lessonNumber: Number(lessonNumber) };
}

// Rotulo de horario "07:30 - 08:30" para um (periodo, numero da aula).
export function lessonTimeLabel(period: Period, lessonNumber: number): string {
  const row = PERIOD_ROWS[period].find((entry) => entry.kind === "lesson" && entry.lessonNumber === lessonNumber);
  return row?.label ?? `Aula ${lessonNumber}`;
}
