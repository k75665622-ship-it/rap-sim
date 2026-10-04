const LOCATIONS = [
  // ─── AFRICA ──────────────────────────────────────────────────────────
  {
    name: "Ghana",
    continent: "Africa",
    cities: [
      { name: "Accra", population: 25e5, fanPool: 5e5 },
      { name: "Kumasi", population: 2e6, fanPool: 4e5 },
      { name: "Tema", population: 1e6, fanPool: 2e5 },
      { name: "Takoradi", population: 8e5, fanPool: 15e4 },
      { name: "Tamale", population: 7e5, fanPool: 12e4 },
      { name: "Cape Coast", population: 4e5, fanPool: 9e4 }
    ],
    localChartName: "Ghana Boomplay Top 10",
    certificationThresholds: { silver: 1e4, gold: 5e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "GHS",
    awardName: "Ghana Music Awards",
    sceneSize: 420
  },
  {
    name: "Nigeria",
    continent: "Africa",
    cities: [
      { name: "Lagos", population: 15e6, fanPool: 3e6 },
      { name: "Abuja", population: 35e5, fanPool: 7e5 },
      { name: "Ibadan", population: 3e6, fanPool: 6e5 },
      { name: "Port Harcourt", population: 2e6, fanPool: 45e4 },
      { name: "Kano", population: 4e6, fanPool: 5e5 },
      { name: "Benin City", population: 18e5, fanPool: 38e4 }
    ],
    localChartName: "Nigeria TurnTable Top 10",
    certificationThresholds: { silver: 25e3, gold: 1e5, platinum: 5e5, diamond: 5e6, legendary: 5e7 },
    currency: "NGN",
    awardName: "Headies Award",
    sceneSize: 650
  },
  {
    name: "South Africa",
    continent: "Africa",
    cities: [
      { name: "Johannesburg", population: 55e5, fanPool: 1e6 },
      { name: "Cape Town", population: 45e5, fanPool: 8e5 },
      { name: "Durban", population: 35e5, fanPool: 6e5 },
      { name: "Pretoria", population: 25e5, fanPool: 45e4 }
    ],
    localChartName: "SA Hip-Hop Top 10",
    certificationThresholds: { silver: 15e3, gold: 75e3, platinum: 15e4, diamond: 15e5, legendary: 15e6 },
    currency: "ZAR",
    awardName: "South African Music Award",
    sceneSize: 320
  },
  {
    name: "Kenya",
    continent: "Africa",
    cities: [
      { name: "Nairobi", population: 45e5, fanPool: 7e5 },
      { name: "Mombasa", population: 12e5, fanPool: 2e5 },
      { name: "Kisumu", population: 6e5, fanPool: 11e4 }
    ],
    localChartName: "Kenya Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "KES",
    awardName: "Kisima Award",
    sceneSize: 200
  },
  {
    name: "Tanzania",
    continent: "Africa",
    cities: [
      { name: "Dar es Salaam", population: 5e6, fanPool: 6e5 },
      { name: "Dodoma", population: 5e5, fanPool: 9e4 },
      { name: "Arusha", population: 4e5, fanPool: 8e4 }
    ],
    localChartName: "Tanzania Top 10",
    certificationThresholds: { silver: 8e3, gold: 35e3, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "TZS",
    awardName: "Tanzania Music Awards",
    sceneSize: 170
  },
  {
    name: "Ivory Coast",
    continent: "Africa",
    cities: [
      { name: "Abidjan", population: 5e6, fanPool: 55e4 },
      { name: "Yamoussoukro", population: 4e5, fanPool: 7e4 },
      { name: "Bouake", population: 7e5, fanPool: 1e5 }
    ],
    localChartName: "C\xF4te d\u2019Ivoire Top 10",
    certificationThresholds: { silver: 8e3, gold: 3e4, platinum: 7e4, diamond: 7e5, legendary: 7e6 },
    currency: "XOF",
    awardName: "Primud Award",
    sceneSize: 150
  },
  {
    name: "Senegal",
    continent: "Africa",
    cities: [
      { name: "Dakar", population: 3e6, fanPool: 35e4 },
      { name: "Touba", population: 1e6, fanPool: 12e4 },
      { name: "Thi\xE8s", population: 4e5, fanPool: 6e4 }
    ],
    localChartName: "Senegal Top 10",
    certificationThresholds: { silver: 6e3, gold: 25e3, platinum: 6e4, diamond: 6e5, legendary: 6e6 },
    currency: "XOF",
    awardName: "Senegal Music Awards",
    sceneSize: 120
  },
  {
    name: "Ethiopia",
    continent: "Africa",
    cities: [
      { name: "Addis Ababa", population: 5e6, fanPool: 4e5 },
      { name: "Dire Dawa", population: 5e5, fanPool: 7e4 },
      { name: "Mekelle", population: 5e5, fanPool: 65e3 }
    ],
    localChartName: "Ethiopia Top 10",
    certificationThresholds: { silver: 5e3, gold: 2e4, platinum: 5e4, diamond: 5e5, legendary: 5e6 },
    currency: "ETB",
    awardName: "Ethiopian Music Awards",
    sceneSize: 110
  },
  {
    name: "Egypt",
    continent: "Africa",
    cities: [
      { name: "Cairo", population: 1e7, fanPool: 8e5 },
      { name: "Alexandria", population: 55e5, fanPool: 4e5 },
      { name: "Giza", population: 4e6, fanPool: 3e5 }
    ],
    localChartName: "Egypt Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "EGP",
    awardName: "Egypt Music Awards",
    sceneSize: 140
  },
  {
    name: "Morocco",
    continent: "Africa",
    cities: [
      { name: "Casablanca", population: 35e5, fanPool: 25e4 },
      { name: "Rabat", population: 18e5, fanPool: 14e4 },
      { name: "Marrakesh", population: 1e6, fanPool: 9e4 }
    ],
    localChartName: "Morocco Top 10",
    certificationThresholds: { silver: 8e3, gold: 3e4, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "MAD",
    awardName: "Moroccan Music Awards",
    sceneSize: 100
  },
  // ─── NORTH AMERICA ───────────────────────────────────────────────────
  {
    name: "USA",
    continent: "North America",
    cities: [
      { name: "Atlanta", population: 5e5, fanPool: 5e6 },
      { name: "New York", population: 8e6, fanPool: 1e7 },
      { name: "Los Angeles", population: 4e6, fanPool: 8e6 },
      { name: "Chicago", population: 27e5, fanPool: 4e6 },
      { name: "Houston", population: 23e5, fanPool: 35e5 },
      { name: "Miami", population: 45e4, fanPool: 3e6 },
      { name: "Detroit", population: 64e4, fanPool: 18e5 },
      { name: "Memphis", population: 63e4, fanPool: 15e5 }
    ],
    localChartName: "Billboard Hot 10",
    certificationThresholds: { silver: 5e5, gold: 1e6, platinum: 1e6, diamond: 1e7, legendary: 1e8 },
    currency: "USD",
    awardName: "Grammy Award",
    sceneSize: 600
  },
  {
    name: "Canada",
    continent: "North America",
    cities: [
      { name: "Toronto", population: 28e5, fanPool: 3e6 },
      { name: "Vancouver", population: 675e3, fanPool: 15e5 },
      { name: "Montreal", population: 17e5, fanPool: 2e6 },
      { name: "Calgary", population: 13e5, fanPool: 9e5 }
    ],
    localChartName: "Canadian Hot 10",
    certificationThresholds: { silver: 4e4, gold: 8e4, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "CAD",
    awardName: "Juno Award",
    sceneSize: 180
  },
  {
    name: "Jamaica",
    continent: "North America",
    cities: [
      { name: "Kingston", population: 6e5, fanPool: 4e5 },
      { name: "Montego Bay", population: 11e4, fanPool: 12e4 },
      { name: "Spanish Town", population: 15e4, fanPool: 9e4 }
    ],
    localChartName: "Jamaica Top 10",
    certificationThresholds: { silver: 5e3, gold: 2e4, platinum: 5e4, diamond: 5e5, legendary: 5e6 },
    currency: "JMD",
    awardName: "Jamaican Music Awards",
    sceneSize: 150
  },
  {
    name: "Mexico",
    continent: "North America",
    cities: [
      { name: "Mexico City", population: 9e6, fanPool: 9e5 },
      { name: "Guadalajara", population: 15e5, fanPool: 25e4 },
      { name: "Monterrey", population: 11e5, fanPool: 22e4 }
    ],
    localChartName: "Mexico Top 10",
    certificationThresholds: { silver: 3e4, gold: 9e4, platinum: 2e5, diamond: 2e6, legendary: 2e7 },
    currency: "MXN",
    awardName: "Premios Juventud",
    sceneSize: 170
  },
  // ─── EUROPE ──────────────────────────────────────────────────────────
  {
    name: "UK",
    continent: "Europe",
    cities: [
      { name: "London", population: 9e6, fanPool: 8e6 },
      { name: "Manchester", population: 55e4, fanPool: 2e6 },
      { name: "Birmingham", population: 11e5, fanPool: 3e6 },
      { name: "Bristol", population: 46e4, fanPool: 12e5 },
      { name: "Leeds", population: 79e4, fanPool: 12e5 }
    ],
    localChartName: "UK Official Singles Top 10",
    certificationThresholds: { silver: 2e5, gold: 4e5, platinum: 6e5, diamond: 3e6, legendary: 3e7 },
    currency: "GBP",
    awardName: "BRIT Award",
    sceneSize: 400
  },
  {
    name: "France",
    continent: "Europe",
    cities: [
      { name: "Paris", population: 21e5, fanPool: 25e5 },
      { name: "Marseille", population: 87e4, fanPool: 9e5 },
      { name: "Lyon", population: 52e4, fanPool: 6e5 },
      { name: "Lille", population: 23e4, fanPool: 4e5 }
    ],
    localChartName: "France Top 10",
    certificationThresholds: { silver: 75e3, gold: 15e4, platinum: 3e5, diamond: 15e5, legendary: 15e6 },
    currency: "EUR",
    awardName: "Victoires de la Musique",
    sceneSize: 260
  },
  {
    name: "Germany",
    continent: "Europe",
    cities: [
      { name: "Berlin", population: 37e5, fanPool: 16e5 },
      { name: "Hamburg", population: 18e5, fanPool: 8e5 },
      { name: "Munich", population: 15e5, fanPool: 7e5 },
      { name: "Cologne", population: 11e5, fanPool: 55e4 }
    ],
    localChartName: "Germany Top 10",
    certificationThresholds: { silver: 1e5, gold: 2e5, platinum: 4e5, diamond: 2e6, legendary: 2e7 },
    currency: "EUR",
    awardName: "Echo Award",
    sceneSize: 230
  },
  {
    name: "Netherlands",
    continent: "Europe",
    cities: [
      { name: "Amsterdam", population: 9e5, fanPool: 6e5 },
      { name: "Rotterdam", population: 65e4, fanPool: 5e5 },
      { name: "The Hague", population: 55e4, fanPool: 35e4 }
    ],
    localChartName: "Netherlands Top 10",
    certificationThresholds: { silver: 3e4, gold: 75e3, platinum: 15e4, diamond: 1e6, legendary: 1e7 },
    currency: "EUR",
    awardName: "Edison Award",
    sceneSize: 150
  },
  {
    name: "Sweden",
    continent: "Europe",
    cities: [
      { name: "Stockholm", population: 98e4, fanPool: 7e5 },
      { name: "Gothenburg", population: 58e4, fanPool: 4e5 },
      { name: "Malm\xF6", population: 35e4, fanPool: 28e4 }
    ],
    localChartName: "Sweden Top 10",
    certificationThresholds: { silver: 2e4, gold: 4e4, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "SEK",
    awardName: "Grammis Award",
    sceneSize: 130
  },
  {
    name: "Ireland",
    continent: "Europe",
    cities: [
      { name: "Dublin", population: 58e4, fanPool: 45e4 },
      { name: "Cork", population: 21e4, fanPool: 18e4 },
      { name: "Limerick", population: 1e5, fanPool: 9e4 }
    ],
    localChartName: "Ireland Top 10",
    certificationThresholds: { silver: 7500, gold: 15e3, platinum: 3e4, diamond: 3e5, legendary: 3e6 },
    currency: "EUR",
    awardName: "Choice Music Prize",
    sceneSize: 90
  },
  // ─── LATIN AMERICA ───────────────────────────────────────────────────
  {
    name: "Brazil",
    continent: "South America",
    cities: [
      { name: "S\xE3o Paulo", population: 12e6, fanPool: 18e5 },
      { name: "Rio de Janeiro", population: 67e5, fanPool: 12e5 },
      { name: "Salvador", population: 29e5, fanPool: 6e5 },
      { name: "Belo Horizonte", population: 25e5, fanPool: 5e5 }
    ],
    localChartName: "Brazil Top 10",
    certificationThresholds: { silver: 4e4, gold: 8e4, platinum: 16e4, diamond: 16e5, legendary: 16e6 },
    currency: "BRL",
    awardName: "Pr\xEAmio Multishow",
    sceneSize: 260
  },
  {
    name: "Colombia",
    continent: "South America",
    cities: [
      { name: "Bogot\xE1", population: 74e5, fanPool: 7e5 },
      { name: "Medell\xEDn", population: 25e5, fanPool: 4e5 },
      { name: "Cali", population: 22e5, fanPool: 35e4 }
    ],
    localChartName: "Colombia Top 10",
    certificationThresholds: { silver: 2e4, gold: 6e4, platinum: 12e4, diamond: 12e5, legendary: 12e6 },
    currency: "COP",
    awardName: "Premios Nuestra Tierra",
    sceneSize: 180
  },
  {
    name: "Puerto Rico",
    continent: "North America",
    cities: [
      { name: "San Juan", population: 34e4, fanPool: 4e5 },
      { name: "Bayam\xF3n", population: 2e5, fanPool: 2e5 },
      { name: "Ponce", population: 13e4, fanPool: 14e4 }
    ],
    localChartName: "Puerto Rico Top 10",
    certificationThresholds: { silver: 15e3, gold: 4e4, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "USD",
    awardName: "Premios Tu M\xFAsica Urbano",
    sceneSize: 150
  },
  // ─── ASIA & OCEANIA ──────────────────────────────────────────────────
  {
    name: "India",
    continent: "Asia",
    cities: [
      { name: "Mumbai", population: 125e5, fanPool: 15e5 },
      { name: "Delhi", population: 11e6, fanPool: 13e5 },
      { name: "Bangalore", population: 84e5, fanPool: 9e5 },
      { name: "Hyderabad", population: 68e5, fanPool: 7e5 }
    ],
    localChartName: "India Top 10",
    certificationThresholds: { silver: 2e4, gold: 6e4, platinum: 15e4, diamond: 15e5, legendary: 15e6 },
    currency: "INR",
    awardName: "Filmfare Music Award",
    sceneSize: 280
  },
  {
    name: "Japan",
    continent: "Asia",
    cities: [
      { name: "Tokyo", population: 14e6, fanPool: 2e6 },
      { name: "Osaka", population: 27e5, fanPool: 6e5 },
      { name: "Nagoya", population: 23e5, fanPool: 45e4 }
    ],
    localChartName: "Japan Hot 10",
    certificationThresholds: { silver: 1e5, gold: 25e4, platinum: 5e5, diamond: 3e6, legendary: 3e7 },
    currency: "JPY",
    awardName: "Japan Gold Disc Award",
    sceneSize: 230
  },
  {
    name: "South Korea",
    continent: "Asia",
    cities: [
      { name: "Seoul", population: 97e5, fanPool: 18e5 },
      { name: "Busan", population: 34e5, fanPool: 45e4 },
      { name: "Incheon", population: 3e6, fanPool: 4e5 }
    ],
    localChartName: "Korea Top 10",
    certificationThresholds: { silver: 5e4, gold: 15e4, platinum: 3e5, diamond: 2e6, legendary: 2e7 },
    currency: "KRW",
    awardName: "MAMA Award",
    sceneSize: 250
  },
  {
    name: "Australia",
    continent: "Oceania",
    cities: [
      { name: "Sydney", population: 53e5, fanPool: 11e5 },
      { name: "Melbourne", population: 5e6, fanPool: 1e6 },
      { name: "Brisbane", population: 25e5, fanPool: 5e5 }
    ],
    localChartName: "ARIA Top 10",
    certificationThresholds: { silver: 35e3, gold: 7e4, platinum: 14e4, diamond: 14e5, legendary: 14e6 },
    currency: "AUD",
    awardName: "ARIA Award",
    sceneSize: 150
  },
  {
    name: "New Zealand",
    continent: "Oceania",
    cities: [
      { name: "Auckland", population: 17e5, fanPool: 4e5 },
      { name: "Wellington", population: 215e3, fanPool: 13e4 },
      { name: "Christchurch", population: 4e5, fanPool: 15e4 }
    ],
    localChartName: "NZ Top 10",
    certificationThresholds: { silver: 7500, gold: 15e3, platinum: 3e4, diamond: 3e5, legendary: 3e6 },
    currency: "NZD",
    awardName: "Aotearoa Music Award",
    sceneSize: 85
  },
  // ─── AFRICA (additional) ─────────────────────────────────────────────
  {
    name: "Cameroon",
    continent: "Africa",
    cities: [
      { name: "Douala", population: 3e6, fanPool: 42e4 },
      { name: "Yaound\xE9", population: 28e5, fanPool: 38e4 },
      { name: "Bamenda", population: 5e5, fanPool: 9e4 },
      { name: "Bafoussam", population: 4e5, fanPool: 7e4 }
    ],
    localChartName: "Camer Top 10",
    certificationThresholds: { silver: 8e3, gold: 3e4, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "XAF",
    awardName: "Canal 2 d'Or",
    sceneSize: 160
  },
  {
    name: "DR Congo",
    continent: "Africa",
    cities: [
      { name: "Kinshasa", population: 15e6, fanPool: 12e5 },
      { name: "Lubumbashi", population: 25e5, fanPool: 28e4 },
      { name: "Goma", population: 1e6, fanPool: 14e4 },
      { name: "Mbuji-Mayi", population: 2e6, fanPool: 19e4 }
    ],
    localChartName: "Congo Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 11e4, diamond: 1e6, legendary: 1e7 },
    currency: "CDF",
    awardName: "Congo Music Award",
    sceneSize: 190
  },
  {
    name: "Uganda",
    continent: "Africa",
    cities: [
      { name: "Kampala", population: 36e5, fanPool: 5e5 },
      { name: "Gulu", population: 25e4, fanPool: 5e4 },
      { name: "Mbarara", population: 3e5, fanPool: 6e4 },
      { name: "Jinja", population: 2e5, fanPool: 4e4 }
    ],
    localChartName: "Uganda Top 10",
    certificationThresholds: { silver: 6e3, gold: 25e3, platinum: 6e4, diamond: 6e5, legendary: 6e6 },
    currency: "UGX",
    awardName: "Uganda Music Award",
    sceneSize: 150
  },
  {
    name: "Zambia",
    continent: "Africa",
    cities: [
      { name: "Lusaka", population: 3e6, fanPool: 38e4 },
      { name: "Kitwe", population: 7e5, fanPool: 11e4 },
      { name: "Ndola", population: 6e5, fanPool: 95e3 }
    ],
    localChartName: "Zambia Top 10",
    certificationThresholds: { silver: 5e3, gold: 2e4, platinum: 5e4, diamond: 5e5, legendary: 5e6 },
    currency: "ZMW",
    awardName: "Born n Bred Award",
    sceneSize: 100
  },
  {
    name: "Zimbabwe",
    continent: "Africa",
    cities: [
      { name: "Harare", population: 21e5, fanPool: 3e5 },
      { name: "Bulawayo", population: 7e5, fanPool: 11e4 },
      { name: "Mutare", population: 2e5, fanPool: 4e4 }
    ],
    localChartName: "Zim Top 10",
    certificationThresholds: { silver: 4e3, gold: 18e3, platinum: 45e3, diamond: 45e4, legendary: 45e5 },
    currency: "USD",
    awardName: "Zimbabwe Music Award",
    sceneSize: 95
  },
  {
    name: "Angola",
    continent: "Africa",
    cities: [
      { name: "Luanda", population: 89e5, fanPool: 9e5 },
      { name: "Huambo", population: 7e5, fanPool: 1e5 },
      { name: "Benguela", population: 6e5, fanPool: 85e3 }
    ],
    localChartName: "Angola Top 10",
    certificationThresholds: { silver: 6e3, gold: 25e3, platinum: 65e3, diamond: 65e4, legendary: 65e5 },
    currency: "AOA",
    awardName: "Angola Music Award",
    sceneSize: 120
  },
  {
    name: "Mozambique",
    continent: "Africa",
    cities: [
      { name: "Maputo", population: 12e5, fanPool: 2e5 },
      { name: "Matola", population: 1e6, fanPool: 15e4 },
      { name: "Beira", population: 55e4, fanPool: 85e3 }
    ],
    localChartName: "Moz Top 10",
    certificationThresholds: { silver: 4e3, gold: 16e3, platinum: 4e4, diamond: 4e5, legendary: 4e6 },
    currency: "MZN",
    awardName: "Ngoma Award",
    sceneSize: 85
  },
  {
    name: "Mali",
    continent: "Africa",
    cities: [
      { name: "Bamako", population: 28e5, fanPool: 34e4 },
      { name: "Sikasso", population: 4e5, fanPool: 6e4 },
      { name: "Mopti", population: 2e5, fanPool: 35e3 }
    ],
    localChartName: "Mali Top 10",
    certificationThresholds: { silver: 4e3, gold: 15e3, platinum: 38e3, diamond: 38e4, legendary: 38e5 },
    currency: "XOF",
    awardName: "Tamani Award",
    sceneSize: 90
  },
  {
    name: "Burkina Faso",
    continent: "Africa",
    cities: [
      { name: "Ouagadougou", population: 26e5, fanPool: 3e5 },
      { name: "Bobo-Dioulasso", population: 9e5, fanPool: 12e4 }
    ],
    localChartName: "Faso Top 10",
    certificationThresholds: { silver: 3500, gold: 14e3, platinum: 35e3, diamond: 35e4, legendary: 35e5 },
    currency: "XOF",
    awardName: "Faso Music Award",
    sceneSize: 75
  },
  {
    name: "Rwanda",
    continent: "Africa",
    cities: [
      { name: "Kigali", population: 12e5, fanPool: 18e4 },
      { name: "Butare", population: 3e5, fanPool: 5e4 },
      { name: "Gisenyi", population: 25e4, fanPool: 4e4 }
    ],
    localChartName: "Rwanda Top 10",
    certificationThresholds: { silver: 3500, gold: 14e3, platinum: 35e3, diamond: 35e4, legendary: 35e5 },
    currency: "RWF",
    awardName: "Rwanda Music Award",
    sceneSize: 80
  },
  {
    name: "Botswana",
    continent: "Africa",
    cities: [
      { name: "Gaborone", population: 27e4, fanPool: 6e4 },
      { name: "Francistown", population: 1e5, fanPool: 25e3 }
    ],
    localChartName: "Bots Top 10",
    certificationThresholds: { silver: 3e3, gold: 12e3, platinum: 3e4, diamond: 3e5, legendary: 3e6 },
    currency: "BWP",
    awardName: "BOMU Award",
    sceneSize: 55
  },
  {
    name: "Namibia",
    continent: "Africa",
    cities: [
      { name: "Windhoek", population: 43e4, fanPool: 8e4 },
      { name: "Walvis Bay", population: 8e4, fanPool: 2e4 },
      { name: "Swakopmund", population: 6e4, fanPool: 15e3 }
    ],
    localChartName: "Nam Top 10",
    certificationThresholds: { silver: 2500, gold: 1e4, platinum: 25e3, diamond: 25e4, legendary: 25e5 },
    currency: "NAD",
    awardName: "Namibian Music Award",
    sceneSize: 50
  },
  {
    name: "Tunisia",
    continent: "Africa",
    cities: [
      { name: "Tunis", population: 24e5, fanPool: 28e4 },
      { name: "Sfax", population: 6e5, fanPool: 8e4 },
      { name: "Sousse", population: 4e5, fanPool: 55e3 }
    ],
    localChartName: "Tunisia Top 10",
    certificationThresholds: { silver: 4e3, gold: 16e3, platinum: 4e4, diamond: 4e5, legendary: 4e6 },
    currency: "TND",
    awardName: "Tunisian Music Award",
    sceneSize: 85
  },
  {
    name: "Algeria",
    continent: "Africa",
    cities: [
      { name: "Algiers", population: 39e5, fanPool: 4e5 },
      { name: "Oran", population: 15e5, fanPool: 17e4 },
      { name: "Constantine", population: 45e4, fanPool: 6e4 }
    ],
    localChartName: "Algeria Top 10",
    certificationThresholds: { silver: 5e3, gold: 2e4, platinum: 5e4, diamond: 5e5, legendary: 5e6 },
    currency: "DZD",
    awardName: "Algerian Music Award",
    sceneSize: 100
  },
  // ─── MIDDLE EAST ─────────────────────────────────────────────────────
  {
    name: "UAE",
    continent: "Middle East",
    cities: [
      { name: "Dubai", population: 36e5, fanPool: 6e5 },
      { name: "Abu Dhabi", population: 15e5, fanPool: 25e4 },
      { name: "Sharjah", population: 18e5, fanPool: 2e5 }
    ],
    localChartName: "Gulf Top 10",
    certificationThresholds: { silver: 8e3, gold: 35e3, platinum: 9e4, diamond: 9e5, legendary: 9e6 },
    currency: "AED",
    awardName: "Gulf Music Award",
    sceneSize: 130
  },
  {
    name: "Saudi Arabia",
    continent: "Middle East",
    cities: [
      { name: "Riyadh", population: 8e6, fanPool: 7e5 },
      { name: "Jeddah", population: 47e5, fanPool: 45e4 },
      { name: "Dammam", population: 15e5, fanPool: 18e4 }
    ],
    localChartName: "Saudi Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "SAR",
    awardName: "Saudi Music Award",
    sceneSize: 110
  },
  // ─── EUROPE (additional) ─────────────────────────────────────────────
  {
    name: "Spain",
    continent: "Europe",
    cities: [
      { name: "Madrid", population: 67e5, fanPool: 8e5 },
      { name: "Barcelona", population: 56e5, fanPool: 7e5 },
      { name: "Seville", population: 15e5, fanPool: 18e4 },
      { name: "Valencia", population: 16e5, fanPool: 19e4 }
    ],
    localChartName: "Spain Top 10",
    certificationThresholds: { silver: 2e4, gold: 8e4, platinum: 2e5, diamond: 2e6, legendary: 2e7 },
    currency: "EUR",
    awardName: "Premios de la M\xFAsica",
    sceneSize: 230
  },
  {
    name: "Italy",
    continent: "Europe",
    cities: [
      { name: "Milan", population: 32e5, fanPool: 4e5 },
      { name: "Rome", population: 43e5, fanPool: 5e5 },
      { name: "Naples", population: 3e6, fanPool: 33e4 },
      { name: "Turin", population: 18e5, fanPool: 2e5 }
    ],
    localChartName: "Italy Top 10",
    certificationThresholds: { silver: 2e4, gold: 7e4, platinum: 18e4, diamond: 18e5, legendary: 18e6 },
    currency: "EUR",
    awardName: "Italian Music Award",
    sceneSize: 220
  },
  {
    name: "Portugal",
    continent: "Europe",
    cities: [
      { name: "Lisbon", population: 29e5, fanPool: 35e4 },
      { name: "Porto", population: 13e5, fanPool: 17e4 }
    ],
    localChartName: "Portugal Top 10",
    certificationThresholds: { silver: 8e3, gold: 3e4, platinum: 8e4, diamond: 8e5, legendary: 8e6 },
    currency: "EUR",
    awardName: "Globos de Ouro",
    sceneSize: 120
  },
  {
    name: "Poland",
    continent: "Europe",
    cities: [
      { name: "Warsaw", population: 18e5, fanPool: 26e4 },
      { name: "Krak\xF3w", population: 78e4, fanPool: 12e4 },
      { name: "Gda\u0144sk", population: 47e4, fanPool: 75e3 }
    ],
    localChartName: "Poland Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "PLN",
    awardName: "Fryderyk Award",
    sceneSize: 150
  },
  {
    name: "Russia",
    continent: "Europe",
    cities: [
      { name: "Moscow", population: 126e5, fanPool: 9e5 },
      { name: "Saint Petersburg", population: 54e5, fanPool: 45e4 },
      { name: "Novosibirsk", population: 16e5, fanPool: 15e4 }
    ],
    localChartName: "Russia Top 10",
    certificationThresholds: { silver: 15e3, gold: 6e4, platinum: 15e4, diamond: 15e5, legendary: 15e6 },
    currency: "RUB",
    awardName: "Russian Music Award",
    sceneSize: 190
  },
  {
    name: "Belgium",
    continent: "Europe",
    cities: [
      { name: "Brussels", population: 21e5, fanPool: 26e4 },
      { name: "Antwerp", population: 53e4, fanPool: 85e3 },
      { name: "Ghent", population: 26e4, fanPool: 5e4 }
    ],
    localChartName: "Belgium Top 10",
    certificationThresholds: { silver: 8e3, gold: 3e4, platinum: 75e3, diamond: 75e4, legendary: 75e5 },
    currency: "EUR",
    awardName: "MIA Award",
    sceneSize: 110
  },
  {
    name: "Norway",
    continent: "Europe",
    cities: [
      { name: "Oslo", population: 11e5, fanPool: 18e4 },
      { name: "Bergen", population: 29e4, fanPool: 55e3 },
      { name: "Trondheim", population: 21e4, fanPool: 4e4 }
    ],
    localChartName: "Norway Top 10",
    certificationThresholds: { silver: 6e3, gold: 25e3, platinum: 6e4, diamond: 6e5, legendary: 6e6 },
    currency: "NOK",
    awardName: "Spellemann Award",
    sceneSize: 100
  },
  {
    name: "Denmark",
    continent: "Europe",
    cities: [
      { name: "Copenhagen", population: 14e5, fanPool: 2e5 },
      { name: "Aarhus", population: 35e4, fanPool: 6e4 }
    ],
    localChartName: "Denmark Top 10",
    certificationThresholds: { silver: 6e3, gold: 25e3, platinum: 6e4, diamond: 6e5, legendary: 6e6 },
    currency: "DKK",
    awardName: "Danish Music Award",
    sceneSize: 90
  },
  {
    name: "Switzerland",
    continent: "Europe",
    cities: [
      { name: "Zurich", population: 14e5, fanPool: 2e5 },
      { name: "Geneva", population: 6e5, fanPool: 95e3 },
      { name: "Basel", population: 55e4, fanPool: 85e3 }
    ],
    localChartName: "Switzerland Top 10",
    certificationThresholds: { silver: 7e3, gold: 28e3, platinum: 7e4, diamond: 7e5, legendary: 7e6 },
    currency: "CHF",
    awardName: "Swiss Music Award",
    sceneSize: 95
  },
  // ─── ASIA (additional) ───────────────────────────────────────────────
  {
    name: "China",
    continent: "Asia",
    cities: [
      { name: "Beijing", population: 215e5, fanPool: 15e5 },
      { name: "Shanghai", population: 248e5, fanPool: 17e5 },
      { name: "Guangzhou", population: 149e5, fanPool: 9e5 },
      { name: "Chengdu", population: 16e6, fanPool: 85e4 }
    ],
    localChartName: "China Top 10",
    certificationThresholds: { silver: 5e4, gold: 2e5, platinum: 5e5, diamond: 5e6, legendary: 5e7 },
    currency: "CNY",
    awardName: "CMA Award",
    sceneSize: 320
  },
  {
    name: "Indonesia",
    continent: "Asia",
    cities: [
      { name: "Jakarta", population: 105e5, fanPool: 11e5 },
      { name: "Surabaya", population: 3e6, fanPool: 35e4 },
      { name: "Bandung", population: 25e5, fanPool: 3e5 }
    ],
    localChartName: "Indonesia Top 10",
    certificationThresholds: { silver: 2e4, gold: 8e4, platinum: 2e5, diamond: 2e6, legendary: 2e7 },
    currency: "IDR",
    awardName: "AMI Award",
    sceneSize: 220
  },
  {
    name: "Philippines",
    continent: "Asia",
    cities: [
      { name: "Manila", population: 139e5, fanPool: 12e5 },
      { name: "Cebu", population: 1e6, fanPool: 17e4 },
      { name: "Davao", population: 18e5, fanPool: 23e4 }
    ],
    localChartName: "Philippines Top 10",
    certificationThresholds: { silver: 15e3, gold: 6e4, platinum: 15e4, diamond: 15e5, legendary: 15e6 },
    currency: "PHP",
    awardName: "Awit Award",
    sceneSize: 200
  },
  {
    name: "Thailand",
    continent: "Asia",
    cities: [
      { name: "Bangkok", population: 107e5, fanPool: 9e5 },
      { name: "Chiang Mai", population: 12e5, fanPool: 15e4 },
      { name: "Phuket", population: 4e5, fanPool: 7e4 }
    ],
    localChartName: "Thailand Top 10",
    certificationThresholds: { silver: 15e3, gold: 6e4, platinum: 15e4, diamond: 15e5, legendary: 15e6 },
    currency: "THB",
    awardName: "Season Award",
    sceneSize: 180
  },
  {
    name: "Vietnam",
    continent: "Asia",
    cities: [
      { name: "Ho Chi Minh City", population: 9e6, fanPool: 8e5 },
      { name: "Hanoi", population: 8e6, fanPool: 7e5 },
      { name: "Da Nang", population: 12e5, fanPool: 14e4 }
    ],
    localChartName: "Vietnam Top 10",
    certificationThresholds: { silver: 12e3, gold: 5e4, platinum: 12e4, diamond: 12e5, legendary: 12e6 },
    currency: "VND",
    awardName: "Dedication Award",
    sceneSize: 160
  },
  {
    name: "Malaysia",
    continent: "Asia",
    cities: [
      { name: "Kuala Lumpur", population: 18e5, fanPool: 28e4 },
      { name: "Penang", population: 75e4, fanPool: 12e4 },
      { name: "Johor Bahru", population: 1e6, fanPool: 15e4 }
    ],
    localChartName: "Malaysia Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "MYR",
    awardName: "AIM Award",
    sceneSize: 130
  },
  {
    name: "Pakistan",
    continent: "Asia",
    cities: [
      { name: "Karachi", population: 17e6, fanPool: 1e6 },
      { name: "Lahore", population: 13e6, fanPool: 8e5 },
      { name: "Islamabad", population: 12e5, fanPool: 16e4 }
    ],
    localChartName: "Pakistan Top 10",
    certificationThresholds: { silver: 15e3, gold: 6e4, platinum: 15e4, diamond: 15e5, legendary: 15e6 },
    currency: "PKR",
    awardName: "Lux Style Award",
    sceneSize: 180
  },
  {
    name: "Bangladesh",
    continent: "Asia",
    cities: [
      { name: "Dhaka", population: 22e6, fanPool: 11e5 },
      { name: "Chittagong", population: 52e5, fanPool: 35e4 }
    ],
    localChartName: "Bangladesh Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "BDT",
    awardName: "Meril Prothom Alo Award",
    sceneSize: 150
  },
  // ─── AMERICAS (additional) ───────────────────────────────────────────
  {
    name: "Argentina",
    continent: "South America",
    cities: [
      { name: "Buenos Aires", population: 154e5, fanPool: 11e5 },
      { name: "C\xF3rdoba", population: 16e5, fanPool: 2e5 },
      { name: "Rosario", population: 14e5, fanPool: 18e4 }
    ],
    localChartName: "Argentina Top 10",
    certificationThresholds: { silver: 2e4, gold: 8e4, platinum: 2e5, diamond: 2e6, legendary: 2e7 },
    currency: "ARS",
    awardName: "Premios Gardel",
    sceneSize: 230
  },
  {
    name: "Chile",
    continent: "South America",
    cities: [
      { name: "Santiago", population: 71e5, fanPool: 6e5 },
      { name: "Valpara\xEDso", population: 1e6, fanPool: 12e4 }
    ],
    localChartName: "Chile Top 10",
    certificationThresholds: { silver: 12e3, gold: 5e4, platinum: 12e4, diamond: 12e5, legendary: 12e6 },
    currency: "CLP",
    awardName: "Premios Pulsar",
    sceneSize: 150
  },
  {
    name: "Peru",
    continent: "South America",
    cities: [
      { name: "Lima", population: 11e6, fanPool: 8e5 },
      { name: "Arequipa", population: 11e5, fanPool: 13e4 }
    ],
    localChartName: "Peru Top 10",
    certificationThresholds: { silver: 1e4, gold: 4e4, platinum: 1e5, diamond: 1e6, legendary: 1e7 },
    currency: "PEN",
    awardName: "Premios Luces",
    sceneSize: 140
  },
  {
    name: "Dominican Republic",
    continent: "Caribbean",
    cities: [
      { name: "Santo Domingo", population: 35e5, fanPool: 5e5 },
      { name: "Santiago de los Caballeros", population: 1e6, fanPool: 14e4 }
    ],
    localChartName: "DR Top 10",
    certificationThresholds: { silver: 8e3, gold: 3e4, platinum: 75e3, diamond: 75e4, legendary: 75e5 },
    currency: "DOP",
    awardName: "Premios Soberano",
    sceneSize: 140
  },
  {
    name: "Trinidad",
    continent: "Caribbean",
    cities: [
      { name: "Port of Spain", population: 55e4, fanPool: 11e4 },
      { name: "San Fernando", population: 2e5, fanPool: 45e3 }
    ],
    localChartName: "Trinidad Top 10",
    certificationThresholds: { silver: 4e3, gold: 16e3, platinum: 4e4, diamond: 4e5, legendary: 4e6 },
    currency: "TTD",
    awardName: "Soca Music Award",
    sceneSize: 95
  },
  {
    name: "Cuba",
    continent: "Caribbean",
    cities: [
      { name: "Havana", population: 21e5, fanPool: 3e5 },
      { name: "Santiago de Cuba", population: 5e5, fanPool: 8e4 }
    ],
    localChartName: "Cuba Top 10",
    certificationThresholds: { silver: 5e3, gold: 2e4, platinum: 5e4, diamond: 5e5, legendary: 5e6 },
    currency: "CUP",
    awardName: "Cubadisco Award",
    sceneSize: 100
  },
  {
    name: "Haiti",
    continent: "Caribbean",
    cities: [
      { name: "Port-au-Prince", population: 28e5, fanPool: 28e4 },
      { name: "Cap-Ha\xEFtien", population: 28e4, fanPool: 45e3 }
    ],
    localChartName: "Haiti Top 10",
    certificationThresholds: { silver: 3500, gold: 14e3, platinum: 35e3, diamond: 35e4, legendary: 35e5 },
    currency: "HTG",
    awardName: "Haitian Music Award",
    sceneSize: 80
  },
  {
    name: "Barbados",
    continent: "Caribbean",
    cities: [
      { name: "Bridgetown", population: 11e4, fanPool: 3e4 }
    ],
    localChartName: "Barbados Top 10",
    certificationThresholds: { silver: 2e3, gold: 8e3, platinum: 2e4, diamond: 2e5, legendary: 2e6 },
    currency: "BBD",
    awardName: "Barbados Music Award",
    sceneSize: 50
  }
];
function getChartMarkets() {
  const countries = LOCATIONS.map((c) => c.name);
  return [...countries, "Africa", "World"];
}
function getContinents() {
  return [...new Set(LOCATIONS.map((c) => c.continent))];
}
function getCountriesByContinent(continent) {
  return LOCATIONS.filter((c) => c.continent === continent);
}
function getCountry(name) {
  return LOCATIONS.find((c) => c.name === name);
}
function getCitiesByCountry(countryName) {
  return LOCATIONS.find((c) => c.name === countryName)?.cities ?? [];
}
function getCountryNameList() {
  return LOCATIONS.map((c) => c.name);
}
const GLOBAL_STREAM_RATE = 3e-3;
export {
  GLOBAL_STREAM_RATE,
  LOCATIONS,
  getChartMarkets,
  getCitiesByCountry,
  getContinents,
  getCountriesByContinent,
  getCountry,
  getCountryNameList
};
