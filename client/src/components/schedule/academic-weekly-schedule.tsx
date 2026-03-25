import { ScheduleFooter } from "./schedule-footer";
import { ScheduleHeader } from "./schedule-header";
import { ScheduleTable } from "./schedule-table";

type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

interface AcademicWeeklyScheduleProps {
  title: string;
  subtitle: string;
  semesterLabel: string;
  timeSlots: Array<{
    id: number;
    label: string;
    sequence: number;
    isBreak: boolean;
  }>;
  weekdays: Weekday[];
  entries: Array<{
    id: number;
    weekday: Weekday;
    timeSlotId: number;
    spanSlots: number;
    subjectName: string;
    teacherName: string;
    locationName: string;
  }>;
  generatedAt: string;
  institutionLabel: string;
  sheetId: string;
}

export function AcademicWeeklySchedule(props: AcademicWeeklyScheduleProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
      <ScheduleHeader
        title={props.title}
        subtitle={props.subtitle}
        semesterLabel={props.semesterLabel}
      />
      <ScheduleTable timeSlots={props.timeSlots} weekdays={props.weekdays} entries={props.entries} />
      <ScheduleFooter
        generatedAt={props.generatedAt}
        institutionLabel={props.institutionLabel}
        sheetId={props.sheetId}
      />
    </div>
  );
}
