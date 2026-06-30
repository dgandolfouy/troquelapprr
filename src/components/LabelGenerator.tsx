/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Printer,
  Trash2,
  Plus,
  Edit,
  Grid,
  Sparkles,
  Layers,
  Undo2,
  Check,
} from "lucide-react";
import { Troquel } from "../types";

export interface PliegoItem {
  id: string; // Dynamic identifier for multiple duplicates of the same die
  codigo: string;
  formato: string;
  ancho: number;
  largo: number;
  carreras: string | number;
  engranaje: string | number;
  tipoTroquel: "DIGITAL" | "ETIRAMA" | "FLEXO" | "FINISHER";
  formaLogo: "R" | "C" | "F" | "PAI" | "CR" | "P";
  material: string; // BOPP, COUCHÉ, PAI, etc. (retained in data level)
  cliente: string;  // client metadata
  customText?: string;
}

interface LabelGeneratorProps {
  baseDatos: Troquel[];
  customNotes: Record<string, string>;
  onBackToSearch?: () => void;
}

export const LabelGenerator: React.FC<LabelGeneratorProps> = ({
  baseDatos,
  customNotes,
  onBackToSearch,
}) => {
  const [queuedItems, setQueuedItems] = useState<PliegoItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(150);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Reset limit on search criteria updates
  useEffect(() => {
    setVisibleLimit(150);
  }, [filterSearch]);

  // Load list from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pliego_labels_queue");
      if (stored) {
        setQueuedItems(JSON.parse(stored));
      } else {
        // Seed with nice defaults to guide the user the first time
        const defaults: PliegoItem[] = [
          {
            id: "default-1",
            codigo: "M0001_320",
            formato: "RECTANGULAR",
            ancho: 80,
            largo: 112,
            carreras: "2C",
            engranaje: "112",
            tipoTroquel: "FLEXO",
            formaLogo: "R",
            material: "BOPP",
            cliente: "BPU",
          },
          {
            id: "default-2",
            codigo: "D0016_320",
            formato: "RECTANGULAR",
            ancho: 100,
            largo: 149,
            carreras: "2C",
            engranaje: "",
            tipoTroquel: "DIGITAL",
            formaLogo: "R",
            material: "COUCHÉ",
            cliente: "RR",
          },
          {
            id: "default-3",
            codigo: "E0001_320",
            formato: "RECTANGULAR",
            ancho: 84,
            largo: 130,
            carreras: "2C",
            engranaje: "88",
            tipoTroquel: "ETIRAMA",
            formaLogo: "F",
            material: "BOPP+L",
            cliente: "MINERVA",
          },
        ];
        setQueuedItems(defaults);
        localStorage.setItem("pliego_labels_queue", JSON.stringify(defaults));
      }
    } catch (e) {
      console.error("Error reading pliego_labels_queue", e);
    }
  }, []);

  // Save to local storage on changes (using functional parameter to completely solve state synchronization)
  const saveQueue = (newQueue: PliegoItem[] | ((prev: PliegoItem[]) => PliegoItem[])) => {
    if (typeof newQueue === "function") {
      setQueuedItems((prev) => {
        const next = newQueue(prev);
        localStorage.setItem("pliego_labels_queue", JSON.stringify(next));
        return next;
      });
    } else {
      setQueuedItems(newQueue);
      localStorage.setItem("pliego_labels_queue", JSON.stringify(newQueue));
    }
  };

  // Helper to trigger temporary actions notifications
  const triggerNotification = (text: string) => {
    setShowNotification(text);
    setTimeout(() => {
      setShowNotification(null);
    }, 2500);
  };

  // Auto-detect type based on raw data
  const autoDetectTypeAndShape = (troquel: Troquel): {
    tipoTroquel: "DIGITAL" | "FLEXO" | "ETIRAMA" | "FINISHER";
    formaLogo: "R" | "C" | "F" | "PAI" | "CR" | "P";
    material: string;
    cliente: string;
  } => {
    const code = String(troquel.Codigo).toUpperCase();
    const format = String(troquel.Formato || "").toUpperCase();
    const note = (customNotes[String(troquel.Codigo)] || "").toUpperCase();

    // 1. Tipo Troquel
    let tipoTroquel: "DIGITAL" | "FLEXO" | "ETIRAMA" | "FINISHER" = "FLEXO";
    if (code.startsWith("D") || format.includes("DIGITAL")) {
      tipoTroquel = "DIGITAL";
    } else if (code.startsWith("E") || format.includes("ETIRAMA")) {
      tipoTroquel = "ETIRAMA";
    } else if (code.startsWith("FI") || code.startsWith("F") || note.includes("FINISHER") || format.includes("FINISHER")) {
      tipoTroquel = "FINISHER";
    }

    // 2. Shape Logo / badge
    let formaLogo: "R" | "C" | "F" | "PAI" | "CR" | "P" = "R"; // default Rectangle
    if (format.includes("CIRCULAR") || format.includes("REDONDO") || format.includes("CIRC")) {
      formaLogo = "C";
    } else if (format.includes("FLECHA") || format.includes("OPP") || format.includes("DISEÑO") || format.includes("ESPECIAL") || format.includes("FIGURA") || format.includes("FIG")) {
      formaLogo = "F";
    } else if (format.includes("TAG") || format.includes("PAI")) {
      formaLogo = "PAI";
    } else if (format.includes("PREPICADO") || format.includes("PREP")) {
      formaLogo = "P";
    } else if (format.includes("CORTE") || format.includes("RECTO")) {
      formaLogo = "CR";
    }

    // 3. Fallback metadata
    let material = tipoTroquel === "DIGITAL" ? "COUCHÉ" : "BOPP";
    let cliente = "RR";

    if (note) {
      if (note.includes("COUCHÉ") || note.includes("COUCHE")) {
        material = "COUCHÉ";
      } else if (note.includes("BOPP")) {
        material = "BOPP";
      } else if (note.includes("PAI")) {
        material = "PAI";
      }

      const parts = note.split(/[-–,]/).map((s) => s.trim());
      if (parts.length > 0) {
        const filteredParts = parts.filter(
          (p) =>
            !p.includes("COUCHÉ") &&
            !p.includes("COUCHE") &&
            !p.includes("BOPP") &&
            !p.includes("CORTES") &&
            !p.includes("SEGURIDAD") &&
            !p.includes("ROTADO")
        );
        if (filteredParts.length > 0) {
          cliente = filteredParts[0];
        }
      }
    }

    return { tipoTroquel, formaLogo, material, cliente };
  };

  // Add individual item safely using functional state update
  const handleAddItemFromDB = (troquel: Troquel) => {
    const { tipoTroquel, formaLogo, material, cliente } = autoDetectTypeAndShape(troquel);
    const newItem: PliegoItem = {
      id: "label-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      codigo: String(troquel.Codigo),
      formato: String(troquel.Formato || "RECTANGULAR").toUpperCase(),
      ancho: parseFloat(String(troquel.Ancho)) || 0,
      largo: parseFloat(String(troquel.Largo)) || 0,
      carreras: troquel.Carreras ? `${troquel.Carreras}C` : "2C",
      engranaje: troquel.Engranaje || "",
      tipoTroquel,
      formaLogo,
      material,
      cliente,
    };

    saveQueue((prev) => [...prev, newItem]);
    triggerNotification(`¡Se añadió ${troquel.Codigo} al pliego!`);
  };

  // Add multiple items in bulk to completely eliminate the race condition
  const handleAddMultipleItemsFromDB = (troqueles: Troquel[]) => {
    const newItems = troqueles.map((t, idx) => {
      const { tipoTroquel, formaLogo, material, cliente } = autoDetectTypeAndShape(t);
      return {
        id: "label-" + Date.now() + "-" + idx + "-" + Math.random().toString(36).substr(2, 4),
        codigo: String(t.Codigo),
        formato: String(t.Formato || "RECTANGULAR").toUpperCase(),
        ancho: parseFloat(String(t.Ancho)) || 0,
        largo: parseFloat(String(t.Largo)) || 0,
        carreras: t.Carreras ? `${t.Carreras}C` : "2C",
        engranaje: t.Engranaje || "",
        tipoTroquel,
        formaLogo,
        material,
        cliente,
      };
    });

    saveQueue((prev) => [...prev, ...newItems]);
    triggerNotification(`¡Se añadieron ${troqueles.length} troqueles al pliego!`);
  };

  // Add fully customized label
  const handleAddCustomLabel = () => {
    const newItem: PliegoItem = {
      id: "label-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      codigo: "NUEVO_320",
      formato: "RECTANGULAR",
      ancho: 80,
      largo: 80,
      carreras: "2C",
      engranaje: "112",
      tipoTroquel: "FLEXO",
      formaLogo: "R",
      material: "BOPP",
      cliente: "NUEVO",
    };
    saveQueue((prev) => [...prev, newItem]);
    setEditingItemId(newItem.id);
  };

  // Remove individual item
  const handleRemoveItem = (id: string) => {
    saveQueue((prev) => prev.filter((it) => it.id !== id));
    if (editingItemId === id) setEditingItemId(null);
  };

  // Clear all items representation
  const handleClearAll = () => {
    if (window.confirm("¿Seguro que deseas limpiar todas las etiquetas del pliego?")) {
      saveQueue([]);
      setEditingItemId(null);
    }
  };

  // Duplicate label
  const handleDuplicateItem = (item: PliegoItem) => {
    const duplicated: PliegoItem = {
      ...item,
      id: "label-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    };
    saveQueue((prev) => [...prev, duplicated]);
    triggerNotification(`Se duplicó etiqueta ${item.codigo}`);
  };

  // Update label fields
  const handleUpdateItemField = (id: string, field: keyof PliegoItem, value: any) => {
    saveQueue((prev) => prev.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Filtered DB items to showcase for quick-add list
  const addableTroqueles = useMemo(() => {
    const term = filterSearch.trim().toLowerCase();
    if (!term) return baseDatos;
    return baseDatos
      .filter((t) => {
        const notesText = (customNotes[String(t.Codigo)] || "").toLowerCase();
        return (
          String(t.Codigo).toLowerCase().includes(term) ||
          String(t.Formato).toLowerCase().includes(term) ||
          String(t.Ancho).toLowerCase().includes(term) ||
          String(t.Largo).toLowerCase().includes(term) ||
          notesText.includes(term)
        );
      });
  }, [baseDatos, filterSearch, customNotes]);

  // Sliced list for memory-friendly instant rendering
  const displayedTroqueles = useMemo(() => {
    return addableTroqueles.slice(0, visibleLimit);
  }, [addableTroqueles, visibleLimit]);

  // Total printing sheets (exactly 4 labels of 80mm maximum per sheet)
  const printPages = useMemo(() => {
    const chunks: PliegoItem[][] = [];
    for (let i = 0; i < queuedItems.length; i += 4) {
      chunks.push(queuedItems.slice(i, i + 4));
    }
    return chunks;
  }, [queuedItems]);

  const handleTriggerPrint = () => {
    window.print();
  };

  // Render format pill matching the app style and icons perfectly
  const renderFormatBadgeGroup = (label: PliegoItem, formatStr: string) => {
    const fmt = formatStr.toUpperCase();
    const isCirc = fmt.includes("CIRCULAR") || fmt.includes("REDONDO") || fmt.includes("CIRC");
    const isFig = fmt.includes("FIGURA") || fmt.includes("FIG") || fmt.includes("ESPECIAL") || label.formaLogo === "F";
    const isTag = fmt.includes("TAG") || fmt.includes("PAI") || label.formaLogo === "PAI";
    const isPrep = fmt.includes("PREPICADO") || fmt.includes("PREP") || label.formaLogo === "P";
    const isRecto = fmt.includes("RECTO") || fmt.includes("CORTE RECTO") || label.formaLogo === "CR";

    // Mapped Styles - Clean icons only, NO frame/text:
    // Circular: green circle
    // Rectangular: sky blue square
    // Figura: amber star
    // Tag: fuchsia tag
    // Prepicado: rose scissors
    // Corte Recto: slate line
    if (isCirc) {
      return (
        <g>
          {/* Circular green icon */}
          <circle cx="0" cy="0" r="28" fill="#10b981" />
        </g>
      );
    } else if (isFig) {
      return (
        <g>
          {/* Yellow golden star centered */}
          <polygon points="0,-32 10,-10 32,-10 14,4 21,26 0,13 -21,26 -14,4 -32,-10 -10,-10" fill="#f59e0b" />
        </g>
      );
    } else if (isTag) {
      return (
        <g transform="scale(2.6)">
          <g transform="translate(-11.5, -11.5)">
            <path
              d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.59-7.59a1 1 0 0 0 0-1.41L12 2z"
              fill="#d946ef"
            />
            <circle cx="5.5" cy="5.5" r="1.5" fill="#ffffff" />
          </g>
        </g>
      );
    } else if (isPrep) {
      return (
        <g transform="scale(2.2) translate(-2, -2)" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Scissors icon centered */}
          <circle cx="-4" cy="4" r="3" />
          <circle cx="4" cy="4" r="3" />
          <path d="M -3,2.5 L 6,-8" />
          <path d="M 3,2.5 L -6,-8" />
        </g>
      );
    } else if (isRecto) {
      return (
        <g>
          {/* Line sign */}
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#64748b" strokeWidth="8.5" strokeLinecap="round" />
        </g>
      );
    } else {
      // Default Rectangular/Square (sky blue/celeste square centered)
      return (
        <g>
          {/* Sky blue square */}
          <rect x="-28" y="-28" width="56" height="56" rx="10" fill="#38bdf8" />
        </g>
      );
    }
  };

  return (
    <>
      <div className="space-y-6 screen-only-section">
      {/* SCREEN CONTEXT HEADER */}
      <div className="bg-neutral-900/60 p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-black text-white tracking-wide uppercase">
              PLIEGOS DE IMPRESIÓN PARA BUJES
            </h2>
          </div>
          <p className="text-xs text-gray-400">
            Diseña pliegos con exactamente <span className="text-orange-400 font-bold">4 etiquetas redondas por página</span>. Formato físico fidedigno de 169.32 x 220 mm con taco de registro de sensor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          {onBackToSearch && (
            <button
              onClick={onBackToSearch}
              className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Volver al Buscador
            </button>
          )}

          <button
            disabled={queuedItems.length === 0}
            onClick={handleTriggerPrint}
            className="flex-1 md:flex-none px-5 py-2.5 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-orange-950/20 flex justify-center items-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            IMPRIMIR PLIEGOS
          </button>
        </div>
      </div>

      {/* COMPONENT CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CONTROLS & QUEUE STATUS (5 Columns) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          {/* SEARCH & QUICK ADD FROM PLANILLA DATABASE */}
          <div className="bg-neutral-900/40 p-4 rounded-2xl border border-white/5 shadow-xl space-y-3.5">
            <div>
              <h3 className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-1">
                <Plus className="w-4 h-4 text-orange-500" />
                Añadir Troqueles al Pliego
              </h3>
              <p className="text-[10px] text-gray-400">Busca en tu base de datos para agregarlos rápidamente</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Busca Código o Medidas (Ej: M0001, 80x112)..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="bg-neutral-950 border border-white/5 focus:border-orange-500/30 text-xs text-white placeholder-gray-600 p-2.5 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-orange-500/20"
              />

              {addableTroqueles.length > 0 && (
                <button
                  onClick={() => handleAddMultipleItemsFromDB(addableTroqueles)}
                  className="w-full py-2 bg-orange-600/30 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-xl text-center text-[10px] font-black text-orange-400 hover:text-orange-300 transition-colors cursor-pointer select-none"
                >
                  ➕ AÑADIR TODOS LOS ENCONTRADOS ({addableTroqueles.length})
                </button>
              )}

              {/* Collapsible search drawer listing */}
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto bg-neutral-950/30 rounded-xl border border-white/5 p-1">
                {displayedTroqueles.length === 0 ? (
                  <p className="p-3 text-xs text-center text-gray-500 italic">Sin resultados coincidentes</p>
                ) : (
                  <>
                    {displayedTroqueles.map((t) => (
                      <div
                        key={t.Codigo}
                        onClick={() => handleAddItemFromDB(t)}
                        className="p-2 hover:bg-white/5 flex justify-between items-center text-xs cursor-pointer rounded-lg transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-white tracking-wider font-mono">{t.Codigo}</span>
                            <span className="text-[9px] px-1 bg-neutral-800 text-gray-400 rounded uppercase font-bold">
                              {t.Formato}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-orange-400/80 mt-0.5">
                            {t.Ancho} x {t.Largo} mm ({t.Carreras || "0"}C)
                          </p>
                        </div>
                        <span className="text-[10px] text-orange-500 group-hover:text-orange-400 font-bold flex items-center gap-1">
                          Añadir <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ))}

                    {addableTroqueles.length > visibleLimit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisibleLimit((prev) => prev + 200);
                        }}
                        className="w-full py-2.5 mt-1 bg-neutral-900 hover:bg-neutral-850 border border-white/10 text-[10px] font-black text-orange-400 hover:text-orange-300 rounded-lg cursor-pointer transition-colors text-center select-none"
                      >
                        ➕ MOSTRAR MÁS TROQUELES ({visibleLimit} de {addableTroqueles.length} vistos)
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Fully offline manual constructor */}
              <button
                onClick={handleAddCustomLabel}
                className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 border border-white/5 rounded-xl text-center text-xs font-bold text-gray-300 hover:text-white transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Crear Etiqueta Manual / Libre
              </button>
            </div>
          </div>

          {/* QUEUED LABELS LIST WITH DIRECT FIELD IN-PLACE EDITING */}
          <div className="bg-neutral-900/40 p-4 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-1.5 select-none">
                  <Grid className="w-4 h-4 text-orange-500" />
                  Lista de Imprenta ({queuedItems.length})
                </h3>
                <p className="text-[10px] text-gray-400">Modifica, clona o reordena para conformar las plantillas</p>
              </div>

              {queuedItems.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 text-xs flex items-center gap-1 font-bold cursor-pointer transition-colors"
                  title="Vaciar Lista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              )}
            </div>

            {queuedItems.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-white/5 rounded-2xl text-gray-500 space-y-2 select-none">
                <Printer className="w-9 h-9 mx-auto text-orange-500/20" />
                <p className="text-xs max-w-xs mx-auto text-gray-300">El pliego de impresión está vacío.</p>
                <p className="text-[10px] text-gray-500 max-w-[220px] mx-auto">
                  Agrega troqueles usando la herramienta superior para ver las plantillas de 4 bocas físicamente dimensionadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {queuedItems.map((item, idx) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isEditing
                          ? "bg-neutral-900 border-orange-500/40 shadow-inner"
                          : "bg-neutral-950/70 border-white/5 hover:border-orange-500/15"
                      }`}
                    >
                      {/* Flex item preview header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-orange-500 font-mono select-none">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-extrabold text-white tracking-widest font-mono">
                              {item.codigo}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                item.tipoTroquel === "DIGITAL"
                                  ? "bg-purple-950/40 text-purple-400 border border-purple-500/25"
                                  : item.tipoTroquel === "ETIRAMA"
                                  ? "bg-orange-950/40 text-orange-400 border border-orange-500/25"
                                  : item.tipoTroquel === "FINISHER"
                                  ? "bg-lime-950/40 text-lime-400 border border-lime-500/25"
                                  : "bg-amber-950/40 text-amber-450 border border-amber-500/25"
                              }`}
                            >
                              {item.tipoTroquel}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium font-mono mt-0.5">
                            {item.ancho}x{item.largo} mm ({item.carreras}) {item.engranaje ? `• z${item.engranaje}` : ""}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingItemId(isEditing ? null : item.id)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isEditing
                                ? "bg-orange-500 border-orange-600 text-white"
                                : "bg-neutral-900 border-white/10 text-gray-450 hover:text-white"
                            }`}
                            title="Editar Atributos de Impresión"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateItem(item)}
                            className="p-1.5 text-xs rounded-lg border bg-neutral-900 border-white/10 text-gray-450 hover:text-white hover:bg-neutral-800 cursor-pointer font-bold"
                            title="Clonar / Copiar"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg border bg-neutral-900 border-white/10 text-gray-500 hover:text-red-400 hover:bg-red-950/10 cursor-pointer transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* EDIT PANEL ACCORDION BODY */}
                      {isEditing && (
                        <div className="pt-3.5 mt-3 border-t border-white/5 space-y-3 text-xs">
                          {/* Code, Ancho, Largo row */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Código
                              </label>
                              <input
                                type="text"
                                value={item.codigo}
                                onChange={(e) => handleUpdateItemField(item.id, "codigo", e.target.value)}
                                className="bg-neutral-950 border border-white/10 text-white p-1.5 rounded font-mono font-bold w-full focus:outline-none tracking-widest text-[11px] uppercase"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Ancho mm
                              </label>
                              <input
                                type="number"
                                value={item.ancho}
                                onChange={(e) => handleUpdateItemField(item.id, "ancho", parseFloat(e.target.value) || 0)}
                                className="bg-neutral-950 border border-white/10 text-white p-1.5 rounded font-mono w-full text-center focus:outline-none text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Largo mm
                              </label>
                              <input
                                type="number"
                                value={item.largo}
                                onChange={(e) => handleUpdateItemField(item.id, "largo", parseFloat(e.target.value) || 0)}
                                className="bg-neutral-950 border border-white/10 text-white p-1.5 rounded font-mono w-full text-center focus:outline-none text-[11px]"
                              />
                            </div>
                          </div>

                          {/* Dynamic Preset Types and Badges row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Tipo / Estilo Pliego
                              </label>
                              <select
                                value={item.tipoTroquel}
                                onChange={(e) => handleUpdateItemField(item.id, "tipoTroquel", e.target.value)}
                                className="bg-neutral-950 border border-white/10 text-gray-300 p-1.5 rounded w-full focus:outline-none text-[11px] cursor-pointer"
                              >
                                <option value="FLEXO">FLEXO (Amarillo)</option>
                                <option value="ETIRAMA">ETIRAMA (Naranja)</option>
                                <option value="FINISHER">FINISHER (Verde Lima)</option>
                                <option value="DIGITAL">DIGITAL (Degradado Vivo)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Distintivo Forma
                              </label>
                              <select
                                value={item.formaLogo}
                                onChange={(e) => handleUpdateItemField(item.id, "formaLogo", e.target.value)}
                                className="bg-neutral-950 border border-white/10 text-gray-300 p-1.5 rounded w-full focus:outline-none text-[11px] cursor-pointer"
                              >
                                <option value="R">R (Rectangular)</option>
                                <option value="C">C (Circular)</option>
                                <option value="F">F (Estrella - Figura Especial)</option>
                                <option value="PAI">PAI (Badge PAI)</option>
                                <option value="P">P (Badge P)</option>
                                <option value="CR">CR (Badge CR)</option>
                              </select>
                            </div>
                          </div>

                          {/* Carreras and Gear (Engranaje) Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Carreras
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: 2C, 3C"
                                value={item.carreras}
                                onChange={(e) => handleUpdateItemField(item.id, "carreras", e.target.value)}
                                className="bg-neutral-950 border border-white/10 text-white p-1.5 rounded font-mono w-full uppercase focus:outline-none font-bold text-center text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-gray-400 font-bold select-none mb-1">
                                Engranaje (Z)
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: 80, 96, 112"
                                value={item.engranaje}
                                onChange={(e) => handleUpdateItemField(item.id, "engranaje", e.target.value)}
                                className="bg-neutral-950 border border-white/10 text-white p-1.5 rounded font-mono w-full focus:outline-none font-black text-amber-400 text-center text-[11px]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-750 border border-white/5 text-[10px] font-bold rounded-lg text-white text-center cursor-pointer"
                            >
                              Listo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW OF THE PRINT PLIEGOS (7 Columns) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <div className="bg-neutral-900/60 p-5 rounded-2xl border border-white/5 shadow-xl space-y-3.5 select-none">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-orange-500" />
                  Previsualización de Pliego ({printPages.length} {printPages.length === 1 ? "Página" : "Páginas"})
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">Muestra la maquetación fidedigna de las plantillas físicas de 4 bocas con sangrado de 3mm (169.32 x 220 mm)</p>
              </div>

              <div className="text-xs text-orange-450 font-mono font-bold uppercase select-none">
                Papel: 169.32 x 220 mm • 80mm
              </div>
            </div>

            {queuedItems.length > 0 && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/20 rounded-xl leading-relaxed text-[11px] text-amber-200">
                <p className="font-extrabold text-amber-400 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                  ⚠️ NOTA PARA IMPRIMIR / GUARDAR EN PDF:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-gray-300">
                  <li>
                    Si estás viendo esta aplicación dentro de la vista previa de AI Studio, el navegador bloquea la impresión (acción del iframe).
                  </li>
                  <li>
                    Para solucionarlo, haz clic en el botón de <strong>"Abrir en pestaña nueva"</strong> ↗️ en la esquina superior derecha del panel de AI Studio.
                  </li>
                  <li>
                    En la nueva pestaña, haz clic en <strong>"IMPRIMIR PLIEGOS"</strong> o pulsa <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-[10px] text-white">Ctrl + P</kbd> o <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-[10px] text-white">Cmd + P</kbd> para generar tu PDF.
                  </li>
                  <li>
                    En los ajustes de impresión del navegador, asegúrate de elegir <strong>Márgenes: Ninguno (None)</strong> y activar <strong>Gráficos de fondo (Background graphics)</strong> para conservar el diseño exacto.
                  </li>
                </ul>
              </div>
            )}

            {queuedItems.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-2xl flex flex-col justify-center items-center text-gray-550">
                <Printer className="w-12 h-12 text-orange-500/10 mb-4 animate-pulse" />
                <p className="text-sm font-bold text-gray-400">Sin pliegos generados</p>
                <p className="text-xs text-gray-500 max-w-xs mt-1.5 leading-relaxed">
                  Agrega troqueles del panel izquierdo o de la solapa Explorar. Se maquetarán de forma exacta 4 bocas por pliego según las coordenadas físicas de Illustrator.
                </p>
              </div>
            ) : (
              /* Live screen layout of the multiple pages */
              <div className="space-y-8 max-h-[750px] overflow-y-auto pr-2 bg-neutral-950 p-6 rounded-2xl border border-white/5">
                {printPages.map((page, pageIdx) => (
                  <div key={pageIdx} className="space-y-2 select-none">
                    {/* Page tag header */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase px-1">
                      <span>Página de Pliego #{pageIdx + 1}</span>
                      <span>{page.length} de 4 bocas estructuradas</span>
                    </div>

                    {/* VIRTUAL PLATFORM SHEET PREVIEW WITH 4 LABELS AND SENSING MARK */}
                    <div className="w-full overflow-x-auto flex justify-center py-4 rounded-xl bg-neutral-900 border border-white/5">
                      <div
                        id={`screen-page-print-${pageIdx}`}
                        className="relative bg-white text-black shadow-2xl shrink-0 select-none print-sheet animate-fade-in"
                        style={{
                          width: "169.32mm",
                          height: "220mm",
                          minWidth: "169.32mm",
                          minHeight: "220mm",
                          position: "relative",
                          backgroundColor: "#ffffff",
                          boxSizing: "border-box",
                        }}
                      >
                        {/* SENSING BLACK MARK (EL "TACO" REGISTRO) - PIXEL PERFECT TO ILLUSTRATOR COORDINATES
                            Illustrator: Center X=164.49mm, Center Y=6.633mm, Ancho=5mm, Alto=11.64mm.
                            Left: 164.49mm - 2.5mm = 161.99mm. Top: 6.633mm - (11.64mm/2) = 0.813mm.
                        */}
                        <div 
                          className="absolute bg-black"
                          style={{
                            left: "161.99mm",
                            top: "0.813mm",
                            width: "5mm",
                            height: "11.64mm",
                          }}
                        />

                        {/* Rendering 4 slots mathematically positioned onto the 188.13 x 220 mm canvas
                            Illustrator Centers:
                            - Slot 1 (Top-Left):  CenterX = 47.588mm,  CenterY = 62.567mm.
                            - Slot 2 (Top-Right): CenterX = 140.8mm,   CenterY = 62.567mm.
                            - Slot 3 (Bot-Left):  CenterX = 47.588mm,  CenterY = 157.572mm.
                            - Slot 4 (Bot-Right): CenterX = 140.8mm,   CenterY = 157.572mm.
                            
                            In order to have 3mm bleed on all sides, the printable boundary goes from radius 40mm to 43mm.
                            So the printable box is 86mm x 86mm, centered around those exact centers:
                            Left = CenterX - 43mm, Top = CenterY - 43mm.
                        */}
                        {Array.from({ length: 4 }).map((_, slotIdx) => {
                          const label = page[slotIdx];
                          const cleanCarreras = label ? String(label.carreras || "").replace(/c/gi, "").trim() : "";
                          
                          // Convert formats cleanly to human words
                          const fmtStr = label ? String(label.formato || "").toUpperCase() : "";
                          const isCirc = fmtStr.includes("CIRCULAR") || fmtStr.includes("REDONDO") || fmtStr.includes("CIRC") || (label && label.formaLogo === "C");
                          const isFig = fmtStr.includes("FIGURA") || fmtStr.includes("FIG") || fmtStr.includes("ESPECIAL") || (label && label.formaLogo === "F");
                          const isTag = fmtStr.includes("TAG") || fmtStr.includes("PAI") || (label && label.formaLogo === "PAI");
                          const isPrep = fmtStr.includes("PREPICADO") || fmtStr.includes("PREP") || (label && label.formaLogo === "P");
                          const isRecto = fmtStr.includes("RECTO") || fmtStr.includes("CORTE RECTO") || (label && label.formaLogo === "CR");
                          const typeName = isCirc ? "CIRCULAR" : isFig ? "FIGURA" : isTag ? "TAG PAI" : isPrep ? "PREPICADO" : isRecto ? "CORTE RECTO" : "RECTANGULAR";
                          
                          const positions = [
                            { left: `${42.33 - 43}mm`, top: `${68.5 - 43}mm` },  // Slot 1: Center X=42.33mm, Y=68.5mm
                            { left: `${126.99 - 43}mm`,  top: `${68.5 - 43}mm` },  // Slot 2: Center X=126.99mm, Y=68.5mm
                            { left: `${42.33 - 43}mm`, top: `${151.5 - 43}mm` }, // Slot 3: Center X=42.33mm, Y=151.5mm
                            { left: `${126.99 - 43}mm`,  top: `${151.5 - 43}mm` }  // Slot 4: Center X=126.99mm, Y=151.5mm
                          ];
                          const pos = positions[slotIdx];

                          return (
                            <div
                              key={label ? label.id : `empty-${slotIdx}`}
                              className="absolute flex items-center justify-center p-0 m-0"
                              style={{
                                left: pos.left,
                                top: pos.top,
                                width: "86mm",
                                height: "86mm",
                                boxSizing: "border-box"
                              }}
                            >
                              {label ? (
                                <svg
                                  width="86mm"
                                  height="86mm"
                                  viewBox="0 0 860 860"
                                  className="w-full h-full select-none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <defs>
                                    {/* Self-contained SVG styling to enforce consistent Bebas Neue rendering */}
                                    <style>
                                      {`
                                        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@500;700;900&display=swap');
                                        .svg-bebas-font {
                                          font-family: 'Bebas Neue', 'Oswald', sans-serif !important;
                                        }
                                      `}
                                    </style>

                                    {/* Text curve path - elevated inwards (smaller radius) for more breathing room */}
                                    <path
                                      id={`topTextCurvePath-${label.id}-${pageIdx}-${slotIdx}`}
                                      d="M 170 430 A 260 260 0 0 1 690 430"
                                      fill="none"
                                    />

                                    {/* Super vivid multicolored digital gradient */}
                                    <linearGradient
                                      id={`vividDigitalGradient-${label.id}-${pageIdx}-${slotIdx}`}
                                      x1="0%"
                                      y1="0%"
                                      x2="100%"
                                      y2="100%"
                                    >
                                      <stop offset="0%" stopColor="#8b5cf6" />
                                      <stop offset="50%" stopColor="#ec4899" />
                                      <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                  </defs>

                                  {/* Bleed circle (86 mm diameter = 430 units radius) filled with solid background color */}
                                  <circle
                                    cx="430"
                                    cy="430"
                                    r="430"
                                    fill={
                                      label.tipoTroquel === "FLEXO"
                                        ? "#fbbf24" // Solid Amarillo
                                        : label.tipoTroquel === "ETIRAMA"
                                        ? "#f97316" // Solid Naranja
                                        : label.tipoTroquel === "FINISHER"
                                        ? "#16a34a" // Solid Verde (Emerald/Green)
                                        : `url(#vividDigitalGradient-${label.id}-${pageIdx}-${slotIdx})` // Vivid Gradient
                                    }
                                  />

                                  {/* Inner white circle (Leaves a colored outer rim from 34mm to 43mm = 9mm total,
                                      which after cutting at 40mm leaves a perfect, shift-resistant 6mm solid color border) */}
                                  <circle cx="430" cy="430" r="340" fill="#ffffff" />

                                  {/* Upper curve machine subtitle with high contrast bebop style */}
                                  <text
                                    className="svg-bebas-font"
                                    fontSize="50"
                                    fontWeight="bold"
                                    fill="#171717"
                                    letterSpacing="4.5px"
                                  >
                                    <textPath
                                      href={`#topTextCurvePath-${label.id}-${pageIdx}-${slotIdx}`}
                                      startOffset="50%"
                                      textAnchor="middle"
                                    >
                                      {`TROQUEL ${label.tipoTroquel}`}
                                    </textPath>
                                  </text>

                                  {/* Dynamic Format badge matching app design & color (R, C, F, PAI, CR, P) */}
                                  <g transform="translate(430, 240)">
                                    {renderFormatBadgeGroup(label, label.formato)}
                                  </g>

                                  {/* Format type name label below the badge */}
                                  <text
                                    x="430"
                                    y="305"
                                    className="svg-bebas-font"
                                    fontSize="32"
                                    fontWeight="bold"
                                    fill="#444444"
                                    textAnchor="middle"
                                    letterSpacing="1.5px"
                                  >
                                    {typeName}
                                  </text>

                                  {/* Bold high-design troquel code centered with perfect air */}
                                  <text
                                    x="430"
                                    y="445"
                                    className="svg-bebas-font"
                                    fontSize={label.codigo.length > 9 ? "135" : "162"}
                                    fontWeight="900"
                                    fill="#111111"
                                    textAnchor="middle"
                                    letterSpacing="-0.2px"
                                  >
                                    {label.codigo}
                                  </text>

                                  {/* Core dimension bubble capsule inside high contrast dark background */}
                                  <g transform="translate(430, 545)">
                                    <rect x="-240" y="-48" width="480" height="96" rx="48" fill="#111111" />
                                    <text
                                      x="0"
                                      y="18"
                                      className="svg-bebas-font"
                                      fontSize="62"
                                      fontWeight="bold"
                                      fill="#ffffff"
                                      textAnchor="middle"
                                      letterSpacing="1px"
                                    >
                                      {`${label.ancho} x ${label.largo} mm`}
                                    </text>
                                  </g>

                                  {/* Stacked Carreras & gear wheel (Z) details - directly on white background without box borders */}
                                  {label.tipoTroquel === "DIGITAL" ? (
                                    <g>
                                      <text
                                        x="430"
                                        y="685"
                                        className="svg-bebas-font"
                                        fontSize="48"
                                        fontWeight="bold"
                                        fill="#111111"
                                        textAnchor="middle"
                                        letterSpacing="1px"
                                      >
                                        Carreras: {cleanCarreras}
                                      </text>
                                    </g>
                                  ) : (
                                    <g>
                                      <text
                                        x="430"
                                        y="630"
                                        className="svg-bebas-font"
                                        fontSize="42"
                                        fontWeight="bold"
                                        fill="#444444"
                                        textAnchor="middle"
                                        letterSpacing="0.5px"
                                      >
                                        Carreras: {cleanCarreras}
                                      </text>
                                      {/* Big Z indicator centered */}
                                      <g transform="translate(430, 720)">
                                        <text
                                          x="0"
                                          y="10"
                                          className="svg-bebas-font"
                                          fontSize="96"
                                          fontWeight="950"
                                          fill="#111111"
                                          textAnchor="middle"
                                          letterSpacing="1px"
                                        >
                                          {label.engranaje ? `Z${label.engranaje}` : "Z--"}
                                        </text>
                                      </g>
                                    </g>
                                  )}
                                </svg>
                              ) : (
                                /* Empty slot showing the outline of the 80mm die line for registration reference */
                                <svg
                                  width="86mm"
                                  height="86mm"
                                  viewBox="0 0 860 860"
                                  className="w-full h-full select-none opacity-30"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  {/* Outer circular indicator with no dashed styles */}
                                  <circle cx="430" cy="430" r="400" fill="#fafafa" stroke="#dddddd" strokeWidth="2" />
                                  
                                  {/* Add cross icon */}
                                  <line x1="430" y1="360" x2="430" y2="440" stroke="#777777" strokeWidth="6" strokeLinecap="round" />
                                  <line x1="390" y1="400" x2="470" y2="400" stroke="#777777" strokeWidth="6" strokeLinecap="round" />

                                  <text
                                    x="430"
                                    y="500"
                                    style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
                                    fontSize="38"
                                    fontWeight="bold"
                                    fill="#777777"
                                    textAnchor="middle"
                                    letterSpacing="1px"
                                  >
                                    BOCA LIBRE (Ø 80 MM)
                                  </text>
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING RESTORE/NOTIFICATION CHIP */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141414] border border-orange-500/30 text-white font-extrabold text-xs py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-2 select-none animate-bounce">
          <Check className="w-4 h-4 text-orange-500" />
          <span>{showNotification}</span>
        </div>
      )}

      </div>

      {/* 100% ACCURATE PRINT-ONLY SECTION (Only visible during print, completely decoupled from React's live grid system) */}
      <div className="print-only-section">
        {printPages.map((page, pageIdx) => (
          <div
            key={pageIdx}
            className="print-sheet-pdf"
            style={{
              width: "169.32mm",
              height: "220mm",
              minWidth: "169.32mm",
              minHeight: "220mm",
              position: "relative",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            {/* SENSING BLACK TACO */}
            <div 
              style={{
                position: "absolute",
                backgroundColor: "#000000",
                left: "161.99mm",
                top: "0.813mm",
                width: "5mm",
                height: "11.64mm",
              }}
            />

            {/* Render 4 physical slots */}
            {Array.from({ length: 4 }).map((_, slotIdx) => {
              const label = page[slotIdx];
              const cleanCarreras = label ? String(label.carreras || "").replace(/c/gi, "").trim() : "";
              
              // Convert formats cleanly to human words
              const fmtStr = label ? String(label.formato || "").toUpperCase() : "";
              const isCirc = fmtStr.includes("CIRCULAR") || fmtStr.includes("REDONDO") || fmtStr.includes("CIRC") || (label && label.formaLogo === "C");
              const isFig = fmtStr.includes("FIGURA") || fmtStr.includes("FIG") || fmtStr.includes("ESPECIAL") || (label && label.formaLogo === "F");
              const isTag = fmtStr.includes("TAG") || fmtStr.includes("PAI") || (label && label.formaLogo === "PAI");
              const isPrep = fmtStr.includes("PREPICADO") || fmtStr.includes("PREP") || (label && label.formaLogo === "P");
              const isRecto = fmtStr.includes("RECTO") || fmtStr.includes("CORTE RECTO") || (label && label.formaLogo === "CR");
              const typeName = isCirc ? "CIRCULAR" : isFig ? "FIGURA" : isTag ? "TAG PAI" : isPrep ? "PREPICADO" : isRecto ? "CORTE RECTO" : "RECTANGULAR";
              
              const positions = [
                { left: `${42.33 - 43}mm`, top: `${68.5 - 43}mm` },
                { left: `${126.99 - 43}mm`,  top: `${68.5 - 43}mm` },
                { left: `${42.33 - 43}mm`, top: `${151.5 - 43}mm` },
                { left: `${126.99 - 43}mm`,  top: `${151.5 - 43}mm` }
              ];
              const pos = positions[slotIdx];

              return (
                <div
                  key={slotIdx}
                  style={{
                    position: "absolute",
                    left: pos.left,
                    top: pos.top,
                    width: "86mm",
                    height: "86mm",
                    boxSizing: "border-box"
                  }}
                >
                  {label ? (
                    <svg
                      width="86mm"
                      height="86mm"
                      viewBox="0 0 860 860"
                      style={{ width: "100%", height: "100%" }}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <style>
                          {`
                            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@500;700;900&display=swap');
                            .svg-bebas-font {
                              font-family: 'Bebas Neue', 'Oswald', sans-serif !important;
                            }
                          `}
                        </style>

                        {/* Text curve path */}
                        <path
                          id={`topTextCurvePath-print-${label.id}-${pageIdx}-${slotIdx}`}
                          d="M 170 430 A 260 260 0 0 1 690 430"
                          fill="none"
                        />

                        {/* Super vivid multicolored digital gradient for printing */}
                        <linearGradient
                          id={`vividDigitalGradient-print-${label.id}-${pageIdx}-${slotIdx}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="50%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>

                      {/* Bleed circle (86 mm diameter = 430 units radius) filled with solid background color */}
                      <circle
                        cx="430"
                        cy="430"
                        r="430"
                        fill={
                          label.tipoTroquel === "FLEXO"
                            ? "#fbbf24" // Solid Amarillo
                            : label.tipoTroquel === "ETIRAMA"
                            ? "#f97316" // Solid Naranja
                            : label.tipoTroquel === "FINISHER"
                            ? "#16a34a" // Solid Verde (Emerald/Green)
                            : `url(#vividDigitalGradient-print-${label.id}-${pageIdx}-${slotIdx})` // Vivid Gradient
                        }
                      />

                      {/* Inner physical boundaries (Exact 80mm radius = 400 units - removed stroke so it is not printed) */}
                      <circle cx="430" cy="430" r="340" fill="#ffffff" />

                      {/* Upper machine header curved text */}
                      <text
                        className="svg-bebas-font"
                        fontSize="50"
                        fontWeight="bold"
                        fill="#171717"
                        letterSpacing="4.5px"
                      >
                        <textPath
                          href={`#topTextCurvePath-print-${label.id}-${pageIdx}-${slotIdx}`}
                          startOffset="50%"
                          textAnchor="middle"
                        >
                          {`TROQUEL ${label.tipoTroquel}`}
                        </textPath>
                      </text>

                      {/* Dynamic Format badge */}
                      <g transform="translate(430, 240)">
                        {renderFormatBadgeGroup(label, label.formato)}
                      </g>

                      {/* Format type name label below the badge */}
                      <text
                        x="430"
                        y="305"
                        className="svg-bebas-font"
                        fontSize="32"
                        fontWeight="bold"
                        fill="#444444"
                        textAnchor="middle"
                        letterSpacing="1.5px"
                      >
                        {typeName}
                      </text>

                      {/* Code */}
                      <text
                        x="430"
                        y="445"
                        className="svg-bebas-font"
                        fontSize={label.codigo.length > 9 ? "135" : "162"}
                        fontWeight="900"
                        fill="#111111"
                        textAnchor="middle"
                        letterSpacing="-0.2px"
                      >
                        {label.codigo}
                      </text>

                      {/* Dimension bubble */}
                      <g transform="translate(430, 545)">
                        <rect x="-240" y="-48" width="480" height="96" rx="48" fill="#111111" />
                        <text
                          x="0"
                          y="18"
                          className="svg-bebas-font"
                          fontSize="62"
                          fontWeight="bold"
                          fill="#ffffff"
                          textAnchor="middle"
                          letterSpacing="1px"
                        >
                          {`${label.ancho} x ${label.largo} mm`}
                        </text>
                      </g>

                      {/* Stacked Carreras & gear wheel (Z) details */}
                      {label.tipoTroquel === "DIGITAL" ? (
                        <g>
                          <text
                            x="430"
                            y="685"
                            className="svg-bebas-font"
                            fontSize="48"
                            fontWeight="bold"
                            fill="#111111"
                            textAnchor="middle"
                            letterSpacing="1px"
                          >
                            Carreras: {cleanCarreras}
                          </text>
                        </g>
                      ) : (
                        <g>
                          <text
                            x="430"
                            y="630"
                            className="svg-bebas-font"
                            fontSize="42"
                            fontWeight="bold"
                            fill="#444444"
                            textAnchor="middle"
                            letterSpacing="0.5px"
                          >
                            Carreras: {cleanCarreras}
                          </text>
                          {/* Big Z indicator centered */}
                          <g transform="translate(430, 720)">
                            <text
                              x="0"
                              y="10"
                              className="svg-bebas-font"
                              fontSize="96"
                              fontWeight="950"
                              fill="#111111"
                              textAnchor="middle"
                              letterSpacing="1px"
                            >
                              {label.engranaje ? `Z${label.engranaje}` : "Z--"}
                            </text>
                          </g>
                        </g>
                      )}
                    </svg>
                  ) : (
                    /* Outer reference circle for empty slots (only outline, matches on-screen) */
                    <svg
                      width="86mm"
                      height="86mm"
                      viewBox="0 0 860 860"
                      style={{ width: "100%", height: "100%", opacity: 0.1 }}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="430" cy="430" r="400" fill="none" stroke="#777777" strokeWidth="2" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* MASTER PRINT MEDIAS LAYER */}
      <style>{`
        @page {
          size: 169.32mm 220mm;
          margin: 0;
        }
        @media screen {
          .print-only-section {
            display: none !important;
          }
        }
        @media print {
          /* Hide live screen components precisely without hiding parent wrappers */
          header, 
          footer, 
          nav, 
          button, 
          .no-print,
          .screen-only-section,
          #appContainer > div:first-child {
            display: none !important;
          }

          body, html, #root, #appContainer {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 169.32mm !important;
            height: 220mm !important;
            min-width: 169.32mm !important;
            min-height: 220mm !important;
            border: none !important;
            box-shadow: none !important;
          }

          .print-only-section {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 169.32mm !important;
            height: 220mm !important;
            background-color: #ffffff !important;
          }

          /* Force exact paper leaf dimensions on each print leaf */
          .print-sheet-pdf {
            display: block !important;
            break-after: page !important;
            page-break-after: always !important;
            width: 169.32mm !important;
            height: 220mm !important;
            min-width: 169.32mm !important;
            min-height: 220mm !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background-color: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            overflow: hidden !important;
          }

          /* No browser filter shadows or blurs on vector shapes */
          svg {
            filter: none !important;
            -webkit-filter: none !important;
          }
        }
      `}</style>
    </>
  );
};
