import { usePreferences } from "@/hooks/use-preferences";
import { InternalBackground } from "./internal-background";
import calmWaves from "@backgrounds/calm-waves.png";
import schoolIcons from "@backgrounds/school-icons-loop.png";

// Fundo do sistema controlado pelas preferencias do usuario.
// "default" reusa o fundo original (gradiente + grade); as demais usam imagens.
export function AppBackground() {
  const { preferences } = usePreferences();

  if (preferences.background === "calm-waves") {
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${calmWaves})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
    );
  }

  if (preferences.background === "school-icons") {
    // Grade de icones lado a lado. O tile (1254x1254) traz ~6 icones por eixo,
    // entao ~450px deixa cada icone com aproximadamente 75px em um monitor 1080p.
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${schoolIcons})`,
            backgroundRepeat: "repeat",
            backgroundSize: "450px 450px",
          }}
        />
      </div>
    );
  }

  return <InternalBackground />;
}
