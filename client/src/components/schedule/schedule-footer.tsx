interface ScheduleFooterProps {
  generatedAt: string;
  institutionLabel: string;
  sheetId: string;
}

export function ScheduleFooter({ generatedAt, institutionLabel, sheetId }: ScheduleFooterProps) {
  return (
    <div className="mt-4 flex flex-col gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400 sm:flex-row sm:justify-between">
      <span>{generatedAt}</span>
      <span>{institutionLabel}</span>
      <span>{sheetId}</span>
    </div>
  );
}
