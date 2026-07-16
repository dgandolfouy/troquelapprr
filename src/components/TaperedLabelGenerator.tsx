import React, { useState, useMemo } from "react";
import { 
  Calculator, 
  Ruler, 
  Download, 
  Printer, 
  RefreshCw, 
  Info, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TaperedInputs {
  unit: "mm";
  topCircumference: number;
  bottomCircumference: number;
  height: number;
  wrapCoverage: number; // e.g. 100%
  cornerRadius: number;
  containerOutline: boolean;
}

// Helper para generar la ruta SVG del patrón desarrollado de un tronco de cono
const generateTaperedPath = (
  R_top: number,
  R_bottom: number,
  theta: number,
  r_c: number,
  centerIsAbove: boolean
): string => {
  if (R_top <= 0 || R_bottom <= 0 || theta <= 0) return "";
  
  const isTopOuter = R_top > R_bottom;
  const maxAllowedRc = Math.min(
    Math.abs(R_top - R_bottom) / 2,
    Math.min(R_top, R_bottom) * Math.sin(theta / 2)
  );
  const rc = Math.max(0, Math.min(r_c, maxAllowedRc));

  const getXY = (r: number, phi: number) => {
    if (centerIsAbove) {
      return {
        x: r * Math.sin(phi),
        y: r * Math.cos(phi),
      };
    } else {
      return {
        x: r * Math.sin(phi),
        y: -r * Math.cos(phi),
      };
    }
  };

  if (rc < 0.1) {
    const pTopLeft = getXY(R_top, -theta / 2);
    const pTopRight = getXY(R_top, theta / 2);
    const pBottomRight = getXY(R_bottom, theta / 2);
    const pBottomLeft = getXY(R_bottom, -theta / 2);

    const largeArcFlag = theta > Math.PI ? 1 : 0;
    return (
      `M ${pTopLeft.x.toFixed(3)} ${pTopLeft.y.toFixed(3)} ` +
      `A ${R_top.toFixed(3)} ${R_top.toFixed(3)} 0 ${largeArcFlag} 1 ${pTopRight.x.toFixed(3)} ${pTopRight.y.toFixed(3)} ` +
      `L ${pBottomRight.x.toFixed(3)} ${pBottomRight.y.toFixed(3)} ` +
      `A ${R_bottom.toFixed(3)} ${R_bottom.toFixed(3)} 0 ${largeArcFlag} 0 ${pBottomLeft.x.toFixed(3)} ${pBottomLeft.y.toFixed(3)} Z`
    );
  }

  const getCornerParams = (R: number, isOuter: boolean) => {
    const rCenter = isOuter ? R - rc : R + rc;
    if (rCenter <= rc) return { phiArc: 0, rRadial: R };
    const deltaPhi = Math.asin(rc / rCenter);
    const phiCenter = theta / 2 - deltaPhi;
    const phiArc = phiCenter;
    const rRadial = Math.sqrt(rCenter * rCenter - rc * rc);
    return { phiArc, rRadial };
  };

  const paramsTop = getCornerParams(R_top, isTopOuter);
  const paramsBottom = getCornerParams(R_bottom, !isTopOuter);

  const pTopArcLeft = getXY(R_top, -paramsTop.phiArc);
  const pTopRadialLeft = getXY(paramsTop.rRadial, -theta / 2);

  const pTopArcRight = getXY(R_top, paramsTop.phiArc);
  const pTopRadialRight = getXY(paramsTop.rRadial, theta / 2);

  const pBottomArcRight = getXY(R_bottom, paramsBottom.phiArc);
  const pBottomRadialRight = getXY(paramsBottom.rRadial, theta / 2);

  const pBottomArcLeft = getXY(R_bottom, -paramsBottom.phiArc);
  const pBottomRadialLeft = getXY(paramsBottom.rRadial, -theta / 2);

  const largeArcFlag = theta > Math.PI ? 1 : 0;

  return (
    `M ${pTopArcLeft.x.toFixed(3)} ${pTopArcLeft.y.toFixed(3)} ` +
    `A ${R_top.toFixed(3)} ${R_top.toFixed(3)} 0 ${largeArcFlag} 1 ${pTopArcRight.x.toFixed(3)} ${pTopArcRight.y.toFixed(3)} ` +
    `A ${rc.toFixed(3)} ${rc.toFixed(3)} 0 0 1 ${pTopRadialRight.x.toFixed(3)} ${pTopRadialRight.y.toFixed(3)} ` +
    `L ${pBottomRadialRight.x.toFixed(3)} ${pBottomRadialRight.y.toFixed(3)} ` +
    `A ${rc.toFixed(3)} ${rc.toFixed(3)} 0 0 1 ${pBottomArcRight.x.toFixed(3)} ${pBottomArcRight.y.toFixed(3)} ` +
    `A ${R_bottom.toFixed(3)} ${R_bottom.toFixed(3)} 0 ${largeArcFlag} 0 ${pBottomArcLeft.x.toFixed(3)} ${pBottomArcLeft.y.toFixed(3)} ` +
    `A ${rc.toFixed(3)} ${rc.toFixed(3)} 0 0 1 ${pBottomRadialLeft.x.toFixed(3)} ${pBottomRadialLeft.y.toFixed(3)} ` +
    `L ${pTopRadialLeft.x.toFixed(3)} ${pTopRadialLeft.y.toFixed(3)} ` +
    `A ${rc.toFixed(3)} ${rc.toFixed(3)} 0 0 1 ${pTopArcLeft.x.toFixed(3)} ${pTopArcLeft.y.toFixed(3)} Z`
  );
};

export const TaperedLabelGenerator: React.FC = () => {
  // Inicialización de inputs todos en cero por defecto (solicitud del usuario)
  const [inputs, setInputs] = useState<TaperedInputs>({
    unit: "mm",
    topCircumference: 0,
    bottomCircumference: 0,
    height: 0,
    wrapCoverage: 0,
    cornerRadius: 0,
    containerOutline: true
  });

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showMeasuringHelp, setShowMeasuringHelp] = useState<boolean>(false);
  const [calcFeedback, setCalcFeedback] = useState<boolean>(false);

  const handleInputChange = (field: keyof TaperedInputs, value: any) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validación de valores en cero
  const hasZeroInputs = useMemo(() => {
    return inputs.topCircumference <= 0 || inputs.bottomCircumference <= 0 || inputs.height <= 0 || inputs.wrapCoverage <= 0;
  }, [inputs]);

  // Cálculo de parámetros de la plantilla plana desarrollada
  const results = useMemo(() => {
    const { topCircumference, bottomCircumference, height, wrapCoverage, cornerRadius, containerOutline } = inputs;

    const factor = 1; // Siempre en milímetros
    const Ct = Math.max(0, topCircumference * factor);
    const Cb = Math.max(0, bottomCircumference * factor);
    const L = Math.max(0, height * factor);
    const W = Math.max(0, wrapCoverage / 100);
    const rcRaw = Math.max(0, cornerRadius * factor);

    if (Ct <= 0 || Cb <= 0 || L <= 0 || W <= 0) {
      return {
        isCylinder: false,
        boundingBoxWidth: 0,
        boundingBoxHeight: 0,
        labelPath: "",
        containerPath: "",
        rc: 0,
        R_top: 0,
        R_bottom: 0,
        theta_container: 0,
        theta_label: 0,
        topArcLength: 0,
        bottomArcLength: 0,
        slantHeight: 0,
        wrapPercentage: wrapCoverage,
        centerIsAbove: true,
        factor,
        minX: 0,
        minY: 0
      };
    }

    const isCylinder = Math.abs(Ct - Cb) < 0.1;

    if (isCylinder) {
      const wContainer = Ct;
      const wLabel = Ct * W;
      const hLabel = L;
      const rc = Math.max(0, Math.min(rcRaw, hLabel / 2, wLabel / 2));

      let labelPath = "";
      if (rc < 0.1) {
        labelPath = `M ${-wLabel/2} ${-hLabel/2} L ${wLabel/2} ${-hLabel/2} L ${wLabel/2} ${hLabel/2} L ${-wLabel/2} ${hLabel/2} Z`;
      } else {
        labelPath = `M ${-wLabel/2 + rc} ${-hLabel/2} ` +
                    `L ${wLabel/2 - rc} ${-hLabel/2} ` +
                    `A ${rc} ${rc} 0 0 1 ${wLabel/2} ${-hLabel/2 + rc} ` +
                    `L ${wLabel/2} ${hLabel/2 - rc} ` +
                    `A ${rc} ${rc} 0 0 1 ${wLabel/2 - rc} ${hLabel/2} ` +
                    `L ${-wLabel/2 + rc} ${hLabel/2} ` +
                    `A ${rc} ${rc} 0 0 1 ${-wLabel/2} ${hLabel/2 - rc} ` +
                    `L ${-wLabel/2} ${-hLabel/2 + rc} ` +
                    `A ${rc} ${rc} 0 0 1 ${-wLabel/2 + rc} ${-hLabel/2} Z`;
      }

      const boundingBoxWidth = containerOutline ? Math.max(wContainer, wLabel) : wLabel;
      const boundingBoxHeight = hLabel;

      return {
        isCylinder: true,
        boundingBoxWidth,
        boundingBoxHeight,
        labelPath,
        containerPath: "",
        rc,
        R_top: Infinity,
        R_bottom: Infinity,
        theta_container: 0,
        theta_label: 0,
        topArcLength: wLabel,
        bottomArcLength: wLabel,
        slantHeight: L,
        wrapPercentage: wrapCoverage,
        centerIsAbove: true,
        factor,
        minX: -boundingBoxWidth / 2,
        minY: -boundingBoxHeight / 2
      };
    }

    // Cónicos (tronco de cono desarrollado)
    const centerIsAbove = Ct < Cb;
    const R_top = centerIsAbove 
      ? (Ct * L) / (Cb - Ct)
      : (Ct * L) / (Ct - Cb);
    const R_bottom = centerIsAbove
      ? (Cb * L) / (Cb - Ct)
      : (Cb * L) / (Ct - Cb);

    const theta_container = Math.abs(Ct - Cb) / L;
    const theta_label = theta_container * W;

    // Límite del radio de esquina
    const maxRc = Math.min(Math.abs(R_top - R_bottom) / 2, Math.min(R_top, R_bottom) * Math.sin(theta_label / 2));
    const rc = Math.max(0, Math.min(rcRaw, maxRc));

    // Rutas SVG
    const labelPath = generateTaperedPath(R_top, R_bottom, theta_label, rc, centerIsAbove);
    const containerPath = generateTaperedPath(R_top, R_bottom, theta_container, 0, centerIsAbove);

    const getXY = (r: number, phi: number) => {
      if (centerIsAbove) {
        return { x: r * Math.sin(phi), y: r * Math.cos(phi) };
      } else {
        return { x: r * Math.sin(phi), y: -r * Math.cos(phi) };
      }
    };

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const addPoint = (p: { x: number, y: number }) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    };

    // Trazar puntos críticos de la etiqueta para la caja delimitadora
    addPoint(getXY(R_top, -theta_label / 2));
    addPoint(getXY(R_top, theta_label / 2));
    addPoint(getXY(R_bottom, -theta_label / 2));
    addPoint(getXY(R_bottom, theta_label / 2));
    addPoint(getXY(R_top, 0));
    addPoint(getXY(R_bottom, 0));

    // Trazar límites del contorno gris del envase
    if (containerOutline) {
      addPoint(getXY(R_top, -theta_container / 2));
      addPoint(getXY(R_top, theta_container / 2));
      addPoint(getXY(R_bottom, -theta_container / 2));
      addPoint(getXY(R_bottom, theta_container / 2));
    }

    const boundingBoxWidth = maxX - minX;
    const boundingBoxHeight = maxY - minY;

    return {
      isCylinder: false,
      boundingBoxWidth,
      boundingBoxHeight,
      labelPath,
      containerPath,
      rc,
      R_top,
      R_bottom,
      theta_container,
      theta_label,
      topArcLength: R_top * theta_label,
      bottomArcLength: R_bottom * theta_label,
      slantHeight: L,
      wrapPercentage: wrapCoverage,
      centerIsAbove,
      factor,
      minX,
      minY
    };
  }, [inputs]);

  // Manejo de la impresión del PDF escala real 1:1
  const handlePrintTemplate = () => {
    if (hasZeroInputs) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const pad = 15; // Margen en milímetros
    const viewW = results.boundingBoxWidth + pad * 2;
    const viewH = results.boundingBoxHeight + pad * 2;

    const offsetShimX = -results.minX + pad;
    const offsetShimY = -results.minY + pad;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Plantilla de Etiqueta Cónica</title>
        <style>
          body {
            margin: 0;
            padding: 30px;
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #111111;
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 15px;
          }
          .header h1 {
            font-size: 20px;
            margin: 0;
            color: #111111;
          }
          .header p {
            font-size: 11px;
            margin: 4px 0 0 0;
            color: #666666;
          }
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .svg-wrapper {
            border: 1px dashed #cccccc;
            padding: 10px;
            background-color: #fafafa;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .specs-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            max-width: 450px;
            width: 100%;
            font-size: 11px;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
          }
          .spec-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 4px;
          }
          .spec-label {
            font-weight: 600;
            color: #555555;
          }
          .spec-val {
            font-family: monospace;
            font-weight: bold;
          }
          .print-btn {
            background-color: #f97316;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 20px;
          }
          @media print {
            body { padding: 0; }
            .header, .specs-grid, .print-btn { display: none !important; }
            .svg-wrapper { border: none !important; background-color: transparent !important; padding: 0 !important; }
            @page { size: auto; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Plantilla de Corte - Etiqueta Cónica</h1>
            <p>Generado a escala física real 1:1 (Milímetros)</p>
          </div>
          
          <button class="print-btn" onclick="window.print()">Imprimir en Papel (Escala Real 1:1)</button>

          <div class="svg-wrapper">
            <svg 
              width="${viewW}mm" 
              height="${viewH}mm" 
              viewBox="0 0 ${viewW} ${viewH}"
              style="display: block;"
            >
              <g transform="translate(${offsetShimX}, ${offsetShimY})">
                <!-- Contorno del envase -->
                ${inputs.containerOutline && !results.isCylinder ? `
                <path 
                  d="${results.containerPath}" 
                  fill="none" 
                  stroke="#9e9e9e" 
                  stroke-width="0.2" 
                  stroke-dasharray="2 2"
                />` : ""}

                ${inputs.containerOutline && results.isCylinder ? `
                <rect 
                  x="${-results.boundingBoxWidth/2}" 
                  y="${-results.boundingBoxHeight/2}" 
                  width="${inputs.topCircumference}" 
                  height="${results.boundingBoxHeight}" 
                  fill="none" 
                  stroke="#9e9e9e" 
                  stroke-width="0.2" 
                  stroke-dasharray="2 2"
                />` : ""}

                <!-- Etiqueta -->
                <path 
                  d="${results.labelPath}" 
                  fill="none" 
                  stroke="#111111" 
                  stroke-width="0.4" 
                />
              </g>

              <!-- Regla de control de calibración -->
              <line x1="5" y1="5" x2="55" y2="5" stroke="#000000" stroke-width="0.5"/>
              <text x="5" y="12" font-size="5" font-family="monospace">Regla de Control: 50 mm (5 cm)</text>
            </svg>
          </div>

          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">Circunferencia Superior:</span>
              <span class="spec-val">${inputs.topCircumference} mm</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Circunferencia Inferior:</span>
              <span class="spec-val">${inputs.bottomCircumference} mm</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Altura:</span>
              <span class="spec-val">${inputs.height} mm</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Radio de Esquinas:</span>
              <span class="spec-val">${inputs.cornerRadius} mm</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Ancho del Pliego:</span>
              <span class="spec-val">${results.boundingBoxWidth.toFixed(2)} mm</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Alto del Pliego:</span>
              <span class="spec-val">${results.boundingBoxHeight.toFixed(2)} mm</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Exportar archivo vectorial SVG directo
  const handleExportSVG = () => {
    if (hasZeroInputs) return;
    const pad = 10;
    const viewW = results.boundingBoxWidth + pad * 2;
    const viewH = results.boundingBoxHeight + pad * 2;
    const offsetShimX = -results.minX + pad;
    const offsetShimY = -results.minY + pad;

    const svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="${viewW}mm" height="${viewH}mm" viewBox="0 0 ${viewW} ${viewH}">
  <g transform="translate(${offsetShimX}, ${offsetShimY})">
    ${inputs.containerOutline && !results.isCylinder ? `<path d="${results.containerPath}" fill="none" stroke="#9E9E9E" stroke-width="0.3" stroke-dasharray="1,1" />` : ""}
    <path d="${results.labelPath}" fill="none" stroke="#F97316" stroke-width="0.5" />
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `troquel_conico_${inputs.topCircumference}x${inputs.bottomCircumference}_mm.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setInputs({
      unit: "mm",
      topCircumference: 0,
      bottomCircumference: 0,
      height: 0,
      wrapCoverage: 0,
      cornerRadius: 0,
      containerOutline: true
    });
  };

  const triggerCalculate = () => {
    if (hasZeroInputs) return;
    setCalcFeedback(true);
    setTimeout(() => setCalcFeedback(false), 800);
  };

  // Textos explicativos en español para los Tooltips
  const helpTexts: Record<string, string> = {
    topCircumference: "Mide alrededor de tu envase exactamente donde quieres que quede el borde superior de tu etiqueta.",
    bottomCircumference: "Mide alrededor de tu envase exactamente donde quieres que quede el borde inferior de tu etiqueta.",
    height: "Mide la distancia recta a lo largo del costado inclinado del envase, entre las marcas de arriba y abajo.",
    wrapCoverage: "Porcentaje de cobertura alrededor del envase. Usa 100% para un ajuste completo de 360 grados, o más si deseas que se traslape.",
    cornerRadius: "Radio para esquinas redondeadas. Pon 0 para esquinas vivas (rectas). Los valores más altos aumentan la redondez.",
    containerOutline: "Dibuja el contorno total del envase (360°) en color gris punteado para ver cómo asienta la etiqueta en la pieza."
  };

  return (
    <div className="bg-neutral-900/40 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md animate-fade-in select-none">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-orange-600/5 rounded-2xl border border-orange-500/10">
            <Calculator className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-xl tracking-tight flex items-center gap-2">
              Calculador de Etiquetas Cónicas
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Desarrolla plantillas de corte perfectas para envases cónicos, vasos, copas y botellas con inclinación.
            </p>
          </div>
        </div>

        <button 
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reestablecer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: Entradas y Controles (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Indicador de Unidad */}
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-2 rounded-xl border border-white/5 w-fit">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-bold text-gray-300">Unidad de Medida: Milímetros (mm)</span>
          </div>

          {/* Acordeón de Guía de Medición */}
          <div>
            <button
              onClick={() => setShowMeasuringHelp(!showMeasuringHelp)}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition-all outline-none"
            >
              <Ruler className="w-4 h-4 text-blue-500" />
              <span>¿Necesitas ayuda para medir?</span>
              {showMeasuringHelp ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            
            <AnimatePresence>
              {showMeasuringHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-neutral-950/40 rounded-xl border border-white/5 mt-2.5 p-4 text-xs text-gray-300 space-y-3"
                >
                  <div>
                    <h4 className="font-bold text-white mb-1">1. Circunferencia Superior:</h4>
                    <p className="text-gray-400">Rodea con una cinta métrica el envase exactamente a la altura donde quieres que esté el borde superior de la etiqueta.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">2. Circunferencia Inferior:</h4>
                    <p className="text-gray-400">Rodea el envase a la altura donde terminará el borde inferior de la etiqueta.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">3. Altura Inclinada:</h4>
                    <p className="text-gray-400">Mide con una regla la distancia inclinada directamente sobre la pared lateral del envase entre los dos niveles anteriores.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filas del Formulario */}
          <div className="bg-neutral-950/30 border border-white/5 rounded-2xl p-5 space-y-5">
            
            {/* Circunferencia Superior */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Circunferencia Superior (mm)</span>
                  <button 
                    onClick={() => setActiveTooltip(activeTooltip === "topCircumference" ? null : "topCircumference")}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  Mide alrededor de tu envase en la parte superior donde se colocará la etiqueta.
                </p>
                {activeTooltip === "topCircumference" && (
                  <div className="absolute left-0 top-10 z-20 bg-neutral-950 border border-white/10 p-3 rounded-lg text-[11px] text-gray-300 shadow-xl max-w-xs">
                    {helpTexts.topCircumference}
                  </div>
                )}
              </div>
              <div className="relative w-28 sm:shrink-0">
                <input 
                  type="number"
                  step="1"
                  min="0"
                  value={inputs.topCircumference || ""}
                  onChange={(e) => handleInputChange("topCircumference", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-neutral-950 border border-white/5 focus:border-blue-500 text-white font-mono text-center text-sm p-2 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Circunferencia Inferior */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Circunferencia Inferior (mm)</span>
                  <button 
                    onClick={() => setActiveTooltip(activeTooltip === "bottomCircumference" ? null : "bottomCircumference")}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  Mide alrededor de tu envase en la parte inferior donde terminará la etiqueta.
                </p>
                {activeTooltip === "bottomCircumference" && (
                  <div className="absolute left-0 top-10 z-20 bg-neutral-950 border border-white/10 p-3 rounded-lg text-[11px] text-gray-300 shadow-xl max-w-xs">
                    {helpTexts.bottomCircumference}
                  </div>
                )}
              </div>
              <div className="relative w-28 sm:shrink-0">
                <input 
                  type="number"
                  step="1"
                  min="0"
                  value={inputs.bottomCircumference || ""}
                  onChange={(e) => handleInputChange("bottomCircumference", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-neutral-950 border border-white/5 focus:border-blue-500 text-white font-mono text-center text-sm p-2 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Altura */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Altura de Etiqueta (mm)</span>
                  <button 
                    onClick={() => setActiveTooltip(activeTooltip === "height" ? null : "height")}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  La distancia recta inclinada sobre la cara del envase entre los dos niveles.
                </p>
                {activeTooltip === "height" && (
                  <div className="absolute left-0 top-10 z-20 bg-neutral-950 border border-white/10 p-3 rounded-lg text-[11px] text-gray-300 shadow-xl max-w-xs">
                    {helpTexts.height}
                  </div>
                )}
              </div>
              <div className="relative w-28 sm:shrink-0">
                <input 
                  type="number"
                  step="1"
                  min="0"
                  value={inputs.height || ""}
                  onChange={(e) => handleInputChange("height", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-neutral-950 border border-white/5 focus:border-blue-500 text-white font-mono text-center text-sm p-2 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Cobertura de Envoltura */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Cobertura de Envoltura (%)</span>
                  <button 
                    onClick={() => setActiveTooltip(activeTooltip === "wrapCoverage" ? null : "wrapCoverage")}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  ¿Qué porcentaje del envase rodea? Usa 100% para cobertura exacta, o más para solapar y pegar.
                </p>
                {activeTooltip === "wrapCoverage" && (
                  <div className="absolute left-0 top-10 z-20 bg-neutral-950 border border-white/10 p-3 rounded-lg text-[11px] text-gray-300 shadow-xl max-w-xs">
                    {helpTexts.wrapCoverage}
                  </div>
                )}
              </div>
              <div className="relative w-28 sm:shrink-0">
                <input 
                  type="number"
                  step="1"
                  min="0"
                  max="150"
                  value={inputs.wrapCoverage || ""}
                  onChange={(e) => handleInputChange("wrapCoverage", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-neutral-950 border border-white/5 focus:border-blue-500 text-white font-mono text-center text-sm p-2 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Radio de Esquinas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Radio de Esquinas (mm)</span>
                  <button 
                    onClick={() => setActiveTooltip(activeTooltip === "cornerRadius" ? null : "cornerRadius")}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  ¿Quieres esquinas rectas o redondeadas? Pon 0 para esquinas rectas de 90 grados.
                </p>
                {activeTooltip === "cornerRadius" && (
                  <div className="absolute left-0 top-10 z-20 bg-neutral-950 border border-white/10 p-3 rounded-lg text-[11px] text-gray-300 shadow-xl max-w-xs">
                    {helpTexts.cornerRadius}
                  </div>
                )}
              </div>
              <div className="relative w-28 sm:shrink-0">
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  value={inputs.cornerRadius === 0 ? "0" : inputs.cornerRadius || ""}
                  onChange={(e) => handleInputChange("cornerRadius", Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-neutral-950 border border-white/5 focus:border-blue-500 text-white font-mono text-center text-sm p-2 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Contorno del Envase */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Contorno del Envase (Gris Punteado)</span>
                  <button 
                    onClick={() => setActiveTooltip(activeTooltip === "containerOutline" ? null : "containerOutline")}
                    className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  Muestra la silueta completa de 360 grados de tu pieza cónica para referencia visual.
                </p>
                {activeTooltip === "containerOutline" && (
                  <div className="absolute left-0 top-10 z-20 bg-neutral-950 border border-white/10 p-3 rounded-lg text-[11px] text-gray-300 shadow-xl max-w-xs">
                    {helpTexts.containerOutline}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end w-28 sm:shrink-0">
                <input 
                  type="checkbox"
                  checked={inputs.containerOutline}
                  onChange={(e) => handleInputChange("containerOutline", e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded border-white/5 cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* BOTÓN CALCULAR */}
          <button
            onClick={triggerCalculate}
            disabled={hasZeroInputs}
            className={`w-full text-white font-extrabold py-3 px-6 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              hasZeroInputs 
                ? "bg-neutral-800 text-gray-500 border border-white/5 cursor-not-allowed" 
                : "bg-orange-500 hover:bg-orange-600 active:scale-95"
            }`}
          >
            {calcFeedback ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Calculando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Calcular Plantilla</span>
              </>
            )}
          </button>

          {/* Consejo Box */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-amber-300/90 text-xs">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-wider text-[10px]">Consejo:</p>
              <p className="leading-relaxed">
                Para etiquetas envolventes completas (360°), se recomienda un traslape de pegado de <span className="text-amber-400 font-bold">5 mm a 8 mm</span> para asegurar el solapamiento adhesivo final.
              </p>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: Vista Previa y Descargas (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          
          {/* Tarjeta de Marco de Vista Previa */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between items-center relative overflow-hidden group min-h-[360px]">
            
            {/* Indicador superior */}
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest text-center mb-2">
              Superior (Arriba)
            </div>

            {/* Escenario de renderizado SVG */}
            <div className="w-full h-80 flex items-center justify-center bg-neutral-50/50 rounded-2xl border border-neutral-100 p-4 relative">
              {hasZeroInputs ? (
                <div className="text-center p-6 flex flex-col items-center justify-center">
                  <div className="p-3 bg-neutral-100 rounded-2xl text-neutral-400 mb-3">
                    <Ruler className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-neutral-800">Esperando Medidas</p>
                  <p className="text-xs text-neutral-500 max-w-xs mt-1 leading-relaxed">
                    Ingresa valores mayores a 0 en la circunferencia, altura y cobertura para generar y visualizar tu troquel cónico en tiempo real.
                  </p>
                </div>
              ) : (
                <>
                  {(() => {
                    const pad = 12;
                    const viewW = results.boundingBoxWidth + pad * 2;
                    const viewH = results.boundingBoxHeight + pad * 2;
                    const offsetShimX = -results.minX + pad;
                    const offsetShimY = -results.minY + pad;

                    return (
                      <svg 
                        className="w-full h-full p-4 transition-transform duration-300 group-hover:scale-[1.02]"
                        viewBox={`0 0 ${viewW} ${viewH}`}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g transform={`translate(${offsetShimX}, ${offsetShimY})`}>
                          {/* Línea punteada del envase si está marcada */}
                          {inputs.containerOutline && !results.isCylinder && (
                            <path 
                              d={results.containerPath} 
                              fill="none" 
                              stroke="#9e9e9e" 
                              strokeWidth="1.2" 
                              strokeDasharray="3 3"
                            />
                          )}

                          {inputs.containerOutline && results.isCylinder && (
                            <rect 
                              x={-results.boundingBoxWidth / 2}
                              y={-results.boundingBoxHeight / 2}
                              width={inputs.topCircumference}
                              height={results.boundingBoxHeight}
                              fill="none" 
                              stroke="#9e9e9e" 
                              strokeWidth="1.2" 
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* Etiqueta activa de primer plano */}
                          <path 
                            d={results.labelPath} 
                            fill="rgba(249, 115, 22, 0.05)" 
                            stroke="#f97316" 
                            strokeWidth="2.5" 
                            className="transition-all duration-300"
                          />
                        </g>
                      </svg>
                    );
                  })()}

                  {/* Superposición dinámica de tamaño */}
                  <div className="absolute bottom-3 right-3 text-[10px] font-mono text-neutral-500 bg-white/90 border border-neutral-100 px-2 py-1 rounded-md shadow-sm">
                    Pliego: <span className="text-orange-600 font-bold">{results.boundingBoxWidth.toFixed(1)} × {results.boundingBoxHeight.toFixed(1)} mm</span>
                  </div>
                </>
              )}
            </div>

            {/* Indicador inferior */}
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest text-center mt-2">
              Inferior (Abajo)
            </div>

            {/* Botones de acción bajo la vista previa */}
            <div className="w-full flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handlePrintTemplate}
                disabled={hasZeroInputs}
                className={`flex-1 font-extrabold py-3 px-5 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                  hasZeroInputs 
                    ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed" 
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                <Printer className="w-4 h-4" /> Imprimir Plantilla (1:1)
              </button>
              <button
                onClick={handleExportSVG}
                disabled={hasZeroInputs}
                className={`flex-1 font-extrabold py-3 px-5 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer border ${
                  hasZeroInputs 
                    ? "bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed" 
                    : "bg-neutral-900 hover:bg-neutral-850 text-white border-white/5"
                }`}
              >
                <Download className="w-4 h-4" /> Descargar Vector SVG
              </button>
            </div>

          </div>

          {/* Lista de métricas y cálculos avanzados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-950/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="block text-[8px] uppercase tracking-widest text-gray-500 font-extrabold">Longitud Arco Superior</span>
              <span className="font-mono text-white font-bold text-xs sm:text-sm mt-1 block">
                {results.topArcLength.toFixed(2)} <span className="text-[9px] text-gray-500">mm</span>
              </span>
            </div>

            <div className="bg-neutral-950/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="block text-[8px] uppercase tracking-widest text-gray-500 font-extrabold">Longitud Arco Inferior</span>
              <span className="font-mono text-white font-bold text-xs sm:text-sm mt-1 block">
                {results.bottomArcLength.toFixed(2)} <span className="text-[9px] text-gray-500">mm</span>
              </span>
            </div>

            <div className="bg-neutral-950/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="block text-[8px] uppercase tracking-widest text-gray-500 font-extrabold">Radio de Curvatura</span>
              <span className="font-mono text-orange-400 font-bold text-xs sm:text-sm mt-1 block">
                {results.isCylinder ? "∞ (Recto)" : `${results.R_top.toFixed(1)} mm`}
              </span>
            </div>

            <div className="bg-neutral-950/40 border border-white/5 p-3 rounded-2xl text-center">
              <span className="block text-[8px] uppercase tracking-widest text-gray-500 font-extrabold">Ángulo de Desarrollo</span>
              <span className="font-mono text-orange-400 font-bold text-xs sm:text-sm mt-1 block">
                {((results.theta_label * 180) / Math.PI).toFixed(1)}°
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
