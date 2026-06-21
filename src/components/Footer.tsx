import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield } from "lucide-react";

export const Footer: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <footer className="w-full flex justify-center items-center py-8 px-4 mt-8 no-print">
        <div className="flex flex-wrap justify-center items-center gap-x-1.5 text-[10px] md:text-[11px] text-gray-400 opacity-75 hover:opacity-100 transition-opacity duration-300">
          <span>
            © {new Date().getFullYear()} | Desarrollado por{" "}
            <span className="font-semibold text-gray-500">GUTEN</span> para{" "}
            <span className="font-semibold text-gray-500">RR</span>.
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="underline cursor-pointer hover:text-gray-700 transition-colors"
          >
            [Términos de Uso y Licencia]
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm px-4"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                      Aviso de Propiedad Intelectual & Licencia de Uso
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium whitespace-pre-wrap">
                  <p>
                    Esta aplicación, su arquitectura de datos y lógica de negocio han sido desarrolladas por Daniel Gandolfo (GUTEN). Se otorga una licencia de uso operativa, interna, no exclusiva y revocable para optimizar los procesos de RR.
                  </p>
                  <p>
                    Queda expresamente prohibida la reproducción total o parcial, la ingeniería inversa, la distribución o la implementación de este software en terceras empresas o emprendimientos ajenos sin la autorización previa y por escrito del autor.
                  </p>
                  <p className="font-bold text-gray-800 border-t border-gray-100 pt-4">
                    La titularidad absoluta del código fuente permanece bajo propiedad intelectual de GUTEN.
                  </p>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
