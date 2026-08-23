import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import iconPiggy from "@/assets/icon-piggy.png";
import iconPiggyMasc from "@/assets/icon-piggy-masc.png";
import iconWallet from "@/assets/icon-wallet.png";
import iconHouse from "@/assets/icon-house.png";
import iconBill from "@/assets/icon-bill.png";
import iconFlower from "@/assets/icon-flower.png";
import iconCoins from "@/assets/icon-coins.png";
import iconBriefcase from "@/assets/icon-briefcase.png";
import iconCoffee from "@/assets/icon-coffee.png";
import iconCar from "@/assets/icon-car.png";
import iconGamepad from "@/assets/icon-gamepad.png";
import iconDumbbell from "@/assets/icon-dumbbell.png";
import iconHeadphones from "@/assets/icon-headphones.png";

export type ThiingName =
  | "piggy"
  | "wallet"
  | "house"
  | "bill"
  | "flower"
  | "coins"
  | "piggy-masc"
  | "briefcase"
  | "coffee"
  | "car"
  | "gamepad"
  | "dumbbell"
  | "headphones";

const map: Record<ThiingName, string> = {
  piggy: iconPiggy,
  "piggy-masc": iconPiggyMasc,
  wallet: iconWallet,
  house: iconHouse,
  bill: iconBill,
  flower: iconFlower,
  coins: iconCoins,
  briefcase: iconBriefcase,
  coffee: iconCoffee,
  car: iconCar,
  gamepad: iconGamepad,
  dumbbell: iconDumbbell,
  headphones: iconHeadphones,
};

const labels: Record<ThiingName, string> = {
  piggy: "Cofrinho",
  "piggy-masc": "Cofrinho",
  wallet: "Carteira",
  house: "Casa",
  bill: "Conta",
  flower: "Flor",
  coins: "Moedas",
  briefcase: "Pasta",
  coffee: "Café",
  car: "Carro",
  gamepad: "Controle",
  dumbbell: "Haltere",
  headphones: "Fone",
};

/**
 * No tema masculino, substituímos ícones com conotação mais feminina
 * por alternativas mais sóbrias/neutras.
 */
const mascMap: Partial<Record<ThiingName, ThiingName>> = {
  piggy: "piggy-masc",
  flower: "coffee",
  wallet: "briefcase",
};

const sizeMap = {
  xs: "w-8 h-8",
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
  xl: "w-28 h-28",
  "2xl": "w-40 h-40",
} as const;

interface ThiingIconProps {
  name: ThiingName;
  size?: keyof typeof sizeMap;
  className?: string;
  /** Float = leve animação flutuante */
  float?: boolean;
}

/**
 * Ícones 3D estilo claymorphism (inspirado em thiings.co).
 * Ideais para hero cards, categorias e empty states.
 * Trocam automaticamente para variantes masculinas quando o tema azul está ativo.
 */
export function ThiingIcon({ name, size = "md", className, float = false }: ThiingIconProps) {
  const { theme } = useTheme();
  const resolved = theme === "masculino" ? mascMap[name] ?? name : name;

  return (
    <img
      src={map[resolved]}
      alt={labels[resolved]}
      loading="lazy"
      width={512}
      height={512}
      className={cn(
        "object-contain select-none pointer-events-none thiing-shadow",
        sizeMap[size],
        float && "animate-float",
        className,
      )}
    />
  );
}
