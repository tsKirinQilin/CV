const express = require("express");
const router = express.Router();
const climateData = require("../data/climateDataset.json");
const monthlyClimateData = require("../data/monthlyClimateDataset.json");

router.get("/data", (req, res) => {
  res.json(climateData);
});

router.get("/countries", (req, res) => {
  const countries = [...new Set(climateData.map(item => item.country))].sort();
  res.json(countries);
});

router.get("/country-codes", (req, res) => {
  const seen = new Map();

  climateData.forEach(item => {
    if (!seen.has(item.code)) {
      seen.set(item.code, item.country);
    }
  });

  const result = [...seen.entries()]
    .map(([code, country]) => ({ code, country }))
    .sort((a, b) => a.country.localeCompare(b.country));

  res.json(result);
});

router.get("/latest", (req, res) => {
  const latestYear = Math.max(...climateData.map(item => item.year));
  const latestData = climateData.filter(item => item.year === latestYear);
  res.json(latestData);
});

router.get("/by-year", (req, res) => {
  const year = parseInt(req.query.year, 10);
  const country = req.query.country;

  let filtered = climateData.filter(item => item.year === year);

  if (country && country !== "all") {
    filtered = filtered.filter(item => item.country === country);
  }

  res.json(filtered);
});

router.get("/monthly-by-year", (req, res) => {
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);
  const country = req.query.country || "all";

  if (!year || !month) {
    return res.status(400).json({ error: "year and month are required" });
  }

  let filtered = monthlyClimateData.filter(
    item => item.year === year && item.month === month
  );

  if (country !== "all") {
    filtered = filtered.filter(item => item.country === country);
  }

  res.json(filtered);
});

router.get("/line-data", (req, res) => {
  const { country } = req.query;
  let filtered = climateData;

  if (country && country !== "all") {
    filtered = climateData.filter(item => item.country === country);
  }

  if (country === "all" || !country) {
    const groupedByYear = new Map();

    filtered.forEach(item => {
      if (!groupedByYear.has(item.year)) {
        groupedByYear.set(item.year, []);
      }
      groupedByYear.get(item.year).push(item.temperature);
    });

    const result = [...groupedByYear.entries()]
      .map(([year, temps]) => ({
        year,
        temperature: Number(
          (temps.reduce((sum, t) => sum + t, 0) / temps.length).toFixed(2)
        )
      }))
      .sort((a, b) => a.year - b.year);

    return res.json(result);
  }

  const result = filtered
    .map(item => ({
      year: item.year,
      temperature: item.temperature
    }))
    .sort((a, b) => a.year - b.year);

  res.json(result);
});

router.get("/stats", (req, res) => {
  const { country, year } = req.query;

  const selectedYear = year
    ? parseInt(year, 10)
    : Math.max(...climateData.map(item => item.year));

  let filtered = climateData.filter(item => item.year === selectedYear);

  if (country && country !== "all") {
    filtered = filtered.filter(item => item.country === country);
  }

  if (!filtered.length) {
    return res.json({
      year: selectedYear,
      averageTemperature: 0,
      hottestCountry: { country: "-", temperature: 0 },
      coldestCountry: { country: "-", temperature: 0 }
    });
  }

  const avg =
    filtered.reduce((sum, item) => sum + item.temperature, 0) / filtered.length;

  const hottest = filtered.reduce((max, item) =>
    item.temperature > max.temperature ? item : max
  );

  const coldest = filtered.reduce((min, item) =>
    item.temperature < min.temperature ? item : min
  );

  res.json({
    year: selectedYear,
    averageTemperature: Number(avg.toFixed(2)),
    hottestCountry: hottest,
    coldestCountry: coldest
  });
});

router.get("/monthly-radial", (req, res) => {
  const { country, year } = req.query;

  if (!country || !year) {
    return res.status(400).json({ error: "country and year are required" });
  }

  const selectedYear = parseInt(year, 10);

  const filtered = monthlyClimateData
    .filter(item => item.country === country && item.year === selectedYear)
    .sort((a, b) => a.month - b.month);

  res.json(filtered);
});

router.get("/insights", (req, res) => {
  const country = req.query.country || "all";

  let filtered = climateData;

  if (country !== "all") {
    filtered = climateData.filter(item => item.country === country);
  }

  const byCountry = new Map();

  filtered.forEach(item => {
    if (!byCountry.has(item.country)) {
      byCountry.set(item.country, []);
    }
    byCountry.get(item.country).push(item);
  });

  const countryChanges = [];

  for (const [countryName, values] of byCountry.entries()) {
    const sorted = values.slice().sort((a, b) => a.year - b.year);
    if (sorted.length < 2) continue;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalChange = last.temperature - first.temperature;
    const yearSpan = last.year - first.year || 1;
    const perDecade = (totalChange / yearSpan) * 10;

    countryChanges.push({
      country: countryName,
      firstYear: first.year,
      lastYear: last.year,
      firstTemp: first.temperature,
      lastTemp: last.temperature,
      totalChange: Number(totalChange.toFixed(2)),
      perDecade: Number(perDecade.toFixed(2))
    });
  }

  const allYears = [...new Set(filtered.map(item => item.year))].sort((a, b) => a - b);
  const groupedByYear = new Map();

  filtered.forEach(item => {
    if (!groupedByYear.has(item.year)) {
      groupedByYear.set(item.year, []);
    }
    groupedByYear.get(item.year).push(item.temperature);
  });

  const yearlyAverages = allYears.map(year => {
    const temps = groupedByYear.get(year) || [];
    const avg = temps.reduce((sum, value) => sum + value, 0) / temps.length;
    return { year, temperature: Number(avg.toFixed(2)) };
  });

  let globalTrend = "Stable";
  let globalTrendSlope = 0;

  if (yearlyAverages.length >= 2) {
    const first = yearlyAverages[0];
    const last = yearlyAverages[yearlyAverages.length - 1];
    const total = last.temperature - first.temperature;
    const span = last.year - first.year || 1;
    globalTrendSlope = Number(((total / span) * 10).toFixed(2));

    if (globalTrendSlope > 0.1) globalTrend = "Warming";
    else if (globalTrendSlope < -0.1) globalTrend = "Cooling";
  }

  const sortedWarm = countryChanges.slice().sort((a, b) => b.perDecade - a.perDecade);
  const sortedCool = countryChanges.slice().sort((a, b) => a.perDecade - b.perDecade);

  const decadeAverage =
    countryChanges.length > 0
      ? Number(
          (
            countryChanges.reduce((sum, item) => sum + item.perDecade, 0) /
            countryChanges.length
          ).toFixed(2)
        )
      : 0;

  res.json({
    globalTrend,
    globalTrendSlope,
    fastestWarming: sortedWarm[0] || null,
    fastestCooling: sortedCool[0] || null,
    decadeAverage
  });
});

module.exports = router;