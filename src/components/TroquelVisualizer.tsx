/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MoveRight, RefreshCw, Scissors } from "lucide-react";

interface TroquelVisualizerProps {
  reqAncho: number | null;
  reqLargo: number | null;
  actAncho: number;
  actLargo: number;
  formato: string;
  isRotated?: boolean;
}

export const TroquelVisualizer: React.FC<TroquelVisualizerProps> = ({
  reqAncho,
  reqLargo,
  actAncho,
  actLargo,
  formato,
  isRotated = false,
}) => {
  // Normalize dimensions to fit inside a 200x200 SVG box
  const maxDim = Math.max(
    reqAncho || 0,
    reqLargo || 0,
    actAncho,
    actLargo,
    10 // Fallback minimum
  );

  const scale = 140 / maxDim; // Max dimension will be 140px inside 200px viewport

  // Center is (100, 100)
  const center = 100;

  // Actual dimensions scaled
  const actualW = actAncho * scale;
  const actualH = actLargo * scale;

  // Required dimensions scaled
  const requestedW = (reqAncho || actAncho) * scale;
  const requestedH = (reqLargo || actLargo) * scale;

  const isCircular =
    formato.toUpperCase().includes("CIRCULAR") || 
    formato.toUpperCase().includes("CIRC");

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-neutral-900/60 rounded-xl border border-white/5 shadow-inner">
      <div className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
        <Scissors className="w-4 h-4 text-orange-500" />
        Esquema de Corte Proporcional
      </div>

      <div className="relative w-56 h-56 bg-neutral-950 rounded-lg flex items-center justify-center border border-white/5 overflow-hidden">
        {/* SVG Drawing Canvas */}
        <svg className="w-full h-full" viewBox="0 0 200 200">
          {/* Grid lines for depth */}
          <line x1="10" y1="100" x2="190" y2="100" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="100" y1="10" x2="100" y2="190" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="2 2" />

          {/* 1. Required size (reference) - Drawn in dotted gray */}
          {reqAncho && reqLargo && (
            <>
              {isCircular ? (
                <circle
                  cx={center}
                  cy={center}
                  r={requestedW / 2}
                  fill="none"
                  stroke="#525252"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ) : (
                <rect
                  x={center - requestedW / 2}
                  y={center - requestedH / 2}
                  width={requestedW}
                  height={requestedH}
                  rx={4}
                  fill="none"
                  stroke="#525252"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}
            </>
          )}

          {/* 2. Actual Die Shape - Drawn in glowing orange */}
          {isCircular ? (
            <circle
              cx={center}
              cy={center}
              r={actualW / 2}
              fill="rgba(249, 115, 22, 0.08)"
              stroke="#f97316"
              strokeWidth="2.5"
              className={isRotated ? "animate-pulse" : ""}
            />
          ) : (
            <rect
              x={center - actualW / 2}
              y={center - actualH / 2}
              width={actualW}
              height={actualH}
              rx={6}
              fill="rgba(249, 115, 22, 0.08)"
              stroke="#f97316"
              strokeWidth="2.5"
              className={isRotated ? "animate-pulse" : ""}
            />
          )}

          {/* Width Arrow Indicators */}
          <g transform={`translate(0, ${center + actualH / 2 + 15})`}>
            <line
              x1={center - actualW / 2}
              y1="0"
              x2={center + actualW / 2}
              y2="0"
              stroke="#ea580c"
              strokeWidth="1"
            />
            <circle cx={center - actualW / 2} cy="0" r="2" fill="#ea580c" />
            <circle cx={center + actualW / 2} cy="0" r="2" fill="#ea580c" />
          </g>

          {/* Height/Length Arrow Indicators */}
          <g transform={`translate(${center + actualW / 2 + 15}, 0)`}>
            <line
              x1="0"
              y1={center - actualH / 2}
              x2="0"
              y2={center + actualH / 2}
              stroke="#ea580c"
              strokeWidth="1"
            />
            <circle cx="0" cy={center - actualH / 2} r="2" fill="#ea580c" />
            <circle cx="0" cy={center + actualH / 2} r="2" fill="#ea580c" />
          </g>
        </svg>

        {/* Floating badge for rotated suggestion */}
        {isRotated && (
          <div className="absolute top-2 right-2 bg-orange-950/90 border border-orange-500/30 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider text-orange-400 font-bold flex items-center gap-1 shadow-md">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            Rotado
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-orange-500 bg-orange-500/20"></span>
          <span>Troquel ({actAncho} × {actLargo} mm)</span>
        </div>
        {reqAncho && reqLargo && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-gray-500 bg-transparent"></span>
            <span>Requerido ({reqAncho} × {reqLargo} mm)</span>
          </div>
        )}
      </div>

      {reqAncho && reqLargo && (
        <div className="mt-2 text-[11px] text-gray-500 text-center max-w-xs leading-relaxed">
          {isRotated ? (
            <span className="text-orange-400/90 flex items-center justify-center gap-1 font-medium">
              <MoveRight className="w-3.5 h-3.5" /> El troquel encaja rotando el material 90°
            </span>
          ) : (
            <span>
              Diferencia de medida:{" "}
              <strong className="text-gray-300">
                {Math.abs(actAncho - reqAncho).toFixed(1)} mm
              </strong>{" "}
              en ancho,{" "}
              <strong className="text-gray-300">
                {Math.abs(actLargo - reqLargo).toFixed(1)} mm
              </strong>{" "}
              en largo
            </span>
          )}
        </div>
      )}
    </div>
  );
};
