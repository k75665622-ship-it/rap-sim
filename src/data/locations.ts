// Location data — edit this file to add more countries/cities, no code changes needed.
//
// `sceneSize` drives how many NPCs the generator spins up for that country.
// It is deliberately NOT proportional to raw population — it reflects the size of
// the *music scene* the game simulates, which is why Nigeria (huge) and the UK
// (small population, enormous scene) both punch above their weight.

export interface City {
  name: string;
  population: number; // affects fan pool size
  fanPool: number; // available fans in this city
}

export interface Country {
  name: string;
  continent: string;
  cities: City[];
  localChartName: string;
  certificationThresholds: {
    silver: number;
    gold: number;
    platinum: number;
    diamond: number;
    legendary: number;
  };
  currency: string;
  awardName: string;
  /** How many NPCs this country's scene supports. */
  sceneSize: number;
}

export const LOCATIONS: Country[] = [
  // ─── AFRICA ──────────────────────────────────────────────────────────
  {
    name: 'Ghana',
    continent: 'Africa',
    cities: [
      { name: 'Accra', population: 2_500_000, fanPool: 500_000 },
      { name: 'Kumasi', population: 2_000_000, fanPool: 400_000 },
      { name: 'Tema', population: 1_000_000, fanPool: 200_000 },
      { name: 'Takoradi', population: 800_000, fanPool: 150_000 },
      { name: 'Tamale', population: 700_000, fanPool: 120_000 },
      { name: 'Cape Coast', population: 400_000, fanPool: 90_000 },
    ],
    localChartName: 'Ghana Boomplay Top 10',
    certificationThresholds: { silver: 10_000, gold: 50_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'GHS',
    awardName: 'Ghana Music Awards',
    sceneSize: 420,
  },
  {
    name: 'Nigeria',
    continent: 'Africa',
    cities: [
      { name: 'Lagos', population: 15_000_000, fanPool: 3_000_000 },
      { name: 'Abuja', population: 3_500_000, fanPool: 700_000 },
      { name: 'Ibadan', population: 3_000_000, fanPool: 600_000 },
      { name: 'Port Harcourt', population: 2_000_000, fanPool: 450_000 },
      { name: 'Kano', population: 4_000_000, fanPool: 500_000 },
      { name: 'Benin City', population: 1_800_000, fanPool: 380_000 },
    ],
    localChartName: 'Nigeria TurnTable Top 10',
    certificationThresholds: { silver: 25_000, gold: 100_000, platinum: 500_000, diamond: 5_000_000, legendary: 50_000_000 },
    currency: 'NGN',
    awardName: 'Headies Award',
    sceneSize: 650,
  },
  {
    name: 'South Africa',
    continent: 'Africa',
    cities: [
      { name: 'Johannesburg', population: 5_500_000, fanPool: 1_000_000 },
      { name: 'Cape Town', population: 4_500_000, fanPool: 800_000 },
      { name: 'Durban', population: 3_500_000, fanPool: 600_000 },
      { name: 'Pretoria', population: 2_500_000, fanPool: 450_000 },
    ],
    localChartName: 'SA Hip-Hop Top 10',
    certificationThresholds: { silver: 15_000, gold: 75_000, platinum: 150_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'ZAR',
    awardName: 'South African Music Award',
    sceneSize: 320,
  },
  {
    name: 'Kenya',
    continent: 'Africa',
    cities: [
      { name: 'Nairobi', population: 4_500_000, fanPool: 700_000 },
      { name: 'Mombasa', population: 1_200_000, fanPool: 200_000 },
      { name: 'Kisumu', population: 600_000, fanPool: 110_000 },
    ],
    localChartName: 'Kenya Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'KES',
    awardName: 'Kisima Award',
    sceneSize: 200,
  },
  {
    name: 'Tanzania',
    continent: 'Africa',
    cities: [
      { name: 'Dar es Salaam', population: 5_000_000, fanPool: 600_000 },
      { name: 'Dodoma', population: 500_000, fanPool: 90_000 },
      { name: 'Arusha', population: 400_000, fanPool: 80_000 },
    ],
    localChartName: 'Tanzania Top 10',
    certificationThresholds: { silver: 8_000, gold: 35_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'TZS',
    awardName: 'Tanzania Music Awards',
    sceneSize: 170,
  },
  {
    name: 'Ivory Coast',
    continent: 'Africa',
    cities: [
      { name: 'Abidjan', population: 5_000_000, fanPool: 550_000 },
      { name: 'Yamoussoukro', population: 400_000, fanPool: 70_000 },
      { name: 'Bouake', population: 700_000, fanPool: 100_000 },
    ],
    localChartName: 'Côte d’Ivoire Top 10',
    certificationThresholds: { silver: 8_000, gold: 30_000, platinum: 70_000, diamond: 700_000, legendary: 7_000_000 },
    currency: 'XOF',
    awardName: 'Primud Award',
    sceneSize: 150,
  },
  {
    name: 'Senegal',
    continent: 'Africa',
    cities: [
      { name: 'Dakar', population: 3_000_000, fanPool: 350_000 },
      { name: 'Touba', population: 1_000_000, fanPool: 120_000 },
      { name: 'Thiès', population: 400_000, fanPool: 60_000 },
    ],
    localChartName: 'Senegal Top 10',
    certificationThresholds: { silver: 6_000, gold: 25_000, platinum: 60_000, diamond: 600_000, legendary: 6_000_000 },
    currency: 'XOF',
    awardName: 'Senegal Music Awards',
    sceneSize: 120,
  },
  {
    name: 'Ethiopia',
    continent: 'Africa',
    cities: [
      { name: 'Addis Ababa', population: 5_000_000, fanPool: 400_000 },
      { name: 'Dire Dawa', population: 500_000, fanPool: 70_000 },
      { name: 'Mekelle', population: 500_000, fanPool: 65_000 },
    ],
    localChartName: 'Ethiopia Top 10',
    certificationThresholds: { silver: 5_000, gold: 20_000, platinum: 50_000, diamond: 500_000, legendary: 5_000_000 },
    currency: 'ETB',
    awardName: 'Ethiopian Music Awards',
    sceneSize: 110,
  },
  {
    name: 'Egypt',
    continent: 'Africa',
    cities: [
      { name: 'Cairo', population: 10_000_000, fanPool: 800_000 },
      { name: 'Alexandria', population: 5_500_000, fanPool: 400_000 },
      { name: 'Giza', population: 4_000_000, fanPool: 300_000 },
    ],
    localChartName: 'Egypt Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'EGP',
    awardName: 'Egypt Music Awards',
    sceneSize: 140,
  },
  {
    name: 'Morocco',
    continent: 'Africa',
    cities: [
      { name: 'Casablanca', population: 3_500_000, fanPool: 250_000 },
      { name: 'Rabat', population: 1_800_000, fanPool: 140_000 },
      { name: 'Marrakesh', population: 1_000_000, fanPool: 90_000 },
    ],
    localChartName: 'Morocco Top 10',
    certificationThresholds: { silver: 8_000, gold: 30_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'MAD',
    awardName: 'Moroccan Music Awards',
    sceneSize: 100,
  },

  // ─── NORTH AMERICA ───────────────────────────────────────────────────
  {
    name: 'USA',
    continent: 'North America',
    cities: [
      { name: 'Atlanta', population: 500_000, fanPool: 5_000_000 },
      { name: 'New York', population: 8_000_000, fanPool: 10_000_000 },
      { name: 'Los Angeles', population: 4_000_000, fanPool: 8_000_000 },
      { name: 'Chicago', population: 2_700_000, fanPool: 4_000_000 },
      { name: 'Houston', population: 2_300_000, fanPool: 3_500_000 },
      { name: 'Miami', population: 450_000, fanPool: 3_000_000 },
      { name: 'Detroit', population: 640_000, fanPool: 1_800_000 },
      { name: 'Memphis', population: 630_000, fanPool: 1_500_000 },
    ],
    localChartName: 'Billboard Hot 10',
    certificationThresholds: { silver: 500_000, gold: 1_000_000, platinum: 1_000_000, diamond: 10_000_000, legendary: 100_000_000 },
    currency: 'USD',
    awardName: 'Grammy Award',
    sceneSize: 600,
  },
  {
    name: 'Canada',
    continent: 'North America',
    cities: [
      { name: 'Toronto', population: 2_800_000, fanPool: 3_000_000 },
      { name: 'Vancouver', population: 675_000, fanPool: 1_500_000 },
      { name: 'Montreal', population: 1_700_000, fanPool: 2_000_000 },
      { name: 'Calgary', population: 1_300_000, fanPool: 900_000 },
    ],
    localChartName: 'Canadian Hot 10',
    certificationThresholds: { silver: 40_000, gold: 80_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'CAD',
    awardName: 'Juno Award',
    sceneSize: 180,
  },
  {
    name: 'Jamaica',
    continent: 'North America',
    cities: [
      { name: 'Kingston', population: 600_000, fanPool: 400_000 },
      { name: 'Montego Bay', population: 110_000, fanPool: 120_000 },
      { name: 'Spanish Town', population: 150_000, fanPool: 90_000 },
    ],
    localChartName: 'Jamaica Top 10',
    certificationThresholds: { silver: 5_000, gold: 20_000, platinum: 50_000, diamond: 500_000, legendary: 5_000_000 },
    currency: 'JMD',
    awardName: 'Jamaican Music Awards',
    sceneSize: 150,
  },
  {
    name: 'Mexico',
    continent: 'North America',
    cities: [
      { name: 'Mexico City', population: 9_000_000, fanPool: 900_000 },
      { name: 'Guadalajara', population: 1_500_000, fanPool: 250_000 },
      { name: 'Monterrey', population: 1_100_000, fanPool: 220_000 },
    ],
    localChartName: 'Mexico Top 10',
    certificationThresholds: { silver: 30_000, gold: 90_000, platinum: 200_000, diamond: 2_000_000, legendary: 20_000_000 },
    currency: 'MXN',
    awardName: 'Premios Juventud',
    sceneSize: 170,
  },

  // ─── EUROPE ──────────────────────────────────────────────────────────
  {
    name: 'UK',
    continent: 'Europe',
    cities: [
      { name: 'London', population: 9_000_000, fanPool: 8_000_000 },
      { name: 'Manchester', population: 550_000, fanPool: 2_000_000 },
      { name: 'Birmingham', population: 1_100_000, fanPool: 3_000_000 },
      { name: 'Bristol', population: 460_000, fanPool: 1_200_000 },
      { name: 'Leeds', population: 790_000, fanPool: 1_200_000 },
    ],
    localChartName: 'UK Official Singles Top 10',
    certificationThresholds: { silver: 200_000, gold: 400_000, platinum: 600_000, diamond: 3_000_000, legendary: 30_000_000 },
    currency: 'GBP',
    awardName: 'BRIT Award',
    sceneSize: 400,
  },
  {
    name: 'France',
    continent: 'Europe',
    cities: [
      { name: 'Paris', population: 2_100_000, fanPool: 2_500_000 },
      { name: 'Marseille', population: 870_000, fanPool: 900_000 },
      { name: 'Lyon', population: 520_000, fanPool: 600_000 },
      { name: 'Lille', population: 230_000, fanPool: 400_000 },
    ],
    localChartName: 'France Top 10',
    certificationThresholds: { silver: 75_000, gold: 150_000, platinum: 300_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'EUR',
    awardName: 'Victoires de la Musique',
    sceneSize: 260,
  },
  {
    name: 'Germany',
    continent: 'Europe',
    cities: [
      { name: 'Berlin', population: 3_700_000, fanPool: 1_600_000 },
      { name: 'Hamburg', population: 1_800_000, fanPool: 800_000 },
      { name: 'Munich', population: 1_500_000, fanPool: 700_000 },
      { name: 'Cologne', population: 1_100_000, fanPool: 550_000 },
    ],
    localChartName: 'Germany Top 10',
    certificationThresholds: { silver: 100_000, gold: 200_000, platinum: 400_000, diamond: 2_000_000, legendary: 20_000_000 },
    currency: 'EUR',
    awardName: 'Echo Award',
    sceneSize: 230,
  },
  {
    name: 'Netherlands',
    continent: 'Europe',
    cities: [
      { name: 'Amsterdam', population: 900_000, fanPool: 600_000 },
      { name: 'Rotterdam', population: 650_000, fanPool: 500_000 },
      { name: 'The Hague', population: 550_000, fanPool: 350_000 },
    ],
    localChartName: 'Netherlands Top 10',
    certificationThresholds: { silver: 30_000, gold: 75_000, platinum: 150_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'EUR',
    awardName: 'Edison Award',
    sceneSize: 150,
  },
  {
    name: 'Sweden',
    continent: 'Europe',
    cities: [
      { name: 'Stockholm', population: 980_000, fanPool: 700_000 },
      { name: 'Gothenburg', population: 580_000, fanPool: 400_000 },
      { name: 'Malmö', population: 350_000, fanPool: 280_000 },
    ],
    localChartName: 'Sweden Top 10',
    certificationThresholds: { silver: 20_000, gold: 40_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'SEK',
    awardName: 'Grammis Award',
    sceneSize: 130,
  },
  {
    name: 'Ireland',
    continent: 'Europe',
    cities: [
      { name: 'Dublin', population: 580_000, fanPool: 450_000 },
      { name: 'Cork', population: 210_000, fanPool: 180_000 },
      { name: 'Limerick', population: 100_000, fanPool: 90_000 },
    ],
    localChartName: 'Ireland Top 10',
    certificationThresholds: { silver: 7_500, gold: 15_000, platinum: 30_000, diamond: 300_000, legendary: 3_000_000 },
    currency: 'EUR',
    awardName: 'Choice Music Prize',
    sceneSize: 90,
  },

  // ─── LATIN AMERICA ───────────────────────────────────────────────────
  {
    name: 'Brazil',
    continent: 'South America',
    cities: [
      { name: 'São Paulo', population: 12_000_000, fanPool: 1_800_000 },
      { name: 'Rio de Janeiro', population: 6_700_000, fanPool: 1_200_000 },
      { name: 'Salvador', population: 2_900_000, fanPool: 600_000 },
      { name: 'Belo Horizonte', population: 2_500_000, fanPool: 500_000 },
    ],
    localChartName: 'Brazil Top 10',
    certificationThresholds: { silver: 40_000, gold: 80_000, platinum: 160_000, diamond: 1_600_000, legendary: 16_000_000 },
    currency: 'BRL',
    awardName: 'Prêmio Multishow',
    sceneSize: 260,
  },
  {
    name: 'Colombia',
    continent: 'South America',
    cities: [
      { name: 'Bogotá', population: 7_400_000, fanPool: 700_000 },
      { name: 'Medellín', population: 2_500_000, fanPool: 400_000 },
      { name: 'Cali', population: 2_200_000, fanPool: 350_000 },
    ],
    localChartName: 'Colombia Top 10',
    certificationThresholds: { silver: 20_000, gold: 60_000, platinum: 120_000, diamond: 1_200_000, legendary: 12_000_000 },
    currency: 'COP',
    awardName: 'Premios Nuestra Tierra',
    sceneSize: 180,
  },
  {
    name: 'Puerto Rico',
    continent: 'North America',
    cities: [
      { name: 'San Juan', population: 340_000, fanPool: 400_000 },
      { name: 'Bayamón', population: 200_000, fanPool: 200_000 },
      { name: 'Ponce', population: 130_000, fanPool: 140_000 },
    ],
    localChartName: 'Puerto Rico Top 10',
    certificationThresholds: { silver: 15_000, gold: 40_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'USD',
    awardName: 'Premios Tu Música Urbano',
    sceneSize: 150,
  },

  // ─── ASIA & OCEANIA ──────────────────────────────────────────────────
  {
    name: 'India',
    continent: 'Asia',
    cities: [
      { name: 'Mumbai', population: 12_500_000, fanPool: 1_500_000 },
      { name: 'Delhi', population: 11_000_000, fanPool: 1_300_000 },
      { name: 'Bangalore', population: 8_400_000, fanPool: 900_000 },
      { name: 'Hyderabad', population: 6_800_000, fanPool: 700_000 },
    ],
    localChartName: 'India Top 10',
    certificationThresholds: { silver: 20_000, gold: 60_000, platinum: 150_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'INR',
    awardName: 'Filmfare Music Award',
    sceneSize: 280,
  },
  {
    name: 'Japan',
    continent: 'Asia',
    cities: [
      { name: 'Tokyo', population: 14_000_000, fanPool: 2_000_000 },
      { name: 'Osaka', population: 2_700_000, fanPool: 600_000 },
      { name: 'Nagoya', population: 2_300_000, fanPool: 450_000 },
    ],
    localChartName: 'Japan Hot 10',
    certificationThresholds: { silver: 100_000, gold: 250_000, platinum: 500_000, diamond: 3_000_000, legendary: 30_000_000 },
    currency: 'JPY',
    awardName: 'Japan Gold Disc Award',
    sceneSize: 230,
  },
  {
    name: 'South Korea',
    continent: 'Asia',
    cities: [
      { name: 'Seoul', population: 9_700_000, fanPool: 1_800_000 },
      { name: 'Busan', population: 3_400_000, fanPool: 450_000 },
      { name: 'Incheon', population: 3_000_000, fanPool: 400_000 },
    ],
    localChartName: 'Korea Top 10',
    certificationThresholds: { silver: 50_000, gold: 150_000, platinum: 300_000, diamond: 2_000_000, legendary: 20_000_000 },
    currency: 'KRW',
    awardName: 'MAMA Award',
    sceneSize: 250,
  },
  {
    name: 'Australia',
    continent: 'Oceania',
    cities: [
      { name: 'Sydney', population: 5_300_000, fanPool: 1_100_000 },
      { name: 'Melbourne', population: 5_000_000, fanPool: 1_000_000 },
      { name: 'Brisbane', population: 2_500_000, fanPool: 500_000 },
    ],
    localChartName: 'ARIA Top 10',
    certificationThresholds: { silver: 35_000, gold: 70_000, platinum: 140_000, diamond: 1_400_000, legendary: 14_000_000 },
    currency: 'AUD',
    awardName: 'ARIA Award',
    sceneSize: 150,
  },
  {
    name: 'New Zealand',
    continent: 'Oceania',
    cities: [
      { name: 'Auckland', population: 1_700_000, fanPool: 400_000 },
      { name: 'Wellington', population: 215_000, fanPool: 130_000 },
      { name: 'Christchurch', population: 400_000, fanPool: 150_000 },
    ],
    localChartName: 'NZ Top 10',
    certificationThresholds: { silver: 7_500, gold: 15_000, platinum: 30_000, diamond: 300_000, legendary: 3_000_000 },
    currency: 'NZD',
    awardName: 'Aotearoa Music Award',
    sceneSize: 85,
  },

  // ─── AFRICA (additional) ─────────────────────────────────────────────
  {
    name: 'Cameroon',
    continent: 'Africa',
    cities: [
      { name: 'Douala', population: 3_000_000, fanPool: 420_000 },
      { name: 'Yaoundé', population: 2_800_000, fanPool: 380_000 },
      { name: 'Bamenda', population: 500_000, fanPool: 90_000 },
      { name: 'Bafoussam', population: 400_000, fanPool: 70_000 },
    ],
    localChartName: 'Camer Top 10',
    certificationThresholds: { silver: 8_000, gold: 30_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'XAF',
    awardName: 'Canal 2 d\'Or',
    sceneSize: 160,
  },
  {
    name: 'DR Congo',
    continent: 'Africa',
    cities: [
      { name: 'Kinshasa', population: 15_000_000, fanPool: 1_200_000 },
      { name: 'Lubumbashi', population: 2_500_000, fanPool: 280_000 },
      { name: 'Goma', population: 1_000_000, fanPool: 140_000 },
      { name: 'Mbuji-Mayi', population: 2_000_000, fanPool: 190_000 },
    ],
    localChartName: 'Congo Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 110_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'CDF',
    awardName: 'Congo Music Award',
    sceneSize: 190,
  },
  {
    name: 'Uganda',
    continent: 'Africa',
    cities: [
      { name: 'Kampala', population: 3_600_000, fanPool: 500_000 },
      { name: 'Gulu', population: 250_000, fanPool: 50_000 },
      { name: 'Mbarara', population: 300_000, fanPool: 60_000 },
      { name: 'Jinja', population: 200_000, fanPool: 40_000 },
    ],
    localChartName: 'Uganda Top 10',
    certificationThresholds: { silver: 6_000, gold: 25_000, platinum: 60_000, diamond: 600_000, legendary: 6_000_000 },
    currency: 'UGX',
    awardName: 'Uganda Music Award',
    sceneSize: 150,
  },
  {
    name: 'Zambia',
    continent: 'Africa',
    cities: [
      { name: 'Lusaka', population: 3_000_000, fanPool: 380_000 },
      { name: 'Kitwe', population: 700_000, fanPool: 110_000 },
      { name: 'Ndola', population: 600_000, fanPool: 95_000 },
    ],
    localChartName: 'Zambia Top 10',
    certificationThresholds: { silver: 5_000, gold: 20_000, platinum: 50_000, diamond: 500_000, legendary: 5_000_000 },
    currency: 'ZMW',
    awardName: 'Born n Bred Award',
    sceneSize: 100,
  },
  {
    name: 'Zimbabwe',
    continent: 'Africa',
    cities: [
      { name: 'Harare', population: 2_100_000, fanPool: 300_000 },
      { name: 'Bulawayo', population: 700_000, fanPool: 110_000 },
      { name: 'Mutare', population: 200_000, fanPool: 40_000 },
    ],
    localChartName: 'Zim Top 10',
    certificationThresholds: { silver: 4_000, gold: 18_000, platinum: 45_000, diamond: 450_000, legendary: 4_500_000 },
    currency: 'USD',
    awardName: 'Zimbabwe Music Award',
    sceneSize: 95,
  },
  {
    name: 'Angola',
    continent: 'Africa',
    cities: [
      { name: 'Luanda', population: 8_900_000, fanPool: 900_000 },
      { name: 'Huambo', population: 700_000, fanPool: 100_000 },
      { name: 'Benguela', population: 600_000, fanPool: 85_000 },
    ],
    localChartName: 'Angola Top 10',
    certificationThresholds: { silver: 6_000, gold: 25_000, platinum: 65_000, diamond: 650_000, legendary: 6_500_000 },
    currency: 'AOA',
    awardName: 'Angola Music Award',
    sceneSize: 120,
  },
  {
    name: 'Mozambique',
    continent: 'Africa',
    cities: [
      { name: 'Maputo', population: 1_200_000, fanPool: 200_000 },
      { name: 'Matola', population: 1_000_000, fanPool: 150_000 },
      { name: 'Beira', population: 550_000, fanPool: 85_000 },
    ],
    localChartName: 'Moz Top 10',
    certificationThresholds: { silver: 4_000, gold: 16_000, platinum: 40_000, diamond: 400_000, legendary: 4_000_000 },
    currency: 'MZN',
    awardName: 'Ngoma Award',
    sceneSize: 85,
  },
  {
    name: 'Mali',
    continent: 'Africa',
    cities: [
      { name: 'Bamako', population: 2_800_000, fanPool: 340_000 },
      { name: 'Sikasso', population: 400_000, fanPool: 60_000 },
      { name: 'Mopti', population: 200_000, fanPool: 35_000 },
    ],
    localChartName: 'Mali Top 10',
    certificationThresholds: { silver: 4_000, gold: 15_000, platinum: 38_000, diamond: 380_000, legendary: 3_800_000 },
    currency: 'XOF',
    awardName: 'Tamani Award',
    sceneSize: 90,
  },
  {
    name: 'Burkina Faso',
    continent: 'Africa',
    cities: [
      { name: 'Ouagadougou', population: 2_600_000, fanPool: 300_000 },
      { name: 'Bobo-Dioulasso', population: 900_000, fanPool: 120_000 },
    ],
    localChartName: 'Faso Top 10',
    certificationThresholds: { silver: 3_500, gold: 14_000, platinum: 35_000, diamond: 350_000, legendary: 3_500_000 },
    currency: 'XOF',
    awardName: 'Faso Music Award',
    sceneSize: 75,
  },
  {
    name: 'Rwanda',
    continent: 'Africa',
    cities: [
      { name: 'Kigali', population: 1_200_000, fanPool: 180_000 },
      { name: 'Butare', population: 300_000, fanPool: 50_000 },
      { name: 'Gisenyi', population: 250_000, fanPool: 40_000 },
    ],
    localChartName: 'Rwanda Top 10',
    certificationThresholds: { silver: 3_500, gold: 14_000, platinum: 35_000, diamond: 350_000, legendary: 3_500_000 },
    currency: 'RWF',
    awardName: 'Rwanda Music Award',
    sceneSize: 80,
  },
  {
    name: 'Botswana',
    continent: 'Africa',
    cities: [
      { name: 'Gaborone', population: 270_000, fanPool: 60_000 },
      { name: 'Francistown', population: 100_000, fanPool: 25_000 },
    ],
    localChartName: 'Bots Top 10',
    certificationThresholds: { silver: 3_000, gold: 12_000, platinum: 30_000, diamond: 300_000, legendary: 3_000_000 },
    currency: 'BWP',
    awardName: 'BOMU Award',
    sceneSize: 55,
  },
  {
    name: 'Namibia',
    continent: 'Africa',
    cities: [
      { name: 'Windhoek', population: 430_000, fanPool: 80_000 },
      { name: 'Walvis Bay', population: 80_000, fanPool: 20_000 },
      { name: 'Swakopmund', population: 60_000, fanPool: 15_000 },
    ],
    localChartName: 'Nam Top 10',
    certificationThresholds: { silver: 2_500, gold: 10_000, platinum: 25_000, diamond: 250_000, legendary: 2_500_000 },
    currency: 'NAD',
    awardName: 'Namibian Music Award',
    sceneSize: 50,
  },
  {
    name: 'Tunisia',
    continent: 'Africa',
    cities: [
      { name: 'Tunis', population: 2_400_000, fanPool: 280_000 },
      { name: 'Sfax', population: 600_000, fanPool: 80_000 },
      { name: 'Sousse', population: 400_000, fanPool: 55_000 },
    ],
    localChartName: 'Tunisia Top 10',
    certificationThresholds: { silver: 4_000, gold: 16_000, platinum: 40_000, diamond: 400_000, legendary: 4_000_000 },
    currency: 'TND',
    awardName: 'Tunisian Music Award',
    sceneSize: 85,
  },
  {
    name: 'Algeria',
    continent: 'Africa',
    cities: [
      { name: 'Algiers', population: 3_900_000, fanPool: 400_000 },
      { name: 'Oran', population: 1_500_000, fanPool: 170_000 },
      { name: 'Constantine', population: 450_000, fanPool: 60_000 },
    ],
    localChartName: 'Algeria Top 10',
    certificationThresholds: { silver: 5_000, gold: 20_000, platinum: 50_000, diamond: 500_000, legendary: 5_000_000 },
    currency: 'DZD',
    awardName: 'Algerian Music Award',
    sceneSize: 100,
  },

  // ─── MIDDLE EAST ─────────────────────────────────────────────────────
  {
    name: 'UAE',
    continent: 'Middle East',
    cities: [
      { name: 'Dubai', population: 3_600_000, fanPool: 600_000 },
      { name: 'Abu Dhabi', population: 1_500_000, fanPool: 250_000 },
      { name: 'Sharjah', population: 1_800_000, fanPool: 200_000 },
    ],
    localChartName: 'Gulf Top 10',
    certificationThresholds: { silver: 8_000, gold: 35_000, platinum: 90_000, diamond: 900_000, legendary: 9_000_000 },
    currency: 'AED',
    awardName: 'Gulf Music Award',
    sceneSize: 130,
  },
  {
    name: 'Saudi Arabia',
    continent: 'Middle East',
    cities: [
      { name: 'Riyadh', population: 8_000_000, fanPool: 700_000 },
      { name: 'Jeddah', population: 4_700_000, fanPool: 450_000 },
      { name: 'Dammam', population: 1_500_000, fanPool: 180_000 },
    ],
    localChartName: 'Saudi Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'SAR',
    awardName: 'Saudi Music Award',
    sceneSize: 110,
  },

  // ─── EUROPE (additional) ─────────────────────────────────────────────
  {
    name: 'Spain',
    continent: 'Europe',
    cities: [
      { name: 'Madrid', population: 6_700_000, fanPool: 800_000 },
      { name: 'Barcelona', population: 5_600_000, fanPool: 700_000 },
      { name: 'Seville', population: 1_500_000, fanPool: 180_000 },
      { name: 'Valencia', population: 1_600_000, fanPool: 190_000 },
    ],
    localChartName: 'Spain Top 10',
    certificationThresholds: { silver: 20_000, gold: 80_000, platinum: 200_000, diamond: 2_000_000, legendary: 20_000_000 },
    currency: 'EUR',
    awardName: 'Premios de la Música',
    sceneSize: 230,
  },
  {
    name: 'Italy',
    continent: 'Europe',
    cities: [
      { name: 'Milan', population: 3_200_000, fanPool: 400_000 },
      { name: 'Rome', population: 4_300_000, fanPool: 500_000 },
      { name: 'Naples', population: 3_000_000, fanPool: 330_000 },
      { name: 'Turin', population: 1_800_000, fanPool: 200_000 },
    ],
    localChartName: 'Italy Top 10',
    certificationThresholds: { silver: 20_000, gold: 70_000, platinum: 180_000, diamond: 1_800_000, legendary: 18_000_000 },
    currency: 'EUR',
    awardName: 'Italian Music Award',
    sceneSize: 220,
  },
  {
    name: 'Portugal',
    continent: 'Europe',
    cities: [
      { name: 'Lisbon', population: 2_900_000, fanPool: 350_000 },
      { name: 'Porto', population: 1_300_000, fanPool: 170_000 },
    ],
    localChartName: 'Portugal Top 10',
    certificationThresholds: { silver: 8_000, gold: 30_000, platinum: 80_000, diamond: 800_000, legendary: 8_000_000 },
    currency: 'EUR',
    awardName: 'Globos de Ouro',
    sceneSize: 120,
  },
  {
    name: 'Poland',
    continent: 'Europe',
    cities: [
      { name: 'Warsaw', population: 1_800_000, fanPool: 260_000 },
      { name: 'Kraków', population: 780_000, fanPool: 120_000 },
      { name: 'Gdańsk', population: 470_000, fanPool: 75_000 },
    ],
    localChartName: 'Poland Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'PLN',
    awardName: 'Fryderyk Award',
    sceneSize: 150,
  },
  {
    name: 'Russia',
    continent: 'Europe',
    cities: [
      { name: 'Moscow', population: 12_600_000, fanPool: 900_000 },
      { name: 'Saint Petersburg', population: 5_400_000, fanPool: 450_000 },
      { name: 'Novosibirsk', population: 1_600_000, fanPool: 150_000 },
    ],
    localChartName: 'Russia Top 10',
    certificationThresholds: { silver: 15_000, gold: 60_000, platinum: 150_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'RUB',
    awardName: 'Russian Music Award',
    sceneSize: 190,
  },
  {
    name: 'Belgium',
    continent: 'Europe',
    cities: [
      { name: 'Brussels', population: 2_100_000, fanPool: 260_000 },
      { name: 'Antwerp', population: 530_000, fanPool: 85_000 },
      { name: 'Ghent', population: 260_000, fanPool: 50_000 },
    ],
    localChartName: 'Belgium Top 10',
    certificationThresholds: { silver: 8_000, gold: 30_000, platinum: 75_000, diamond: 750_000, legendary: 7_500_000 },
    currency: 'EUR',
    awardName: 'MIA Award',
    sceneSize: 110,
  },
  {
    name: 'Norway',
    continent: 'Europe',
    cities: [
      { name: 'Oslo', population: 1_100_000, fanPool: 180_000 },
      { name: 'Bergen', population: 290_000, fanPool: 55_000 },
      { name: 'Trondheim', population: 210_000, fanPool: 40_000 },
    ],
    localChartName: 'Norway Top 10',
    certificationThresholds: { silver: 6_000, gold: 25_000, platinum: 60_000, diamond: 600_000, legendary: 6_000_000 },
    currency: 'NOK',
    awardName: 'Spellemann Award',
    sceneSize: 100,
  },
  {
    name: 'Denmark',
    continent: 'Europe',
    cities: [
      { name: 'Copenhagen', population: 1_400_000, fanPool: 200_000 },
      { name: 'Aarhus', population: 350_000, fanPool: 60_000 },
    ],
    localChartName: 'Denmark Top 10',
    certificationThresholds: { silver: 6_000, gold: 25_000, platinum: 60_000, diamond: 600_000, legendary: 6_000_000 },
    currency: 'DKK',
    awardName: 'Danish Music Award',
    sceneSize: 90,
  },
  {
    name: 'Switzerland',
    continent: 'Europe',
    cities: [
      { name: 'Zurich', population: 1_400_000, fanPool: 200_000 },
      { name: 'Geneva', population: 600_000, fanPool: 95_000 },
      { name: 'Basel', population: 550_000, fanPool: 85_000 },
    ],
    localChartName: 'Switzerland Top 10',
    certificationThresholds: { silver: 7_000, gold: 28_000, platinum: 70_000, diamond: 700_000, legendary: 7_000_000 },
    currency: 'CHF',
    awardName: 'Swiss Music Award',
    sceneSize: 95,
  },

  // ─── ASIA (additional) ───────────────────────────────────────────────
  {
    name: 'China',
    continent: 'Asia',
    cities: [
      { name: 'Beijing', population: 21_500_000, fanPool: 1_500_000 },
      { name: 'Shanghai', population: 24_800_000, fanPool: 1_700_000 },
      { name: 'Guangzhou', population: 14_900_000, fanPool: 900_000 },
      { name: 'Chengdu', population: 16_000_000, fanPool: 850_000 },
    ],
    localChartName: 'China Top 10',
    certificationThresholds: { silver: 50_000, gold: 200_000, platinum: 500_000, diamond: 5_000_000, legendary: 50_000_000 },
    currency: 'CNY',
    awardName: 'CMA Award',
    sceneSize: 320,
  },
  {
    name: 'Indonesia',
    continent: 'Asia',
    cities: [
      { name: 'Jakarta', population: 10_500_000, fanPool: 1_100_000 },
      { name: 'Surabaya', population: 3_000_000, fanPool: 350_000 },
      { name: 'Bandung', population: 2_500_000, fanPool: 300_000 },
    ],
    localChartName: 'Indonesia Top 10',
    certificationThresholds: { silver: 20_000, gold: 80_000, platinum: 200_000, diamond: 2_000_000, legendary: 20_000_000 },
    currency: 'IDR',
    awardName: 'AMI Award',
    sceneSize: 220,
  },
  {
    name: 'Philippines',
    continent: 'Asia',
    cities: [
      { name: 'Manila', population: 13_900_000, fanPool: 1_200_000 },
      { name: 'Cebu', population: 1_000_000, fanPool: 170_000 },
      { name: 'Davao', population: 1_800_000, fanPool: 230_000 },
    ],
    localChartName: 'Philippines Top 10',
    certificationThresholds: { silver: 15_000, gold: 60_000, platinum: 150_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'PHP',
    awardName: 'Awit Award',
    sceneSize: 200,
  },
  {
    name: 'Thailand',
    continent: 'Asia',
    cities: [
      { name: 'Bangkok', population: 10_700_000, fanPool: 900_000 },
      { name: 'Chiang Mai', population: 1_200_000, fanPool: 150_000 },
      { name: 'Phuket', population: 400_000, fanPool: 70_000 },
    ],
    localChartName: 'Thailand Top 10',
    certificationThresholds: { silver: 15_000, gold: 60_000, platinum: 150_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'THB',
    awardName: 'Season Award',
    sceneSize: 180,
  },
  {
    name: 'Vietnam',
    continent: 'Asia',
    cities: [
      { name: 'Ho Chi Minh City', population: 9_000_000, fanPool: 800_000 },
      { name: 'Hanoi', population: 8_000_000, fanPool: 700_000 },
      { name: 'Da Nang', population: 1_200_000, fanPool: 140_000 },
    ],
    localChartName: 'Vietnam Top 10',
    certificationThresholds: { silver: 12_000, gold: 50_000, platinum: 120_000, diamond: 1_200_000, legendary: 12_000_000 },
    currency: 'VND',
    awardName: 'Dedication Award',
    sceneSize: 160,
  },
  {
    name: 'Malaysia',
    continent: 'Asia',
    cities: [
      { name: 'Kuala Lumpur', population: 1_800_000, fanPool: 280_000 },
      { name: 'Penang', population: 750_000, fanPool: 120_000 },
      { name: 'Johor Bahru', population: 1_000_000, fanPool: 150_000 },
    ],
    localChartName: 'Malaysia Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'MYR',
    awardName: 'AIM Award',
    sceneSize: 130,
  },
  {
    name: 'Pakistan',
    continent: 'Asia',
    cities: [
      { name: 'Karachi', population: 17_000_000, fanPool: 1_000_000 },
      { name: 'Lahore', population: 13_000_000, fanPool: 800_000 },
      { name: 'Islamabad', population: 1_200_000, fanPool: 160_000 },
    ],
    localChartName: 'Pakistan Top 10',
    certificationThresholds: { silver: 15_000, gold: 60_000, platinum: 150_000, diamond: 1_500_000, legendary: 15_000_000 },
    currency: 'PKR',
    awardName: 'Lux Style Award',
    sceneSize: 180,
  },
  {
    name: 'Bangladesh',
    continent: 'Asia',
    cities: [
      { name: 'Dhaka', population: 22_000_000, fanPool: 1_100_000 },
      { name: 'Chittagong', population: 5_200_000, fanPool: 350_000 },
    ],
    localChartName: 'Bangladesh Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'BDT',
    awardName: 'Meril Prothom Alo Award',
    sceneSize: 150,
  },

  // ─── AMERICAS (additional) ───────────────────────────────────────────
  {
    name: 'Argentina',
    continent: 'South America',
    cities: [
      { name: 'Buenos Aires', population: 15_400_000, fanPool: 1_100_000 },
      { name: 'Córdoba', population: 1_600_000, fanPool: 200_000 },
      { name: 'Rosario', population: 1_400_000, fanPool: 180_000 },
    ],
    localChartName: 'Argentina Top 10',
    certificationThresholds: { silver: 20_000, gold: 80_000, platinum: 200_000, diamond: 2_000_000, legendary: 20_000_000 },
    currency: 'ARS',
    awardName: 'Premios Gardel',
    sceneSize: 230,
  },
  {
    name: 'Chile',
    continent: 'South America',
    cities: [
      { name: 'Santiago', population: 7_100_000, fanPool: 600_000 },
      { name: 'Valparaíso', population: 1_000_000, fanPool: 120_000 },
    ],
    localChartName: 'Chile Top 10',
    certificationThresholds: { silver: 12_000, gold: 50_000, platinum: 120_000, diamond: 1_200_000, legendary: 12_000_000 },
    currency: 'CLP',
    awardName: 'Premios Pulsar',
    sceneSize: 150,
  },
  {
    name: 'Peru',
    continent: 'South America',
    cities: [
      { name: 'Lima', population: 11_000_000, fanPool: 800_000 },
      { name: 'Arequipa', population: 1_100_000, fanPool: 130_000 },
    ],
    localChartName: 'Peru Top 10',
    certificationThresholds: { silver: 10_000, gold: 40_000, platinum: 100_000, diamond: 1_000_000, legendary: 10_000_000 },
    currency: 'PEN',
    awardName: 'Premios Luces',
    sceneSize: 140,
  },
  {
    name: 'Dominican Republic',
    continent: 'Caribbean',
    cities: [
      { name: 'Santo Domingo', population: 3_500_000, fanPool: 500_000 },
      { name: 'Santiago de los Caballeros', population: 1_000_000, fanPool: 140_000 },
    ],
    localChartName: 'DR Top 10',
    certificationThresholds: { silver: 8_000, gold: 30_000, platinum: 75_000, diamond: 750_000, legendary: 7_500_000 },
    currency: 'DOP',
    awardName: 'Premios Soberano',
    sceneSize: 140,
  },
  {
    name: 'Trinidad',
    continent: 'Caribbean',
    cities: [
      { name: 'Port of Spain', population: 550_000, fanPool: 110_000 },
      { name: 'San Fernando', population: 200_000, fanPool: 45_000 },
    ],
    localChartName: 'Trinidad Top 10',
    certificationThresholds: { silver: 4_000, gold: 16_000, platinum: 40_000, diamond: 400_000, legendary: 4_000_000 },
    currency: 'TTD',
    awardName: 'Soca Music Award',
    sceneSize: 95,
  },
  {
    name: 'Cuba',
    continent: 'Caribbean',
    cities: [
      { name: 'Havana', population: 2_100_000, fanPool: 300_000 },
      { name: 'Santiago de Cuba', population: 500_000, fanPool: 80_000 },
    ],
    localChartName: 'Cuba Top 10',
    certificationThresholds: { silver: 5_000, gold: 20_000, platinum: 50_000, diamond: 500_000, legendary: 5_000_000 },
    currency: 'CUP',
    awardName: 'Cubadisco Award',
    sceneSize: 100,
  },
  {
    name: 'Haiti',
    continent: 'Caribbean',
    cities: [
      { name: 'Port-au-Prince', population: 2_800_000, fanPool: 280_000 },
      { name: 'Cap-Haïtien', population: 280_000, fanPool: 45_000 },
    ],
    localChartName: 'Haiti Top 10',
    certificationThresholds: { silver: 3_500, gold: 14_000, platinum: 35_000, diamond: 350_000, legendary: 3_500_000 },
    currency: 'HTG',
    awardName: 'Haitian Music Award',
    sceneSize: 80,
  },
  {
    name: 'Barbados',
    continent: 'Caribbean',
    cities: [
      { name: 'Bridgetown', population: 110_000, fanPool: 30_000 },
    ],
    localChartName: 'Barbados Top 10',
    certificationThresholds: { silver: 2_000, gold: 8_000, platinum: 20_000, diamond: 200_000, legendary: 2_000_000 },
    currency: 'BBD',
    awardName: 'Barbados Music Award',
    sceneSize: 50,
  },
];

/** Every market that gets its own chart — each country, plus the continental roll-up. */
export function getChartMarkets(): string[] {
  const countries = LOCATIONS.map((c) => c.name);
  return [...countries, 'Africa', 'World'];
}

export function getContinents(): string[] {
  return [...new Set(LOCATIONS.map((c) => c.continent))];
}

export function getCountriesByContinent(continent: string): Country[] {
  return LOCATIONS.filter((c) => c.continent === continent);
}

export function getCountry(name: string): Country | undefined {
  return LOCATIONS.find((c) => c.name === name);
}

export function getCitiesByCountry(countryName: string): City[] {
  return LOCATIONS.find((c) => c.name === countryName)?.cities ?? [];
}

export function getCountryNameList(): string[] {
  return LOCATIONS.map((c) => c.name);
}

/**
 * Legacy single rate. Kept as the *baseline* that streaming platforms are
 * measured against — actual payouts come from PLATFORMS in `streaming.ts`.
 */
export const GLOBAL_STREAM_RATE = 0.003;
