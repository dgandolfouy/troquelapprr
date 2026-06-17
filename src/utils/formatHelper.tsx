import React from "react";
import { Circle, Square, Star, Tag, Minus, Scissors, HelpCircle } from "lucide-react";

export interface FormatBadgeConfig {
  icon: React.ComponentType<any>;
  bgColor: string;
  borderColor: string;
  textColor: string;
  fillClass: string;
  labelColor: string;
}

export function getFormatBadgeConfig(formatoStr: string): FormatBadgeConfig {
  const fmt = (formatoStr || "").trim().toUpperCase();

  // 1. Tag / Pai (Etiqueta de ropa)
  if (fmt.includes("TAG") || fmt.includes("PAI")) {
    return {
      icon: Tag,
      bgColor: "bg-fuchsia-950/40",
      borderColor: "border-fuchsia-500/35",
      textColor: "text-fuchsia-400",
      fillClass: "fill-fuchsia-500/30",
      labelColor: "text-fuchsia-300",
    };
  }

  // 2. Prepicado (Línea discontinua / Tijera)
  if (fmt.includes("PREPICADO") || fmt.includes("PREP")) {
    return {
      icon: Scissors,
      bgColor: "bg-rose-950/40",
      borderColor: "border-rose-500/35",
      textColor: "text-rose-400",
      fillClass: "", // Scissors isn't usually filled the same way
      labelColor: "text-rose-300",
    };
  }

  // 3. Corte Recto (Línea recta)
  if (fmt.includes("CORTE RECTO") || fmt.includes("RECTO")) {
    return {
      icon: Minus,
      bgColor: "bg-slate-800/60",
      borderColor: "border-slate-500/35",
      textColor: "text-slate-300",
      fillClass: "",
      labelColor: "text-slate-200",
    };
  }

  // 4. Circular (Círculo relleno)
  if (fmt.includes("CIRC") || fmt.includes("CIRCULAR") || fmt.includes("REDONDO")) {
    return {
      icon: Circle,
      bgColor: "bg-emerald-950/40",
      borderColor: "border-emerald-500/35",
      textColor: "text-emerald-400",
      fillClass: "fill-emerald-400/80",
      labelColor: "text-emerald-300",
    };
  }

  // 5. Rectangular (Rectángulo relleno)
  if (fmt.includes("RECT") || fmt.includes("RECTANGULAR")) {
    return {
      icon: Square,
      bgColor: "bg-sky-950/40",
      borderColor: "border-sky-500/35",
      textColor: "text-sky-400",
      fillClass: "fill-sky-400/80",
      labelColor: "text-sky-300",
    };
  }

  // 6. Figura (Estrella)
  if (fmt.includes("FIG") || fmt.includes("FIGURAS") || fmt.includes("FIGURA")) {
    return {
      icon: Star,
      bgColor: "bg-amber-950/40",
      borderColor: "border-amber-500/35",
      textColor: "text-amber-400",
      fillClass: "fill-amber-400/80",
      labelColor: "text-amber-300",
    };
  }

  // Fallback
  return {
    icon: HelpCircle,
    bgColor: "bg-neutral-800/40",
    borderColor: "border-neutral-700/30",
    textColor: "text-gray-400",
    fillClass: "",
    labelColor: "text-gray-300",
  };
}

export function FormatIndicator({ format }: { format: string }) {
  const config = getFormatBadgeConfig(format);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${config.bgColor} ${config.borderColor} ${config.textColor}`}
    >
      <Icon className={`w-3 h-3 ${config.fillClass}`} />
      <span className={config.labelColor}>{format || "OTROS"}</span>
    </span>
  );
}
