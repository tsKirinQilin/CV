const fs = require("fs");
const path = require("path");

const inputFile = path.join(__dirname, "server", "data", "temp-1901-2020-all.csv");
const outputFile = path.join(__dirname, "server", "data", "climateDataset.json");

// ISO3 -> ISO2 mapping for countries commonly used in climate/world datasets
const iso3ToIso2 = {
  AFG: "af", ALB: "al", DZA: "dz", AND: "ad", AGO: "ao",
  ARG: "ar", ARM: "am", AUS: "au", AUT: "at", AZE: "az",
  BHR: "bh", BGD: "bd", BLR: "by", BEL: "be", BLZ: "bz",
  BEN: "bj", BTN: "bt", BOL: "bo", BIH: "ba", BWA: "bw",
  BRA: "br", BRN: "bn", BGR: "bg", BFA: "bf", BDI: "bi",
  KHM: "kh", CMR: "cm", CAN: "ca", CAF: "cf", TCD: "td",
  CHL: "cl", CHN: "cn", COL: "co", COM: "km", COD: "cd",
  COG: "cg", CRI: "cr", CIV: "ci", HRV: "hr", CUB: "cu",
  CYP: "cy", CZE: "cz", DNK: "dk", DJI: "dj", DOM: "do",
  ECU: "ec", EGY: "eg", SLV: "sv", EST: "ee", ETH: "et",
  FIN: "fi", FRA: "fr", GAB: "ga", GMB: "gm", GEO: "ge",
  DEU: "de", GHA: "gh", GRC: "gr", GTM: "gt", GIN: "gn",
  GUY: "gy", HTI: "ht", HND: "hn", HUN: "hu", ISL: "is",
  IND: "in", IDN: "id", IRN: "ir", IRQ: "iq", IRL: "ie",
  ISR: "il", ITA: "it", JAM: "jm", JPN: "jp", JOR: "jo",
  KAZ: "kz", KEN: "ke", KWT: "kw", KGZ: "kg", LAO: "la",
  LVA: "lv", LBN: "lb", LSO: "ls", LBR: "lr", LBY: "ly",
  LTU: "lt", LUX: "lu", MDG: "mg", MWI: "mw", MYS: "my",
  MLI: "ml", MRT: "mr", MEX: "mx", MDA: "md", MNG: "mn",
  MNE: "me", MAR: "ma", MOZ: "mz", MMR: "mm", NAM: "na",
  NPL: "np", NLD: "nl", NZL: "nz", NIC: "ni", NER: "ne",
  NGA: "ng", PRK: "kp", MKD: "mk", NOR: "no", OMN: "om",
  PAK: "pk", PAN: "pa", PRY: "py", PER: "pe", PHL: "ph",
  POL: "pl", PRT: "pt", QAT: "qa", ROU: "ro", RUS: "ru",
  RWA: "rw", SAU: "sa", SEN: "sn", SRB: "rs", SLE: "sl",
  SGP: "sg", SVK: "sk", SVN: "si", SOM: "so", ZAF: "za",
  KOR: "kr", ESP: "es", LKA: "lk", SDN: "sd", SUR: "sr",
  SWE: "se", CHE: "ch", SYR: "sy", TWN: "tw", TJK: "tj",
  TZA: "tz", THA: "th", TGO: "tg", TUN: "tn", TUR: "tr",
  TKM: "tm", UGA: "ug", UKR: "ua", ARE: "ae", GBR: "gb",
  USA: "us", URY: "uy", UZB: "uz", VEN: "ve", VNM: "vn",
  YEM: "ye", ZMB: "zm", ZWE: "zw"
};

const raw = fs.readFileSync(inputFile, "utf-8");
const lines = raw.split(/\r?\n/).slice(1);

const grouped = new Map();

for (const line of lines) {
  if (!line.trim()) continue;

  const [temp, year, stat, country, iso3] = line.split(",");

  if (!temp || !year || !stat || !country || !iso3) continue;
  if (!stat.includes("Average")) continue;

  const temperature = parseFloat(temp);
  const parsedYear = parseInt(year, 10);
  const iso2 = iso3ToIso2[iso3.trim().toUpperCase()];

  if (Number.isNaN(temperature) || Number.isNaN(parsedYear) || !iso2) continue;

  const key = `${country.trim()}|${iso2}|${parsedYear}`;

  if (!grouped.has(key)) {
    grouped.set(key, {
      country: country.trim(),
      code: iso2,
      year: parsedYear,
      temps: []
    });
  }

  grouped.get(key).temps.push(temperature);
}

const result = [];

for (const item of grouped.values()) {
  const avg =
    item.temps.reduce((sum, value) => sum + value, 0) / item.temps.length;

  result.push({
    country: item.country,
    code: item.code,
    year: item.year,
    temperature: Number(avg.toFixed(2))
  });
}

result.sort((a, b) => {
  if (a.country !== b.country) return a.country.localeCompare(b.country);
  return a.year - b.year;
});

fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf-8");

console.log(`Done. Created ${outputFile}`);
console.log(`Records: ${result.length}`);