/**
 * Referencia territorial para la vista cartografica. Las coordenadas son las de la CAPITAL de cada
 * departamento (dato de referencia, no la posicion de cada equipo): sirven para ubicar la zona en el
 * esquema, no para geolocalizar un instrumento.
 */
export interface ZonaReferencia {
  clave: string;
  nombre: string;
  lat: number;
  lng: number;
  /** Nombres (normalizados) con los que se reconoce la zona. */
  alias: string[];
}

export const SIN_UBICACION = 'No registrado';

/** Minusculas, sin tildes ni signos: "Bogotá D.C." -> "bogota d c". */
export const normalizarTexto = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const ZONAS: ZonaReferencia[] = [
  { clave: 'bogota', nombre: 'Bogotá D.C. y Cundinamarca', lat: 4.711, lng: -74.0721, alias: ['bogota', 'bogota d c', 'cundinamarca', 'bogota cundinamarca'] },
  { clave: 'amazonas', nombre: 'Amazonas', lat: -4.2153, lng: -69.9406, alias: ['amazonas'] },
  { clave: 'antioquia', nombre: 'Antioquia', lat: 6.2442, lng: -75.5812, alias: ['antioquia'] },
  { clave: 'arauca', nombre: 'Arauca', lat: 7.0847, lng: -70.7591, alias: ['arauca'] },
  { clave: 'atlantico', nombre: 'Atlántico', lat: 10.9685, lng: -74.7813, alias: ['atlantico'] },
  { clave: 'bolivar', nombre: 'Bolívar', lat: 10.391, lng: -75.4794, alias: ['bolivar'] },
  { clave: 'boyaca', nombre: 'Boyacá', lat: 5.5353, lng: -73.3678, alias: ['boyaca'] },
  { clave: 'caldas', nombre: 'Caldas', lat: 5.0703, lng: -75.5138, alias: ['caldas'] },
  { clave: 'caqueta', nombre: 'Caquetá', lat: 1.6144, lng: -75.6062, alias: ['caqueta'] },
  { clave: 'casanare', nombre: 'Casanare', lat: 5.3378, lng: -72.3959, alias: ['casanare'] },
  { clave: 'cauca', nombre: 'Cauca', lat: 2.4448, lng: -76.6147, alias: ['cauca'] },
  { clave: 'cesar', nombre: 'Cesar', lat: 10.4631, lng: -73.2532, alias: ['cesar'] },
  { clave: 'choco', nombre: 'Chocó', lat: 5.6947, lng: -76.6583, alias: ['choco'] },
  { clave: 'cordoba', nombre: 'Córdoba', lat: 8.7479, lng: -75.8814, alias: ['cordoba'] },
  { clave: 'guainia', nombre: 'Guainía', lat: 3.8653, lng: -67.9239, alias: ['guainia'] },
  { clave: 'guaviare', nombre: 'Guaviare', lat: 2.5729, lng: -72.6459, alias: ['guaviare'] },
  { clave: 'huila', nombre: 'Huila', lat: 2.9273, lng: -75.2819, alias: ['huila'] },
  { clave: 'la-guajira', nombre: 'La Guajira', lat: 11.5444, lng: -72.9072, alias: ['la guajira', 'guajira'] },
  { clave: 'magdalena', nombre: 'Magdalena', lat: 11.2408, lng: -74.199, alias: ['magdalena'] },
  { clave: 'meta', nombre: 'Meta', lat: 4.142, lng: -73.6266, alias: ['meta'] },
  { clave: 'narino', nombre: 'Nariño', lat: 1.2136, lng: -77.2811, alias: ['narino'] },
  { clave: 'norte-de-santander', nombre: 'Norte de Santander', lat: 7.8939, lng: -72.5078, alias: ['norte de santander'] },
  { clave: 'putumayo', nombre: 'Putumayo', lat: 1.1478, lng: -76.6475, alias: ['putumayo'] },
  { clave: 'quindio', nombre: 'Quindío', lat: 4.5339, lng: -75.6811, alias: ['quindio'] },
  { clave: 'risaralda', nombre: 'Risaralda', lat: 4.8133, lng: -75.6961, alias: ['risaralda'] },
  { clave: 'san-andres', nombre: 'San Andrés y Providencia', lat: 12.5847, lng: -81.7006, alias: ['san andres', 'san andres y providencia', 'san andres providencia'] },
  { clave: 'santander', nombre: 'Santander', lat: 7.1254, lng: -73.1198, alias: ['santander'] },
  { clave: 'sucre', nombre: 'Sucre', lat: 9.3047, lng: -75.3978, alias: ['sucre'] },
  { clave: 'tolima', nombre: 'Tolima', lat: 4.4389, lng: -75.2322, alias: ['tolima'] },
  { clave: 'valle', nombre: 'Valle del Cauca', lat: 3.4516, lng: -76.532, alias: ['valle del cauca', 'valle'] },
  { clave: 'vaupes', nombre: 'Vaupés', lat: 1.2536, lng: -70.2339, alias: ['vaupes'] },
  { clave: 'vichada', nombre: 'Vichada', lat: 6.189, lng: -67.4859, alias: ['vichada'] },
];

/** Zona de referencia para un nombre de departamento, o undefined si no se reconoce. */
export function buscarZona(departamento: string): ZonaReferencia | undefined {
  const n = normalizarTexto(departamento);
  if (!n) return undefined;
  return ZONAS.find((z) => z.alias.includes(n));
}

export interface ZonaDeEquipo {
  clave: string;
  nombre: string;
  lat?: number;
  lng?: number;
}

/** Zona a la que pertenece un departamento. Sin dato -> "sin-ubicacion"; no reconocido -> su propio nombre. */
export function zonaDeDepartamento(departamento: string | undefined | null): ZonaDeEquipo {
  const dep = (departamento || '').trim();
  if (!dep || dep === SIN_UBICACION) return { clave: 'sin-ubicacion', nombre: 'Sin ubicación registrada' };
  const ref = buscarZona(dep);
  if (ref) return { clave: ref.clave, nombre: ref.nombre, lat: ref.lat, lng: ref.lng };
  return { clave: `otro-${normalizarTexto(dep)}`, nombre: dep };
}

/** Codigos DANE de los poligonos (departamentos) que componen cada zona. */
export const DANE_POR_ZONA: Record<string, string[]> = {
  bogota: ['11', '25'],
  antioquia: ['05'],
  atlantico: ['08'],
  bolivar: ['13'],
  boyaca: ['15'],
  caldas: ['17'],
  caqueta: ['18'],
  cauca: ['19'],
  cesar: ['20'],
  cordoba: ['23'],
  choco: ['27'],
  huila: ['41'],
  'la-guajira': ['44'],
  magdalena: ['47'],
  meta: ['50'],
  narino: ['52'],
  'norte-de-santander': ['54'],
  quindio: ['63'],
  risaralda: ['66'],
  santander: ['68'],
  sucre: ['70'],
  tolima: ['73'],
  valle: ['76'],
  arauca: ['81'],
  casanare: ['85'],
  putumayo: ['86'],
  'san-andres': ['88'],
  amazonas: ['91'],
  guainia: ['94'],
  guaviare: ['95'],
  vaupes: ['97'],
  vichada: ['99'],
};
