/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AVISO DE PROPIEDAD INTELECTUAL & CERTIFICACIÓN DE AUTORÍA
 * --------------------------------------------------------
 * Desarrollado por: Daniel Gandolfo (GUTEN)
 * Proyecto: Ecosistema RR - Gestor de Troqueles
 * Fecha: 2024 - 2026
 * 
 * © Todos los derechos reservados. El código fuente, arquitectura
 * y lógica de este software son propiedad intelectual de GUTEN.
 */

import React, { useEffect, useState, useMemo } from "react";
import Papa from "papaparse";
import {
  Search,
  RotateCcw,
  Image as ImageIcon,
  Info,
  Layers,
  Database,
  Grid,
  Calculator,
  Flame,
  Check,
  Copy,
  X,
  RefreshCw,
  Sliders,
  Cog,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Troquel, SearchingParams } from "./types";
import { TroquelVisualizer } from "./components/TroquelVisualizer";
import { DatabaseGrid } from "./components/DatabaseGrid";
import { FormatIndicator } from "./utils/formatHelper";
import { LabelGenerator } from "./components/LabelGenerator";
import { Footer } from "./components/Footer";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT6EiWfmeqj01h807bJiut1jZWa3Ea_KxMcUBPxGFEiHsHNQWrlFyzs7cpWhe32n37yfxnoxmWitEni/pub?gid=0&single=true&output=csv";

export default function App() {
  // Database States
  const [baseDatos, setBaseDatos] = useState<Troquel[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Custom persistent notes
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});

  // Search Param States
  const [params, setParams] = useState<SearchingParams>({
    ancho: "",
    largo: "",
    formato: "",
    codigo: "",
    tolerancia: "5",
    palabraClave: "",
  });

  // active search toggle
  const [hasSearched, setHasSearched] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<Troquel[]>([]);

  // Navigation Panel Tab State (Search, Database explorer)
  const [activeTab, setActiveTab] = useState<"search" | "explorer" | "labels">("search");

  // Quick toast state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Add selected troquel to labels printing queue (stored in localStorage)
  const handleAddTroquelToPliego = (troquel: Troquel) => {
    try {
      const stored = localStorage.getItem("pliego_labels_queue");
      const currentQueue = stored ? JSON.parse(stored) : [];
      
      const code = String(troquel.Codigo).toUpperCase();
      const format = String(troquel.Formato || "").toUpperCase();
      const note = (customNotes[String(troquel.Codigo)] || "").toUpperCase();

      // 1. Tipo Troquel
      let tipoTroquel: "DIGITAL" | "ETIRAMA" | "FLEXO" | "FINISHER" = "FLEXO";
      if (code.startsWith("D") || format.includes("DIGITAL")) {
        tipoTroquel = "DIGITAL";
      } else if (code.startsWith("E") || format.includes("ETIRAMA")) {
        tipoTroquel = "ETIRAMA";
      } else if (code.startsWith("FI") || code.startsWith("F") || note.includes("FINISHER") || format.includes("FINISHER")) {
        tipoTroquel = "FINISHER";
      }

      // 2. Shape Logo
      let formaLogo: "R" | "C" | "F" | "PAI" | "CR" | "P" = "R";
      if (format.includes("CIRCULAR") || format.includes("REDONDO") || format.includes("CIRC")) {
        formaLogo = "C";
      } else if (format.includes("FLECHA") || format.includes("OPP") || format.includes("DISEÑO") || format.includes("ESPECIAL") || format.includes("FIGURA") || format.includes("FIG")) {
        formaLogo = "F";
      } else if (format.includes("TAG") || format.includes("PAI")) {
        formaLogo = "PAI";
      } else if (format.includes("PREPICADO") || format.includes("PREP") || format.includes("TROQUELADO PREP")) {
        formaLogo = "P";
      } else if (format.includes("CORTE") || format.includes("RECTO")) {
        formaLogo = "CR";
      }

      // 3. Material / Client
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

      const newItem = {
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

      const updated = [...currentQueue, newItem];
      localStorage.setItem("pliego_labels_queue", JSON.stringify(updated));
      
      // Trigger success toast
      setSuccessToast(`¡Se agregó ${troquel.Codigo} al pliego!`);
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (e) {
      console.error("Error adding to pliego queue from search page", e);
    }
  };

  const handleAddMultipleTroquelesToPliego = (troqueles: Troquel[]) => {
    try {
      const stored = localStorage.getItem("pliego_labels_queue");
      const currentQueue = stored ? JSON.parse(stored) : [];
      
      const newItems = troqueles.map((troquel, idx) => {
        const code = String(troquel.Codigo).toUpperCase();
        const format = String(troquel.Formato || "").toUpperCase();
        const note = (customNotes[String(troquel.Codigo)] || "").toUpperCase();

        // 1. Tipo Troquel
        let tipoTroquel: "DIGITAL" | "ETIRAMA" | "FLEXO" | "FINISHER" = "FLEXO";
        if (code.startsWith("D") || format.includes("DIGITAL")) {
          tipoTroquel = "DIGITAL";
        } else if (code.startsWith("E") || format.includes("ETIRAMA")) {
          tipoTroquel = "ETIRAMA";
        } else if (code.startsWith("FI") || code.startsWith("F") || note.includes("FINISHER") || format.includes("FINISHER")) {
          tipoTroquel = "FINISHER";
        }

        // 2. Shape Logo / Badges based on format or note
        let formaLogo: "R" | "C" | "F" | "PAI" | "CR" | "P" = "R";
        if (format.includes("CIRCULAR") || format.includes("REDONDO") || format.includes("CIRC")) {
          formaLogo = "C";
        } else if (format.includes("FLECHA") || format.includes("OPP") || format.includes("DISEÑO") || format.includes("ESPECIAL") || format.includes("FIGURA") || format.includes("FIG")) {
          formaLogo = "F";
        } else if (format.includes("TAG") || format.includes("PAI")) {
          formaLogo = "PAI";
        } else if (format.includes("PREPICADO") || format.includes("PREP") || format.includes("TROQUELADO PREP")) {
          formaLogo = "P";
        } else if (format.includes("CORTE") || format.includes("RECTO")) {
          formaLogo = "CR";
        }

        // 3. Material / Client
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

        return {
          id: "label-" + Date.now() + "-" + idx + "-" + Math.random().toString(36).substr(2, 4),
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
      });

      const updated = [...currentQueue, ...newItems];
      localStorage.setItem("pliego_labels_queue", JSON.stringify(updated));
      
      setSuccessToast(`¡Se agregaron ${troqueles.length} troqueles al pliego!`);
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (e) {
      console.error("Error adding multiple to pliego queue from explorer", e);
    }
  };

  // Modal State
  const [activeDrawingCode, setActiveDrawingCode] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [imageErrorLevel, setImageErrorLevel] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editingNote, setEditingNote] = useState("");

  // Load database on mount
  useEffect(() => {
    // Fetch CSV
    fetch(SHEET_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Error de conexión al obtener la base de datos.");
        return response.text();
      })
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleanData = (results.data as Troquel[]).filter(
              (item) => item && item.Codigo
            );
            setBaseDatos(cleanData);
            setDataLoaded(true);
            setLoading(false);
          },
          error: (err: any) => {
            console.error("PapaParse error:", err);
            throw new Error("Formato de datos no compatible.");
          },
        });
      })
      .catch((err) => {
        console.error(err);
        setErrorStatus(err.message || "No se pudo cargar la base de datos de Google Sheets.");
        setLoading(false);
      });

    // Fetch Favorites from localStorage
    try {
      const stored = localStorage.getItem("fav_troqueles");
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading localStorage favorites:", e);
    }

    // Fetch Custom Notes from localStorage
    try {
      const storedNotes = localStorage.getItem("troquel_notes");
      if (storedNotes) {
        setCustomNotes(JSON.parse(storedNotes));
      }
    } catch (e) {
      console.error("Error reading localStorage troquel_notes:", e);
    }
  }, []);

  // Update dynamic properties when modal changes
  useEffect(() => {
    if (activeDrawingCode) {
      setImageSrc(`img/${activeDrawingCode}.jpg`);
      setImageErrorLevel(0);
      setEditingNote(customNotes[activeDrawingCode] || "");
    } else {
      setImageSrc("");
      setImageErrorLevel(0);
      setEditingNote("");
    }
    setCopiedCode(false);
  }, [activeDrawingCode, customNotes]);

  // Handle Sequential Fallback Image Loading
  const handleImageError = () => {
    if (!activeDrawingCode) return;

    if (imageErrorLevel === 0) {
      // Try production Vercel app proxy
      setImageSrc(`https://troquelapprr.vercel.app/img/${activeDrawingCode}.jpg`);
      setImageErrorLevel(1);
    } else if (imageErrorLevel === 1) {
      // Try upstream GitHub repository master branch
      setImageSrc(
        `https://raw.githubusercontent.com/dgandolfouy/troquelapprr/master/img/${activeDrawingCode}.jpg`
      );
      setImageErrorLevel(2);
    } else {
      // Fallback complete fail
      setImageSrc("");
      setImageErrorLevel(3);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (troquel: Troquel) => {
    const codeStr = String(troquel.Codigo);
    let updated: Troquel[];
    if (favorites.some((fav) => String(fav.Codigo) === codeStr)) {
      updated = favorites.filter((fav) => String(fav.Codigo) !== codeStr);
    } else {
      updated = [...favorites, troquel];
    }
    setFavorites(updated);
    localStorage.setItem("fav_troqueles", JSON.stringify(updated));
  };

  // Save custom notes to local storage and state
  const handleSaveNote = () => {
    if (!activeDrawingCode) return;
    const trimmed = editingNote.trim();
    const updatedNotes = { ...customNotes, [activeDrawingCode]: trimmed };
    if (!trimmed) {
      delete updatedNotes[activeDrawingCode];
    }
    setCustomNotes(updatedNotes);
    localStorage.setItem("troquel_notes", JSON.stringify(updatedNotes));
  };

  const isFavorite = (item: Troquel) =>
    favorites.some((fav) => String(fav.Codigo) === String(item.Codigo));

  // Search Handlers
  const handleParamChange = (field: keyof SearchingParams, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  // Reset inputs
  const handleResetSearch = () => {
    setParams({
      ancho: "",
      largo: "",
      formato: "",
      codigo: "",
      tolerancia: "5",
      palabraClave: "",
    });
    setHasSearched(false);
  };

  // Set Search values from a Favorite / selected troquel
  const handleApplyTroquelToSearchParams = (troquel: Troquel) => {
    setParams({
      ancho: String(troquel.Ancho || ""),
      largo: String(troquel.Largo || ""),
      formato: String(troquel.Formato || "").trim().toUpperCase(),
      codigo: String(troquel.Codigo || ""),
      tolerancia: "5",
      palabraClave: "",
    });
    setActiveTab("search");
    setHasSearched(true);
  };

  // Direct results calculations
  const directResults = useMemo(() => {
    if (!dataLoaded) return [];

    const isSearchingAll =
      !params.ancho && !params.largo && !params.formato && !params.codigo && !params.palabraClave;

    // Default state: if they haven't searched and didn't touch filters, we don't return anything or all
    if (!hasSearched && isSearchingAll) return [];

    const reqAncho = params.ancho ? parseFloat(params.ancho) : null;
    const reqLargo = params.largo ? parseFloat(params.largo) : null;
    const tolerance = parseFloat(params.tolerancia) || 5;
    const filterFmt = params.formato.trim().toUpperCase();
    const filterCode = params.codigo.trim().toUpperCase();

    return baseDatos.filter((item) => {
      if (!item.Codigo) return false;

      let matchCode = true;
      let matchFormat = true;
      let matchAncho = true;
      let matchLargo = true;
      let matchKeyword = true;

      if (filterCode) {
        matchCode = String(item.Codigo).toUpperCase().includes(filterCode);
      }

      if (filterFmt) {
        matchFormat = String(item.Formato).toUpperCase() === filterFmt;
      }

      if (reqAncho !== null) {
        const itemW = parseFloat(String(item.Ancho)) || 0;
        matchAncho = itemW >= reqAncho - tolerance && itemW <= reqAncho + tolerance;
      }

      if (reqLargo !== null) {
        const itemL = parseFloat(String(item.Largo)) || 0;
        matchLargo = itemL >= reqLargo - tolerance && itemL <= reqLargo + tolerance;
      }

      if (params.palabraClave) {
        const kw = params.palabraClave.trim().toLowerCase();
        const codeText = String(item.Codigo).toLowerCase();
        const fmtText = String(item.Formato).toLowerCase();
        const noteText = (customNotes[String(item.Codigo)] || "").toLowerCase();
        const gearVal = item.Engranaje ? String(item.Engranaje).trim() : "";
        const gearZText = gearVal ? `z${gearVal}`.toLowerCase() : "";

        matchKeyword = codeText.includes(kw) ||
                       fmtText.includes(kw) ||
                       noteText.includes(kw) ||
                       (gearVal && gearVal === kw) ||
                       (gearZText && gearZText.includes(kw));
      }

      return matchCode && matchFormat && matchAncho && matchLargo && matchKeyword;
    });
  }, [baseDatos, dataLoaded, params, hasSearched, customNotes]);

  // Inverted results calculations (Rotas suggestions)
  const invertedResults = useMemo(() => {
    if (!dataLoaded) return [];

    const reqAncho = params.ancho ? parseFloat(params.ancho) : null;
    const reqLargo = params.largo ? parseFloat(params.largo) : null;

    // ONLY construct rotated if width AND height are specified
    if (reqAncho === null || reqLargo === null) return [];

    const tolerance = parseFloat(params.tolerancia) || 5;
    const filterFmt = params.formato.trim().toUpperCase();
    const filterCode = params.codigo.trim().toUpperCase();

    return baseDatos.filter((item) => {
      if (!item.Codigo) return false;

      // Avoid redundant duplicates: if already printed in directResults, don't repeat here
      if (directResults.some((d) => String(d.Codigo) === String(item.Codigo))) {
        return false;
      }

      let matchCode = true;
      let matchFormat = true;
      let matchKeyword = true;

      if (filterCode) {
        matchCode = String(item.Codigo).toUpperCase().includes(filterCode);
      }

      if (filterFmt) {
        matchFormat = String(item.Formato).toUpperCase() === filterFmt;
      }

      if (params.palabraClave) {
        const kw = params.palabraClave.trim().toLowerCase();
        const codeText = String(item.Codigo).toLowerCase();
        const fmtText = String(item.Formato).toLowerCase();
        const noteText = (customNotes[String(item.Codigo)] || "").toLowerCase();
        const gearVal = item.Engranaje ? String(item.Engranaje).trim() : "";
        const gearZText = gearVal ? `z${gearVal}`.toLowerCase() : "";

        matchKeyword = codeText.includes(kw) ||
                       fmtText.includes(kw) ||
                       noteText.includes(kw) ||
                       (gearVal && gearVal === kw) ||
                       (gearZText && gearZText.includes(kw));
      }

      // Check inverted fit: actual item width aligns with requested length, and actual length aligns with requested width
      const itemW = parseFloat(String(item.Ancho)) || 0;
      const itemL = parseFloat(String(item.Largo)) || 0;

      const matchAnchoInverted = itemW >= reqLargo - tolerance && itemW <= reqLargo + tolerance;
      const matchLargoInverted = itemL >= reqAncho - tolerance && itemL <= reqAncho + tolerance;

      return matchCode && matchFormat && matchAnchoInverted && matchLargoInverted && matchKeyword;
    });
  }, [baseDatos, dataLoaded, params, directResults, customNotes]);

  // Unique layout categories
  const formatsList = useMemo(() => {
    const list = new Set<string>();
    baseDatos.forEach((item) => {
      if (item.Formato) {
        list.add(item.Formato.trim().toUpperCase());
      }
    });
    return Array.from(list).sort();
  }, [baseDatos]);

  const handleCopyCode = () => {
    if (!activeDrawingCode) return;
    navigator.clipboard.writeText(activeDrawingCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div id="appContainer" className="min-h-screen bg-[#0d0d0d] text-gray-200 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      {/* GLOWING ORANGE RADIAL OVERLAY */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-orange-500/[0.04] to-transparent pointer-events-none z-0"></div>

      {/* HEADER SECTION */}
      <header className="relative w-full max-w-4xl mx-auto pt-8 pb-4 px-4 text-center z-10 flex flex-col items-center">
        {/* ORIGINAL LOGO RR SVG RENDERING */}
        <div className="hover:scale-105 transition-transform duration-300 select-none">
          <svg className="h-[100px] sm:h-[120px] w-auto mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 445.41 237.71">
            <g>
              <path fill="#ffffff" d="M201.77,211.05h1.74l7.49,16.56h-2l-1.93-4.34h-8.95l-1.95,4.34h-1.9l7.49-16.56h0Z M206.35,221.59l-3.73-8.38l-3.76,8.38h7.49,0Z" />
              <path fill="#ffffff" d="M221.28,211.16h7c1.88,0,3.36.54,4.3,1.46.68.71,1.06,1.57,1.06,2.63v.05c0,2.14-1.31,3.24-2.61,3.8,1.95.59,3.52,1.71,3.52,3.97v.05c0,2.82-2.37,4.49-5.96,4.49h-7v-16.44h0Z M231.76,215.51c0-1.62-1.29-2.68-3.64-2.68h-5v5.66h4.86c2.23,0,3.78-1.01,3.78-2.94v-.05h0Z M228.3,220.14h-5.19v5.8h5.52c2.49,0,4.04-1.1,4.04-2.94v-.05c0-1.79-1.5-2.82-4.37-2.82h0Z" />
              <path fill="#ffffff" d="M237.18,221.57v-.05c0-3.5,2.46-6.32,5.82-6.32,3.59,0,5.66,2.87,5.66,6.41,0,.24,0,.38-.02.59h-9.63c.26,2.63,2.11,4.11,4.27,4.11,1.67,0,2.84-.68,3.83-1.71l1.13,1.01c-1.22,1.36-2.7,2.28-5,2.28-3.33,0-6.06-2.56-6.06-6.32h0Z M246.83,220.86c-.19-2.21-1.46-4.13-3.88-4.13-2.11,0-3.71,1.76-3.95,4.13h7.83Z" />
              <path fill="#ffffff" d="M251.08,221.59v-.05c0-3.43,2.68-6.34,6.34-6.34s6.32,2.87,6.32,6.29v.05c0,3.43-2.7,6.34-6.36,6.34s-6.29-2.87-6.29-6.29h-.01Z M261.88,221.59v-.05c0-2.61-1.95-4.74-4.51-4.74s-4.44,2.14-4.44,4.7v.05c0,2.61,1.93,4.72,4.49,4.72s4.46-2.11,4.46-4.67h0Z" />
              <path fill="#ffffff" d="M267,215.46h1.81v2.11c.8-1.32,2.07-2.37,4.16-2.37,2.94,0,4.65,1.97,4.65,4.86v7.54h-1.81v-7.09c0-2.25-1.22-3.66-3.36-3.66s-3.64,1.53-3.64,3.8v6.95h-1.81v-12.14Z" />
              <path fill="#ffffff" d="M282.1,224.39v-7.33h-1.69v-1.6h1.69v-3.66h1.81v3.66h3.85v1.6h-3.85v7.09c0,1.48.82,2.02,2.04,2.02.61,0,1.13-.12,1.76-.42v1.55c-.63.33-1.31.52-2.18.52-1.95,0-3.43-.96-3.43-3.43h0Z" />
              <path fill="#ffffff" d="M290.03,224.08v-.05c0-2.56,2.11-3.92,5.19-3.92,1.55,0,2.65.21,3.73.52v-.42c0-2.18-1.34-3.31-3.62-3.31-1.43,0-2.56.38-3.69.89l-.54-1.48c1.34-.61,2.65-1.01,4.42-1.01s3.03.45,3.92,1.34c.82.82,1.24,2,1.24,3.55v7.42h-1.74v-1.83c-.85,1.1-2.25,2.09-4.39,2.09-2.25,0-4.53-1.29-4.53-3.78h0Z M298.98,223.14v-1.17c-.89-.26-2.09-.52-3.57-.52-2.28,0-3.55.99-3.55,2.51v.05c0,1.53,1.41,2.42,3.05,2.42,2.23,0,4.06-1.36,4.06-3.29h.01Z" />
              <path fill="#ffffff" d="M304.41,229.72l.82-1.41c1.39,1.01,2.94,1.55,4.67,1.55,2.68,0,4.42-1.48,4.42-4.32v-1.43c-1.06,1.41-2.54,2.56-4.77,2.56-2.91,0-5.71-2.18-5.71-5.68v-.05c0-3.55,2.82-5.73,5.71-5.73,2.28,0,3.76,1.13,4.74,2.44v-2.18h1.81v10.03c0,1.88-.56,3.31-1.55,4.3-1.08,1.08-2.7,1.62-4.63,1.62s-3.9-.56-5.52-1.69h0Z M314.36,220.96v-.05c0-2.49-2.16-4.11-4.46-4.11s-4.2,1.6-4.2,4.09v.05c0,2.44,1.95,4.13,4.2,4.13s4.46-1.67,4.46-4.11Z" />
              <path fill="#ffffff" d="M326.76,219.43v-.05c0-4.65,3.48-8.5,8.31-8.5,2.98,0,4.77,1.06,6.41,2.61l-1.27,1.36c-1.39-1.32-2.94-2.25-5.17-2.25-3.64,0-6.36,2.96-6.36,6.74v.05c0,3.8,2.75,6.79,6.36,6.79,2.25,0,3.73-.87,5.31-2.37l1.22,1.2c-1.71,1.74-3.59,2.89-6.58,2.89-4.74,0-8.24-3.73-8.24-8.45v-.02Z" />
              <path fill="#ffffff" d="M343.62,221.59v-.05c0-3.43,2.68-6.34,6.34-6.34s6.32,2.87,6.32,6.29v.05c0,3.43-2.7,6.34-6.36,6.34s-6.29-2.87-6.29-6.29h-.01Z M354.42,221.59v-.05c0-2.61-1.95-4.74-4.51-4.74s-4.44,2.14-4.44,4.7v.05c0,2.61,1.93,4.72,4.49,4.72s4.46-2.11,4.46-4.67h0Z" />
              <path fill="#ffffff" d="M359.54,215.46h1.81v2.04c.8-1.2,1.88-2.3,3.92-2.3s3.24,1.06,3.9,2.42c.87-1.34,2.16-2.42,4.27-2.42,2.79,0,4.51,1.88,4.51,4.88v7.51h-1.81v-7.09c0-2.35-1.17-3.66-3.15-3.66-1.83,0-3.36,1.36-3.36,3.76v7h-1.78v-7.14c0-2.28-1.2-3.62-3.12-3.62s-3.38,1.6-3.38,3.83v6.93h-1.81v-12.14h0Z" />
              <path fill="#ffffff" d="M381.8,215.46h1.81v2.44c.99-1.46,2.42-2.7,4.65-2.7,2.91,0,5.8,2.3,5.8,6.29v.05c0,3.97-2.86,6.32-5.8,6.32-2.25,0-3.71-1.22-4.65-2.58v6.08h-1.81v-15.9h0Z M392.2,221.57v-.05c0-2.87-1.97-4.7-4.27-4.7s-4.39,1.9-4.39,4.67v.05c0,2.82,2.14,4.7,4.39,4.7s4.27-1.74,4.27-4.67Z" />
              <path fill="#ffffff" d="M396.47,224.08v-.05c0-2.56,2.11-3.92,5.19-3.92,1.55,0,2.65.21,3.73.52v-.42c0-2.18-1.34-3.31-3.62-3.31-1.43,0-2.56.38-3.69.89l-.54-1.48c1.34-.61,2.65-1.01,4.42-1.01s3.03.45,3.92,1.34c.82.82,1.24,2,1.24,3.55v7.42h-1.74v-1.83c-.85,1.1-2.25,2.09-4.39,2.09-2.25,0-4.53-1.29-4.53-3.78h0Z M405.42,223.14v-1.17c-.89-.26-2.09-.52-3.57-.52-2.28,0-3.55.99-3.55,2.51v.05c0,1.53,1.41,2.42,3.05,2.42,2.23,0,4.06-1.36,4.06-3.29h.01Z" />
              <path fill="#ffffff" d="M410.98,215.46h1.81v2.11c.8-1.32,2.07-2.37,4.16-2.37,2.94,0,4.65,1.97,4.65,4.86v7.54h-1.81v-7.09c0-2.25-1.22-3.66-3.36-3.66s-3.64,1.53-3.64,3.8v6.95h-1.81v-12.14Z" />
              <path fill="#ffffff" d="M434.18,215.46h1.93l-5.1,12.54c-1.03,2.51-2.21,3.43-4.04,3.43-1.01,0-1.76-.21-2.58-.61l.61-1.43c.59.3,1.13.45,1.9.45,1.08,0,1.76-.56,2.49-2.28l-5.52-12.09h2l4.41,10.12,3.9-10.12h0Z" />
            </g>
            <g>
              <path fill="#f97316" d="M312.16,3.22c-52.77,0-95.56,42.79-95.56,95.56s42.79,95.56,95.56,95.56v-3.19c-51.01,0-92.38-41.37-92.38-92.38S261.15,6.4,312.16,6.4v-3.19h0Z" />
              <path fill="#ffffff" d="M101.92,3.22C49.15,3.22,6.35,46.01,6.35,98.78s42.79,95.56,95.56,95.56,95.56-42.79,95.56-95.56S154.69,3.22,101.92,3.22Z M82.59,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.08-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.27-4.1,9.28-9.01,0-4.61-4.23-8.36-9.81-8.36h-13.8v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.16-17.59,23.51l18.53,29.4h-17.01,0Z M156.19,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.09-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.28-4.1,9.28-9,0-4.61-4.23-8.36-9.81-8.36H128v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.15-17.59,23.51l18.53,29.4h-17.01,0Z" />
              <path fill="#f97316" d="M430.5,108.13c0-.5-.14-.91-.43-1.23-.28-.32-.65-.58-1.11-.8-.46-.21-.99-.4-1.6-.56-.6-.16-1.23-.32-1.88-.47-.83-.23-1.63-.48-2.4-.78-.76-.3-1.44-.69-2.02-1.17-.58-.47-1.05-1.08-1.39-1.81-.34-.73-.52-1.62-.52-2.67,0-1.3.23-2.42.7-3.37.47-.95,1.09-1.74,1.88-2.37.79-.62,1.71-1.08,2.76-1.39,1.05-.3,2.15-.45,3.32-.45,1.42,0,2.75.11,4,.34,1.24.24,2.37.53,3.38.9v4.63c-.53-.18-1.08-.34-1.67-.49-.58-.16-1.17-.29-1.77-.4-.61-.11-1.2-.2-1.79-.28-.59-.07-1.15-.11-1.68-.11-.67,0-1.24.07-1.7.2-.46.12-.84.29-1.13.52-.29.21-.49.46-.62.75-.12.28-.19.57-.19.87,0,0.53.14.97.42,1.3.28.34.67.61,1.16.81.5.21,1.02.38,1.56.52s1.07.27,1.58.4c.8.19,1.6.42,2.4.7.8.27,1.52.65,2.16,1.14.64.48,1.16,1.11,1.57,1.89.4.78.61,1.77.61,2.96,0,1.31-.25,2.46-.75,3.43-.49.97-1.19,1.79-2.07,2.43-.88.65-1.95,1.13-3.19,1.44-1.24.31-2.6.47-4.09.47s-2.79-.11-3.97-.34c-1.18-.24-2.15-.52-2.92-.88v-4.59c1.24.47,2.4.78,3.46.95,1.06.16,2.04.25,2.95.25.7,0,1.36-.06,1.97-.16.61-.11,1.14-.27,1.57-.49.44-.23.79-.51,1.05-.85.25-.34.38-.76.38-1.2M408.89,104.96c-.54-.13-1.16-.25-1.87-.34-.7-.11-1.42-.16-2.14-.16-1.39,0-2.49.27-3.3.83-.81.55-1.21,1.39-1.21,2.53,0,.52.09.98.28,1.38.18.39.43.72.74.97s.67.44,1.09.57c.42.13.85.2,1.32.2.57,0,1.12-.08,1.63-.23.52-.16.98-.34,1.42-.58.43-.23.82-.49,1.16-.78s.64-.57.88-.84v-3.55h0Z M409.34,112.4h-.1c-.32.34-.7.68-1.15,1.03-.44.35-.96.69-1.53,1s-1.21.56-1.92.75c-.7.2-1.47.29-2.28.29-1.11,0-2.13-.17-3.1-.52-.96-.34-1.78-.83-2.46-1.48-.69-.65-1.23-1.43-1.62-2.36-.39-.92-.59-1.94-.59-3.08,0-1.24.23-2.37.69-3.36.45-.99,1.09-1.83,1.9-2.52.82-.69,1.79-1.21,2.93-1.57,1.14-.36,2.39-.54,3.77-.54,1.01,0,1.93.07,2.78.2.84.13,1.59.28,2.23.46v-.94c0-.54-.09-1.06-.28-1.57-.18-.5-.47-.95-.88-1.34s-.94-.7-1.6-.93-1.46-.34-2.4-.34c-1.15,0-2.3.12-3.46.38-1.15.26-2.4.65-3.74,1.15v-4.44c1.17-.51,2.41-.9,3.72-1.17,1.32-.28,2.69-.42,4.13-.43,1.7,0,3.19.2,4.45.62,1.27.42,2.33.99,3.19,1.71.86.73,1.5,1.59,1.92,2.58.43.99.63,2.07,6.3,3.24v8.75c0,1.54.02,2.86.05,3.96s.07,2.09.1,2.95h-5.13l-.24-2.47h-.01Z M391.98,114.84c-.64.2-1.4.34-2.29.46-.88.11-1.71.16-2.48.16-1.95,0-3.55-.31-4.78-.94-1.24-.64-2.12-1.54-2.63-2.73-.37-.85-.55-2-.55-3.46v-12.04h-4.35v-4.68h4.35v-6.5h5.68v6.5h6.71v4.68h-6.71v11.3c0,.9.14,1.56.41,1.99.47.74,1.43,1.11,2.85,1.11.66,0,1.31-.05,1.96-.16s1.26-.24,1.83-.39v4.7h0Z M363.03,95.49c-.71,0-1.36.13-1.92.39-.56.26-1.04.62-1.45,1.08s-.74.99-.97,1.6c-.24.61-.4,1.25-.47,1.94h9.14c0-.69-.09-1.33-.28-1.94-.18-.61-.46-1.14-.81-1.6-.36-.46-.81-.82-1.35-1.08-.53-.26-1.16-.39-1.88-.39h0Z M365.31,110.89c1.11,0,2.25-.11,3.46-.34,1.2-.23,2.42-.55,3.64-.97v4.54c-.74.32-1.87.62-3.38.92-1.52.29-3.1.43-4.72.43s-3.21-.21-4.69-.63c-1.48-.43-2.77-1.11-3.87-2.06-1.11-.94-1.98-2.17-2.63-3.67-.65-1.51-.97-3.32-.97-5.47s.3-3.95.92-5.54c.61-1.58,1.42-2.89,2.45-3.93,1.02-1.04,2.19-1.82,3.51-2.34s2.68-.78,4.09-.78,2.82.22,4.07.67c1.24.45,2.31,1.15,3.21,2.11.91.96,1.61,2.19,2.11,3.7.51,1.51.76,3.3.76,5.36-.02.8-.04,1.48-.07,2.04h-15.24c.08,1.07.32,1.99.72,2.75.4.75.93,1.38,1.57,1.84.65.47,1.41.82,2.27,1.03s1.8.33,2.81.33h-.02Z M337.58,115.47c-2.33,0-4.27-.39-5.81-1.19-1.54-.79-2.69-1.86-3.48-3.2-.42-.72-.72-1.51-.93-2.37-.2-.86-.29-1.83-.29-2.88v-14.2h5.68v13.6c0,.79.06,1.46.16,2.03.11.57.29,1.06.51,1.47.38.7.93,1.23,1.63,1.57s1.55.52,2.52.52c1.02,0,1.9-.2,2.63-.57.72-.38,1.27-.97,1.64-1.75.37-.75.56-1.8.56-3.14v-13.72h5.68v14.2c0,1.89-.33,3.48-.98,4.78-.37.73-.84,1.4-1.42,2-.59.6-1.28,1.11-2.06,1.54-.79.42-1.69.74-2.69.98-1,.23-2.11.34-3.34.34h0Z M316.59,94.23l.25-2.61,4.99,34.4h-5.68v-9.66c0-.69,0-1.33.02-1.91.02-.59.02-1.04.04-1.36h-.04c-.35.29-.76.57-1.21.85-.46.28-.96.54-1.5.77-.55.23-1.14.42-1.78.55-.64.14-1.32.2-2.04.2-1.24,0-2.44-.22-3.61-.65-1.18-.44-2.23-.14-3.14-2.09-.92-.95-1.65-2.18-2.21-3.68-.55-1.51-.83-3.28-.83-5.35s.29-3.87.85-5.47c.57-1.6,1.33-2.93,2.27-3.99.94-1.05,2.03-1.85,3.25-2.38,1.23-.53,2.48-.8,3.78-.8,1.39,0,2.64.29,3.75.88,1.11.58,2.03,1.35,2.75,2.31h.09Z M311.05,110.94c.57,0,1.11-.07,1.63-.22.51-.14.98-.33,1.42-.55.43-.23.82-.47,1.16-.74s.63-.54.88-.82v-10.31c-.6-.72-1.32-1.35-2.16-1.88-.85-.54-1.78-.82-2.78-.83-.57,0-1.18.11-1.81.34-.63.23-1.23.65-1.78,1.24-.56.59-1.02,1.41-1.36,2.46-.34,1.05-.52,2.33-.52,3.82,0,1.17.11,2.21.34,3.14.23.92.57,1.7,1.01,2.35.45.65,1.01,1.15,1.67,1.49s1.43.52,2.32.52h-.01Z M289.58,80.13h5.97v6.17h-5.97v-6.17ZM289.72,91.62h5.69v23.25h-5.69v-23.25ZM285.89,114.84c-.64.2-1.4.34-2.29.46-.88.11-1.71.16-2.48.16-1.95,0-3.55-.31-4.78-.94-1.24-.64-2.12-1.54-2.63-2.73-.37-.85-.55-2-.55-3.46v-12.04h-4.35v-4.68h4.35v-6.5h5.68v6.5h6.71v4.68h-6.71v11.3c0,.9.14,1.56.41,1.99.47.74,1.43,1.11,2.85,1.11.66,0,1.31-.05,1.96-.16s1.26-.24,1.83-.39v4.7h0ZM251.14,109.95h15.78v4.92h-21.66v-32.1h20.8v4.92h-14.92v8.29h12.81v4.92h-12.81v9.04h0Z" />
            </g>
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider font-sans">
          TROQUEL<span className="text-orange-500 font-black">app</span>
        </h1>
        <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5 flex items-center gap-2">
          <Flame className="w-4.5 h-4.5 text-orange-500" />
          Buscador de Troqueles RR
        </p>

        {/* TABS SELECTOR */}
        <div className="flex bg-neutral-900/80 border border-white/5 rounded-xl p-1 mt-6 w-full max-w-sm sm:max-w-md select-none">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-250 cursor-pointer ${
              activeTab === "search"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Buscador
          </button>
          <button
            onClick={() => setActiveTab("explorer")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-250 cursor-pointer ${
              activeTab === "explorer"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Ver Todo
          </button>
          <button
            onClick={() => setActiveTab("labels")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-250 cursor-pointer ${
              activeTab === "labels"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Imprenta
          </button>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className={`flex-1 w-full mx-auto px-4 pb-20 z-10 transition-all duration-300 ${activeTab === "labels" ? "max-w-7xl" : "max-w-3xl"}`}>
        {/* CONNECTION LOADING & ERROR STATUSES */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-3" />
            <p className="text-sm text-gray-400 animate-pulse">Conectando con la base de datos de Google Sheets...</p>
          </div>
        )}

        {errorStatus && (
          <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-2xl max-w-md mx-auto my-10 text-center">
            <Info className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h4 className="text-red-400 font-bold">Error de Conexión</h4>
            <p className="text-xs text-gray-400 mt-1.5">{errorStatus}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Reintentar Conexión
            </button>
          </div>
        )}

        {!loading && !errorStatus && (
          <div className="space-y-6 mt-4">
            {/* TAB-DEPENDENT MAIN VIEW PORT (full width) */}
            <div className="space-y-6">
              {/* === TAB 1: SEARCH TAB === */}
              {activeTab === "search" && (
                <>
                  {/* SEARCH INTERACTIVE CONTROLS */}
                  <div className="bg-neutral-900/40 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
                    {/* Width and Length row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-[10px] uppercase text-gray-500 font-extrabold tracking-wider mb-1.5 ml-1 select-none">
                          Ancho (mm)
                        </label>
                        <input
                          type="number"
                          value={params.ancho}
                          onChange={(e) => handleParamChange("ancho", e.target.value)}
                          className="bg-neutral-950 border border-white/5 focus:border-orange-500 text-white text-center text-xl font-mono p-3 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all duration-200"
                          placeholder="0"
                        />
                        <span className="absolute right-3.5 bottom-3 text-gray-600 text-[10px] font-bold uppercase select-none">
                          mm
                        </span>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] uppercase text-gray-500 font-extrabold tracking-wider mb-1.5 ml-1 select-none">
                          Largo (mm)
                        </label>
                        <input
                          type="number"
                          value={params.largo}
                          onChange={(e) => handleParamChange("largo", e.target.value)}
                          className="bg-neutral-950 border border-white/5 focus:border-orange-500 text-white text-center text-xl font-mono p-3 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all duration-200"
                          placeholder="0"
                        />
                        <span className="absolute right-3.5 bottom-3 text-gray-600 text-[10px] font-bold uppercase select-none">
                          mm
                        </span>
                      </div>
                    </div>

                    {/* Format and Die Code Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-500 font-extrabold tracking-wider mb-1.5 ml-1 select-none">
                          Formato
                        </label>
                        <div className="relative">
                          <select
                            value={params.formato}
                            onChange={(e) => handleParamChange("formato", e.target.value)}
                            className="bg-neutral-950 border border-white/5 focus:border-orange-500 text-gray-300 text-xs p-3.5 rounded-xl w-full appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                          >
                            <option value="">TODOS</option>
                            {formatsList.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs">
                            ▼
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-gray-500 font-extrabold tracking-wider mb-1.5 ml-1 select-none">
                          Código Troquel
                        </label>
                        <input
                          type="text"
                          value={params.codigo}
                          onChange={(e) => handleParamChange("codigo", e.target.value)}
                          className="bg-neutral-950 border border-white/5 focus:border-orange-500 text-white text-center text-sm p-3 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase font-bold tracking-wider"
                          placeholder="Ej: M0297"
                        />
                      </div>
                    </div>

                    {/* Palabra Clave Input */}
                    <div>
                      <label className="block text-[10px] uppercase text-gray-500 font-extrabold tracking-wider mb-1.5 ml-1 select-none">
                        Palabra clave o Notas (Ej: cocardas, banderas, clientes)
                      </label>
                      <input
                        type="text"
                        value={params.palabraClave}
                        onChange={(e) => handleParamChange("palabraClave", e.target.value)}
                        className="bg-neutral-950 border border-white/5 focus:border-orange-500 text-white text-sm p-3.5 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-gray-650"
                        placeholder="Escribe etiquetas, formas o clientes para buscar..."
                      />
                    </div>

                    {/* Tolerance controls */}
                    <div className="flex items-center justify-center gap-3 py-1 bg-neutral-950/30 rounded-xl border border-white/5">
                      <Sliders className="w-3.5 h-3.5 text-gray-500" />
                      <label className="text-[10px] uppercase text-gray-400 font-bold select-none">
                        Tolerancia ± (mm):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={params.tolerancia}
                        onChange={(e) => handleParamChange("tolerancia", e.target.value)}
                        className="bg-neutral-950 border border-white/10 focus:border-orange-500 text-orange-400 font-bold text-center font-mono text-xs w-16 p-1 rounded focus:outline-none"
                      />
                    </div>

                    {/* Search action bar buttons */}
                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={handleResetSearch}
                        className="p-3.5 px-4 bg-neutral-950 hover:bg-neutral-900 border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                        title="Limpiar Filtros"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setHasSearched(true)}
                        className="flex-1 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-extrabold p-3.5 rounded-xl shadow-lg shadow-orange-950/20 flex justify-center items-center gap-2 group cursor-pointer transition-all active:scale-98"
                      >
                        <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        BUSCAR TROQUELES
                      </button>
                    </div>
                  </div>

                  {/* DIRECT BÚSQUEDA RESULTS LIST */}
                  <div className="space-y-3">
                    <h3 className="text-gray-400 text-[10px] uppercase font-bold tracking-widest pl-1 mt-6 flex justify-between items-center select-none">
                      <span>Resultados de Búsqueda</span>
                      {hasSearched && (
                        <span className="text-orange-500 font-extrabold normal-case text-xs">
                          {directResults.length} encontrados
                        </span>
                      )}
                    </h3>

                    {hasSearched && directResults.length > 0 && (
                      <div className="flex justify-end p-1 select-none">
                        <button
                          onClick={() => {
                            directResults.forEach((t) => handleAddTroquelToPliego(t));
                            setSuccessToast(`¡Se agregaron ${directResults.length} troqueles al pliego!`);
                            setTimeout(() => setSuccessToast(null), 2500);
                          }}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-orange-950/20 active:scale-98"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Añadir todos a Imprenta ({directResults.length})
                        </button>
                      </div>
                    )}

                    {/* LIST OF ELEMENT CARDS */}
                    <div className="space-y-3">
                      {!hasSearched ? (
                        <div className="bg-neutral-900/20 border border-white/5 border-dashed rounded-2xl py-14 text-center text-gray-500">
                          <Search className="w-10 h-10 mx-auto opacity-20 mb-3 text-orange-500" />
                          <p className="text-xs max-w-xs mx-auto leading-relaxed">
                            Ingresa medidas, formato o un código de troquel y presiona{" "}
                            <span className="text-orange-400 font-bold">Buscar</span>.
                          </p>
                        </div>
                      ) : directResults.length === 0 ? (
                        <div className="bg-neutral-900/20 border border-white/5 rounded-2xl py-12 text-center text-gray-500">
                          <ImageIcon className="w-10 h-10 mx-auto opacity-20 mb-3" />
                          <p className="text-xs font-bold text-gray-400">Sin coincidencias directas</p>
                          <p className="text-[11px] text-gray-600 mt-1 max-w-xs mx-auto">
                            Prueba ampliando la tolerancia de búsqueda o buscando formato alternativos.
                          </p>
                        </div>
                      ) : (
                        directResults.map((item) => {
                          const codeStr = String(item.Codigo);
                          const note = customNotes[codeStr];
                          return (
                            <motion.div
                              layoutId={`card-${codeStr}`}
                              key={codeStr}
                              className="bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/5 hover:border-orange-500/20 p-4 rounded-xl flex justify-between items-center shadow-md border-l-4 border-l-orange-500 transition-all duration-200"
                            >
                              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-extrabold text-white tracking-widest leading-none">
                                    {codeStr}
                                  </span>
                                  <FormatIndicator format={item.Formato} />
                                </div>
                                <div className="text-xs text-gray-300 flex items-center gap-1.5 font-medium">
                                  Medidas:{" "}
                                  <span className="text-orange-400 font-extrabold font-mono text-sm">
                                    {item.Ancho} × {item.Largo}
                                  </span>{" "}
                                  <span className="text-[10px] text-gray-500 uppercase font-mono">mm</span>
                                </div>
                                <div className="text-xs text-gray-300 flex items-center gap-1.5 font-medium">
                                  <span className="text-[11px] text-gray-400 font-bold uppercase select-none">Carreras:</span>
                                  <span className="font-mono font-extrabold text-white bg-neutral-950 border border-white/5 px-2 py-0.5 rounded-md">
                                    {item.Carreras || "-"}
                                  </span>
                                </div>
                                {item.Engranaje && Number(item.Engranaje) > 0 && !(String(item.Formato).toUpperCase().includes("DIGITAL")) && (
                                  <div className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                                    <Cog className="w-4 h-4 text-amber-500 animate-spin-slow filter drop-shadow-[0_0_4px_rgba(245,158,11,0.3)]" />
                                    <span className="text-[11px] text-gray-400 font-bold uppercase select-none">Engranaje:</span>
                                    <span className="font-mono font-black text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                      z{item.Engranaje}
                                    </span>
                                  </div>
                                )}
                                {note && (
                                  <div className="text-[11px] text-orange-400/90 bg-orange-950/10 border border-orange-500/10 rounded-lg p-1.5 pl-2 font-normal italic flex items-start gap-1 max-w-sm mt-1">
                                    <span className="flex-shrink-0">📋</span>
                                    <span className="line-clamp-2">{note}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pl-3">
                                <button
                                  type="button"
                                  onClick={() => handleAddTroquelToPliego(item)}
                                  className="w-11 h-11 bg-neutral-950 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/40 text-gray-400 hover:text-orange-500 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                                  title="Añadir a Pliego de Etiquetas"
                                >
                                  <Printer className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveDrawingCode(codeStr)}
                                  className="w-11 h-11 bg-neutral-950 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/40 text-gray-400 hover:text-orange-500 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                                  title="Ver Ficha / Plano"
                                >
                                  <ImageIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* ROTATED/INVERTED SUGGESTIONS SECTION */}
                  {hasSearched && invertedResults.length > 0 && (
                    <div className="border-t border-dashed border-gray-800 pt-5 mt-6">
                      <h3 className="text-orange-400 text-[10px] uppercase font-bold tracking-widest pl-1 mb-3 flex items-center gap-1.5 select-none">
                        <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin-slow" /> Sugerencias Invertidas (Rotadas)
                      </h3>

                      <div className="space-y-3">
                        {invertedResults.map((item) => {
                          const codeStr = String(item.Codigo);
                          const note = customNotes[codeStr];
                          return (
                            <motion.div
                              layoutId={`inverted-card-${codeStr}`}
                              key={codeStr}
                              className="bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/5 hover:border-orange-500/20 p-4 rounded-xl flex justify-between items-center shadow-md border-l-4 border-l-amber-600 opacity-95 transition-all duration-200"
                            >
                              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-extrabold text-white tracking-widest leading-none">
                                    {codeStr}
                                  </span>
                                  <FormatIndicator format={item.Formato} />
                                  <span className="text-[9px] text-amber-400 bg-amber-950/20 border border-amber-500/20 px-1.5 rounded select-none flex items-center gap-1 font-bold">
                                    ▲ Rotado 90°
                                  </span>
                                </div>
                                <div className="text-xs text-gray-300 flex items-center gap-1.5 font-medium">
                                  Medidas:{" "}
                                  <span className="text-orange-400 font-extrabold font-mono text-sm">
                                    {item.Ancho} × {item.Largo}
                                  </span>{" "}
                                  <span className="text-[10px] text-gray-500 uppercase font-mono">mm</span>
                                </div>
                                <div className="text-xs text-gray-300 flex items-center gap-1.5 font-medium">
                                  <span className="text-[11px] text-gray-400 font-bold uppercase select-none">Carreras:</span>
                                  <span className="font-mono font-extrabold text-white bg-neutral-950 border border-white/5 px-2 py-0.5 rounded-md">
                                    {item.Carreras || "-"}
                                  </span>
                                </div>
                                {item.Engranaje && Number(item.Engranaje) > 0 && !(String(item.Formato).toUpperCase().includes("DIGITAL")) && (
                                  <div className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                                    <Cog className="w-4 h-4 text-amber-500 animate-spin-slow filter drop-shadow-[0_0_4px_rgba(245,158,11,0.3)]" />
                                    <span className="text-[11px] text-gray-400 font-bold uppercase select-none">Engranaje:</span>
                                    <span className="font-mono font-black text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                      z{item.Engranaje}
                                    </span>
                                  </div>
                                )}
                                {note && (
                                  <div className="text-[11px] text-orange-400/95 bg-orange-950/10 border border-orange-500/10 rounded-lg p-1.5 pl-2 font-normal italic flex items-start gap-1 max-w-sm mt-1">
                                    <span className="flex-shrink-0">📋</span>
                                    <span className="line-clamp-2">{note}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pl-3">
                                <button
                                  type="button"
                                  onClick={() => handleAddTroquelToPliego(item)}
                                  className="w-11 h-11 bg-neutral-950 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/40 text-gray-400 hover:text-orange-500 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                                  title="Añadir a Pliego de Etiquetas"
                                >
                                  <Printer className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveDrawingCode(codeStr)}
                                  className="w-11 h-11 bg-neutral-950 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/40 text-gray-400 hover:text-orange-500 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                                  title="Ver Ficha / Plano"
                                >
                                  <ImageIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Footer placed at the bottom of the main search screen */}
                  <Footer />
                </>
              )}

              {/* === TAB 2: EXPLORER FULL DB TAB === */}
              {activeTab === "explorer" && (
                <DatabaseGrid
                  data={baseDatos}
                  onSelectTroquel={handleApplyTroquelToSearchParams}
                  onViewDrawing={setActiveDrawingCode}
                  customNotes={customNotes}
                  onAddPliego={handleAddTroquelToPliego}
                  onAddMultiplePliegos={handleAddMultipleTroquelesToPliego}
                />
              )}

              {/* === TAB 3: LABEL PRINT GENERATOR === */}
              {activeTab === "labels" && (
                <LabelGenerator
                  baseDatos={baseDatos}
                  customNotes={customNotes}
                  onBackToSearch={() => setActiveTab("search")}
                />
              )}


            </div>
          </div>
        )}
      </main>

      {/* DRAWING BLUEPRINT MODAL */}
      <AnimatePresence>
        {activeDrawingCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawingCode(null)}
              className="absolute inset-0 bg-black/92 backdrop-blur-xs cursor-pointer"
            ></motion.div>

            {/* Main Modal body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-neutral-900 rounded-3xl w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl z-10"
            >
              {/* Details Header */}
              <div className="p-4 bg-neutral-950 border-b border-white/5 flex justify-between items-center select-none">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-orange-500" />
                  <h3 className="text-white font-extrabold text-lg tracking-widest uppercase">
                    Ficha: {activeDrawingCode}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDrawingCode(null)}
                  className="p-1 px-[5.5px] rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic image drawing rendering */}
              <div className="relative aspect-square w-full bg-neutral-950 flex items-center justify-center border-b border-light/5 overflow-hidden group">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    onError={handleImageError}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain select-none bg-neutral-950"
                    alt={`Plano Croquis del troquel ${activeDrawingCode}`}
                  />
                ) : (
                  <div className="text-center p-8 text-neutral-600 select-none flex flex-col items-center">
                    <X className="w-14 h-14 text-neutral-700 mb-3" />
                    <p className="text-sm font-bold text-gray-400">Croquis No Disponible</p>
                    <p className="text-xs text-gray-500 mt-1.5 max-w-xs leading-relaxed">
                      El croquis de imagen "img/{activeDrawingCode}.jpg" no se encuentra en el servidor ni repositorios.
                    </p>
                  </div>
                )}
              </div>

              {/* Schema Proportional Overlay visualization */}
              {(() => {
                const foundItem = baseDatos.find((t) => String(t.Codigo) === activeDrawingCode);
                if (foundItem) {
                  const actAncho = parseFloat(String(foundItem.Ancho)) || 0;
                  const actLargo = parseFloat(String(foundItem.Largo)) || 0;
                  const reqAncho = params.ancho ? parseFloat(params.ancho) : null;
                  const reqLargo = params.largo ? parseFloat(params.largo) : null;

                  // Check if it's currently suggested as rotated
                  const isRotated =
                    reqAncho !== null &&
                    reqLargo !== null &&
                    invertedResults.some((item) => String(item.Codigo) === activeDrawingCode);

                  return (
                    <div className="p-4 bg-neutral-950/40 divide-y divide-white/5 space-y-4">
                      {/* Metric lines info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                        <div className="bg-neutral-900/50 p-2 rounded-xl border border-white/5 flex flex-col justify-center">
                          <span className="block text-[9px] uppercase text-gray-500 font-extrabold select-none">Medidas</span>
                          <span className="font-mono text-orange-400 font-extrabold text-xs sm:text-sm tracking-tighter mt-1 block">
                            {actAncho} × {actLargo} <span className="text-[9px] text-gray-500 font-bold">MM</span>
                          </span>
                        </div>
                        <div className="bg-neutral-900/50 p-2 rounded-xl border border-white/5 flex flex-col justify-center">
                          <span className="block text-[9px] uppercase text-gray-500 font-extrabold select-none">Formato</span>
                          <span className="font-bold text-gray-300 uppercase tracking-wide truncate mt-1 block text-xs">
                            {foundItem.Formato || "S/F"}
                          </span>
                        </div>
                        <div className="bg-neutral-900/50 p-2 rounded-xl border border-white/5 flex flex-col justify-center">
                          <span className="block text-[9px] uppercase text-gray-500 font-extrabold select-none">Carreras</span>
                          <span className="font-mono text-gray-300 font-bold text-sm mt-1 block">
                            {foundItem.Carreras || "-"}
                          </span>
                        </div>
                        <div className="bg-neutral-900/50 p-2 rounded-xl border border-white/5 flex flex-col justify-center">
                          <span className="block text-[9px] uppercase text-gray-500 font-extrabold select-none">Engranaje</span>
                          <span className="font-mono text-amber-400 font-black text-sm mt-1 block">
                            {foundItem.Engranaje && Number(foundItem.Engranaje) > 0 && !(String(foundItem.Formato).toUpperCase().includes("DIGITAL")) ? (
                              <span className="inline-flex items-center gap-1 justify-center">
                                <Cog className="w-3.5 h-3.5 animate-spin-slow text-amber-500" /> z{foundItem.Engranaje}
                              </span>
                            ) : (
                              <span className="text-gray-650 text-xs italic">digital</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Panel de notas de taller personalizables */}
                      <div className="pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-[10px] uppercase text-gray-400 font-extrabold tracking-wider flex items-center gap-1">
                            <span>📋 Notas o etiquetas de taller</span>
                          </label>
                          <span className="text-[9px] text-gray-500 italic">Buscable por palabra clave</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingNote}
                            onChange={(e) => setEditingNote(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveNote();
                              }
                            }}
                            className="flex-1 bg-neutral-950 border border-white/5 focus:border-orange-500/40 text-orange-400 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                            placeholder="Escribe etiquetas, formas (ej: cocardas, banderas) o clientes..."
                          />
                          <button
                            type="button"
                            onClick={handleSaveNote}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Actions Footer */}
              <div className="p-4 bg-neutral-950 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span>CÓDIGO COPIADO</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>COPIAR CÓDIGO</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawingCode(null)}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 rounded-xl text-xs font-black text-white transition-all cursor-pointer"
                >
                  CERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Success Alert toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121212] border border-orange-500/30 text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl shadow-2xl flex items-center gap-2 select-none animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
}
