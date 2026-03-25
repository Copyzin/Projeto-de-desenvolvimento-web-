interface ScheduleCellProps {
  subjectName: string;
  teacherName: string;
  locationName: string;
  spanSlots: number;
}

export function ScheduleCell({ subjectName, teacherName, locationName, spanSlots }: ScheduleCellProps) {
  return (
    <td rowSpan={spanSlots} className="border border-slate-200 bg-white p-3 align-top text-xs leading-relaxed">
      <div className="min-h-[84px] break-words">
        <span className="mb-1 block text-[13px] font-bold text-slate-950">{subjectName}</span>
        <span className="block text-slate-500 italic">{teacherName}</span>
        <span className="mt-2 block font-semibold text-slate-700">{locationName}</span>
        {spanSlots > 1 && (
          <span className="mt-1 block text-[9px] italic text-slate-400">{`Sessao continua por ${spanSlots} blocos`}</span>
        )}
      </div>
    </td>
  );
}
