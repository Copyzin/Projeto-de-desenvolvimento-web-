import { cn } from "@/lib/utils";

type InternalBackgroundProps = {
  className?: string;
  fit?: "fixed" | "absolute";
};

export function InternalBackground({
  className,
  fit = "fixed",
}: InternalBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none inset-0 z-0 overflow-hidden",
        fit === "fixed" ? "fixed" : "absolute",
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 84% at 50% 0%, hsl(var(--primary) / 0.06), transparent 58%), linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background) / 0.98))",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--primary) / 0.12) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.12) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
    </div>
  );
}
