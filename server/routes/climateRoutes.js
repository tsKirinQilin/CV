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

module.exports = router;