// Geometry helpers for the globe: accent-insensitive name matching, Peru
// department centroids (marker fallback + polygon join key) and continent
// centroids for the exterior layer.

/** Strip accents + uppercase + collapse whitespace, for robust name joins. */
export function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type LngLat = [number, number];

// Department centroids (lng, lat). Keyed by normalized Spanish name to match
// strata[].name. Used as marker fallback and as the join key when a polygon
// FeatureCollection can be loaded.
export const DEPT_CENTROIDS: Record<string, LngLat> = {
  AMAZONAS: [-78.0, -5.0],
  ANCASH: [-77.6, -9.3],
  APURIMAC: [-72.9, -14.0],
  AREQUIPA: [-72.3, -15.8],
  AYACUCHO: [-74.0, -13.8],
  CAJAMARCA: [-78.5, -6.5],
  CALLAO: [-77.12, -12.05],
  CUSCO: [-72.0, -13.5],
  HUANCAVELICA: [-74.9, -12.9],
  HUANUCO: [-76.1, -9.5],
  ICA: [-75.5, -14.2],
  JUNIN: [-75.0, -11.5],
  "LA LIBERTAD": [-78.3, -7.8],
  LAMBAYEQUE: [-79.8, -6.4],
  LIMA: [-76.6, -11.7],
  LORETO: [-74.3, -4.0],
  "MADRE DE DIOS": [-70.5, -12.0],
  MOQUEGUA: [-70.9, -16.8],
  PASCO: [-75.4, -10.4],
  PIURA: [-80.2, -5.2],
  PUNO: [-70.0, -15.0],
  "SAN MARTIN": [-76.7, -7.0],
  TACNA: [-70.3, -17.6],
  TUMBES: [-80.5, -3.8],
  UCAYALI: [-73.6, -9.5],
};

// Continent centroids (lng, lat) for the exterior layer. Spanish names match
// exteriorByContinent[].name.
export const CONTINENT_CENTROIDS: Record<string, LngLat> = {
  AFRICA: [19.0, 5.0],
  AMERICA: [-95.0, 38.0], // North America bias: bulk of the diaspora pool
  ASIA: [100.0, 34.0],
  EUROPA: [12.0, 48.0],
  OCEANIA: [134.0, -25.0],
};

export function deptCentroid(name: string): LngLat | undefined {
  return DEPT_CENTROIDS[normName(name)];
}

export function continentCentroid(name: string): LngLat | undefined {
  return CONTINENT_CENTROIDS[normName(name)];
}

// Candidate name field names that may appear on a Peru departments GeoJSON.
// We probe these in order to extract a department name from feature.properties.
export const GEOJSON_NAME_FIELDS = [
  "NOMBDEP",
  "nombdep",
  "DEPARTAMEN",
  "departamento",
  "NAME_1",
  "name",
  "NOMBRE",
  "dep",
] as const;

/** Public Peru departments GeoJSON candidates, tried in order at runtime. */
export const PERU_GEOJSON_URLS = [
  "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_departamental_simple.geojson",
  "https://raw.githubusercontent.com/Esri/datasets/master/Peru/peru-departamentos.geojson",
];

export const PERU_CENTER: LngLat = [-74.5, -9.2];
