import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "./ui/logo";
import { InternalBackground } from "./internal-background";

export function LoginTransition() {
  // Respeita preferencia de acessibilidade para reduzir movimento.
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      // Overlay de entrada pos-login: ja inicia visivel para evitar "pulo" de layout.
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      // So existe fade de saida para liberar o dashboard de forma suave.
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {/* Fundo institucional reaproveitado para manter consistencia com o app interno. */}
      <InternalBackground fit="absolute" />
      {/* Camada de contraste para manter foco visual na logo durante a transicao. */}
      <div className="absolute inset-0 bg-background/35 backdrop-blur-[1px]" />

      <div className="relative flex h-32 w-32 items-center justify-center">
        <motion.div
          // Logo nasce centralizada; apenas microajuste de escala para feedback visual.
          initial={{ opacity: 1, scale: 0.98, y: 0 }}
          animate={
            shouldReduceMotion
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0.16, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
          }
          className="relative h-20 w-20 overflow-hidden rounded-full"
        >
          <Logo className="h-20 w-20 text-primary drop-shadow-[0_0_10px_rgba(10,53,117,0.16)]" />
          {!shouldReduceMotion && (
            <motion.span
              // Realce curto que cruza a marca, reforcando "autenticacao concluida".
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
              initial={{ x: "-140%", opacity: 0 }}
              animate={{ x: "240%", opacity: [0, 1, 0] }}
              transition={{ duration: 0.28, delay: 0.08, ease: "easeOut" }}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
