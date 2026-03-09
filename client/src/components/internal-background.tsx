import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type OrbConfig = {
  size: number;
  top: string;
  left: string;
  opacity: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
};

const ORBS: OrbConfig[] = [
  { size: 220, top: "9%", left: "8%", opacity: 0.16, dx: 18, dy: 10, duration: 24, delay: 0.1 },
  { size: 280, top: "15%", left: "72%", opacity: 0.13, dx: -16, dy: 12, duration: 28, delay: 0.4 },
  { size: 190, top: "58%", left: "12%", opacity: 0.12, dx: 14, dy: -10, duration: 26, delay: 0.7 },
  { size: 240, top: "66%", left: "74%", opacity: 0.14, dx: -12, dy: -8, duration: 30, delay: 0.2 },
  { size: 140, top: "34%", left: "42%", opacity: 0.1, dx: 10, dy: 7, duration: 22, delay: 0.6 },
];

type InternalBackgroundProps = {
  className?: string;
  fit?: "fixed" | "absolute";
};

export function InternalBackground({
  className,
  fit = "fixed",
}: InternalBackgroundProps) {
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 34, damping: 18, mass: 1 });
  const smoothY = useSpring(pointerY, { stiffness: 34, damping: 18, mass: 1 });
  const gridX = useTransform(smoothX, (v) => v * 0.45);
  const gridY = useTransform(smoothY, (v) => v * 0.45);
  const orbX = useTransform(smoothX, (v) => v * 0.75);
  const orbY = useTransform(smoothY, (v) => v * 0.75);

  useEffect(() => {
    if (shouldReduceMotion || typeof window === "undefined") {
      pointerX.set(0);
      pointerY.set(0);
      return;
    }

    let rafId: number | null = null;
    let nextX = 0;
    let nextY = 0;

    const applyParallax = () => {
      pointerX.set(nextX);
      pointerY.set(nextY);
      rafId = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;

      // Intensidade bem leve para manter o fundo secundario.
      nextX = nx * 8;
      nextY = ny * 6;

      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyParallax);
      }
    };

    const onPointerLeave = () => {
      nextX = 0;
      nextY = 0;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyParallax);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [pointerX, pointerY, shouldReduceMotion]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none inset-0 z-0 overflow-hidden",
        fit === "fixed" ? "fixed" : "absolute",
        className,
      )}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          x: smoothX,
          y: smoothY,
          background:
            "radial-gradient(120% 84% at 50% 0%, hsl(var(--primary) / 0.06), transparent 58%), linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background) / 0.98))",
        }}
      />

      <motion.div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          x: gridX,
          y: gridY,
          backgroundImage:
            "linear-gradient(to right, hsl(var(--primary) / 0.12) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.12) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <motion.div className="absolute inset-0" style={{ x: orbX, y: orbY }}>
        {ORBS.map((orb, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full border border-primary/15 bg-primary/10"
            style={{
              width: orb.size,
              height: orb.size,
              top: orb.top,
              left: orb.left,
            }}
            animate={
              shouldReduceMotion
                ? { opacity: orb.opacity }
                : {
                    x: [0, orb.dx, 0, -orb.dx, 0],
                    y: [0, -orb.dy, 0, orb.dy, 0],
                    opacity: [orb.opacity * 0.86, orb.opacity, orb.opacity * 0.9, orb.opacity * 0.96, orb.opacity * 0.86],
                  }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : {
                    duration: orb.duration,
                    repeat: Infinity,
                    delay: orb.delay,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
