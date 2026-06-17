/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Troquel {
  Codigo: string | number;
  Formato: string;
  Ancho: string | number;
  Largo: string | number;
  Carreras: string | number;
  [key: string]: string | number; // Fallback for dynamic parsed keys
}

export interface SearchingParams {
  ancho: string;
  largo: string;
  formato: string;
  codigo: string;
  tolerancia: string;
  palabraClave: string;
}
