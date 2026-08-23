import { cn } from "@/lib/utils";
import logoMiva from "@/assets/miva-logo.png";

interface MivaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  /** Mantido por compatibilidade — o PNG é rosé. "white" aplica brilho/ajuste para fundo escuro. */
  variant?: "rose" | "white" | "charcoal";
  /** Mantido por compatibilidade — não é mais renderizado (logo já é gráfico completo). */
  withUnderline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-9",   // ~36px
  md: "h-14",  // ~56px
  lg: "h-20",  // ~80px
  xl: "h-28",  // ~112px
};

/**
 * Logo oficial Miva — letra M estilizada com folha + seta ascendente em rosé.
 * Renderizado a partir do PNG em src/assets para manter a fidelidade visual.
 */
export function MivaLogo({
  size = "md",
  variant = "rose",
  className,
}: MivaLogoProps) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <img
        src={logoMiva}
        alt="Miva"
        draggable={false}
        className={cn(
          "w-auto select-none object-contain",
          sizeMap[size],
          // Sobre fundos escuros, deixa o logo um pouco mais luminoso
          variant === "white" && "brightness-110 drop-shadow-[0_2px_8px_hsl(339_70%_60%/0.35)]"
        )}
      />
    </div>
  );
}
