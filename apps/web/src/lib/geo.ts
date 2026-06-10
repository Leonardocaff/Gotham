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

// Centroides de país del exterior, por código ubigeo nivel-02 de ONPE → [lng, lat].
// Cubre los ~47 países con votos reales (el resto cae al centro de su continente).
export const COUNTRY_CENTROIDS: Record<string, LngLat> = {
  "921300": [-98, 39], // Estados Unidos
  "940900": [-3.7, 40.4], // España
  "921000": [-70.6, -33.4], // Chile
  "941700": [12.5, 41.9], // Italia
  "920200": [-58.4, -34.6], // Argentina
  "920600": [-79.4, 43.7], // Canadá
  "920500": [-46.6, -23.5], // Brasil
  "930700": [139.7, 35.7], // Japón
  "920400": [-68.1, -16.5], // Bolivia
  "940200": [13.4, 52.5], // Alemania
  "921100": [-78.5, -0.2], // Ecuador
  "920700": [-74.1, 4.7], // Colombia
  "942800": [7.4, 46.9], // Suiza
  "950100": [151.2, -33.9], // Australia
  "921900": [-99.1, 19.4], // México
  "940400": [4.4, 50.8], // Bélgica
  "922100": [-79.5, 9.0], // Panamá
  "920800": [-84.1, 9.9], // Costa Rica
  "941200": [-0.1, 51.5], // Gran Bretaña
  "942700": [18.1, 59.3], // Suecia
  "922700": [-56.2, -34.9], // Uruguay
  "941400": [4.9, 52.4], // Holanda
  "922400": [-69.9, 18.5], // República Dominicana
  "920100": [-68.9, 12.1], // Antillas Holandesas
  "922200": [-57.6, -25.3], // Paraguay
  "950200": [174.8, -36.8], // Nueva Zelanda
  "922300": [-66.1, 18.4], // Puerto Rico
  "940300": [16.4, 48.2], // Austria
  "921500": [-90.5, 14.6], // Guatemala
  "930600": [34.8, 32.1], // Israel
  "940800": [12.6, 55.7], // Dinamarca
  "942500": [-9.1, 38.7], // Portugal
  "942000": [6.1, 49.6], // Luxemburgo
  "930200": [116.4, 39.9], // China
  "942900": [37.6, 55.8], // Rusia
  "942300": [10.7, 59.9], // Noruega
  "930100": [127.0, 37.6], // Corea
  "941500": [19.0, 47.5], // Hungría
  "944200": [1.5, 42.5], // Andorra
  "941000": [24.9, 60.2], // Finlandia
  "933700": [55.3, 25.3], // Emiratos Árabes Unidos
  "940600": [14.4, 50.1], // República Checa
  "942400": [21.0, 52.2], // Polonia
  "921200": [-89.2, 13.7], // El Salvador
  "941800": [-6.3, 53.3], // Irlanda
  "922000": [-86.3, 12.1], // Nicaragua
  "921700": [-87.2, 14.1], // Honduras
};

export function countryCentroid(code: string): LngLat | undefined {
  return COUNTRY_CENTROIDS[code];
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
