/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, ChevronDown, ChevronUp, Image, Cog } from "lucide-react";
import { Troquel } from "../types";
import { FormatIndicator } from "../utils/formatHelper";

interface DatabaseGridProps {
  data: Troquel[];
  onSelectTroquel: (troquel: Troquel) => void;
  onViewDrawing: (codigo: string) => void;
  customNotes?: Record<string, string>;
}

type SortField = "Codigo" | "Formato" | "Ancho" | "Largo" | "Carreras" | "Engranaje";
type SortDirection = "asc" | "desc";

export const DatabaseGrid: React.FC<DatabaseGridProps> = ({
  data,
  onSelectTroquel,
  onViewDrawing,
  customNotes = {},
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedFormat, setSelectedFormat] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField>("Codigo");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 12;

  // Derive simple dropdown list of unique formats
  const uniqueFormats = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.Formato) set.add(item.Formato.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [data]);

  // Filter & Search
  const filteredData = React.useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const itemNote = (customNotes[String(item.Codigo)] || "").toLowerCase();
        return (
          String(item.Codigo).toLowerCase().includes(term) ||
          String(item.Formato).toLowerCase().includes(term) ||
          String(item.Ancho).toLowerCase().includes(term) ||
          String(item.Largo).toLowerCase().includes(term) ||
          itemNote.includes(term)
        );
      });
    }

    if (selectedFormat) {
      result = result.filter(
        (item) => (item.Formato || "").trim().toUpperCase() === selectedFormat
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number = a[sortField] ?? "";
      let valB: string | number = b[sortField] ?? "";

      // Try parsing numeric values for Width, Length, Runs, and Gears
      if (sortField === "Ancho" || sortField === "Largo" || sortField === "Carreras" || sortField === "Engranaje") {
        const numA = parseFloat(String(valA)) || 0;
        const numB = parseFloat(String(valB)) || 0;
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // Fallback lexicographical string sort
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, selectedFormat, sortField, sortDirection]);

  // Reset page when queries change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFormat]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="bg-neutral-800/40 backdrop-blur-sm rounded-2xl border border-white/5 p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-300">Explorador de Base de Datos</h4>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Explora las {data.length} fichas sin restricciones de tolerancia
          </p>
        </div>

        {/* Format Select Filter */}
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          className="bg-neutral-900 border border-white/10 text-xs text-gray-300 rounded-lg p-2 focus:border-orange-500 outline-none w-full sm:w-44"
        >
          <option value="">Todos los Formatos</option>
          {uniqueFormats.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Search Inputs */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Buscar por código, medidas, formato..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-neutral-900/60 border border-white/5 focus:border-orange-500 text-sm text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 w-full focus:outline-none transition-colors"
        />
      </div>

      {/* Grid List */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-neutral-900/60 text-gray-400 text-[10px] uppercase font-bold tracking-wider divide-y divide-white/5 select-none">
              <th className="p-3 pl-4 cursor-pointer hover:bg-neutral-900/90 hover:text-white" onClick={() => toggleSort("Codigo")}>
                <div className="flex items-center gap-1">
                  Código
                  {sortField === "Codigo" && (sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-neutral-900/90 hover:text-white" onClick={() => toggleSort("Formato")}>
                <div className="flex items-center gap-1">
                  Formato
                  {sortField === "Formato" && (sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-neutral-900/90 hover:text-white" onClick={() => toggleSort("Ancho")}>
                <div className="flex items-center gap-1">
                  Ancho (mm)
                  {sortField === "Ancho" && (sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-neutral-900/90 hover:text-white" onClick={() => toggleSort("Largo")}>
                <div className="flex items-center gap-1">
                  Largo (mm)
                  {sortField === "Largo" && (sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-neutral-900/90 hover:text-white" onClick={() => toggleSort("Carreras")}>
                <div className="flex items-center gap-1">
                  Carreras
                  {sortField === "Carreras" && (sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-neutral-900/90 hover:text-white" onClick={() => toggleSort("Engranaje")}>
                <div className="flex items-center gap-1">
                  Engranaje
                  {sortField === "Engranaje" && (sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-gray-300">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Ningún troquel coincide con tu búsqueda.
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const codeStr = String(item.Codigo);
                return (
                   <tr
                    key={codeStr}
                    className="hover:bg-neutral-900/40 cursor-pointer group/tr"
                    onClick={() => onSelectTroquel(item)}
                  >
                    <td className="p-3 pl-4 font-bold text-white tracking-widest">
                      <div>{codeStr}</div>
                      {customNotes[codeStr] && (
                        <div className="text-[10px] text-orange-400 font-normal italic max-w-[150px] truncate mt-0.5" title={customNotes[codeStr]}>
                          📋 {customNotes[codeStr]}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <FormatIndicator format={item.Formato} />
                    </td>
                    <td className="p-3 font-mono font-medium text-orange-400">{item.Ancho || 0}</td>
                    <td className="p-3 font-mono font-medium text-orange-400">{item.Largo || 0}</td>
                    <td className="p-3 font-mono font-semibold text-gray-200">{item.Carreras || "-"}</td>
                    <td className="p-3">
                      {item.Engranaje && Number(item.Engranaje) > 0 && !(String(item.Formato).toUpperCase().includes("DIGITAL")) ? (
                        <div className="inline-flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/20 text-amber-400 font-extrabold px-2.5 py-1 rounded-lg font-mono">
                          <Cog className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                          <span>z{item.Engranaje}</span>
                        </div>
                      ) : (
                        <span className="text-gray-650 font-mono italic text-[11px]">digital</span>
                      )}
                    </td>
                    <td className="p-3 text-center justify-center flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Drawing view */}
                      <button
                        onClick={() => onViewDrawing(codeStr)}
                        className="p-1.5 rounded-lg border bg-neutral-900 border-white/5 text-gray-400 hover:text-orange-500 hover:border-orange-500/30 transition-colors"
                        title="Ver Plano/Croquis"
                      >
                        <Image className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 select-none">
          <span>
            Mostrando pág. <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (
            <strong>{filteredData.length}</strong> troqueles)
          </span>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
              className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-white/5 px-2.5 py-1 rounded text-white transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
              className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-neutral-900 border border-white/5 px-2.5 py-1 rounded text-white transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
