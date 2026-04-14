let currentSelectedCountry = "all";
let currentSelectedYear = 2020;
let currentSelectedMonth = 1;

let anomalyGroupedData = null;
let anomalyYears = [];
let anomalyAnimationInterval = null;
let globalCountryCodeMap = new Map();

let compareMode = false;
let compareCountry = null;

async function fetchLatestData() {
  const response = await fetch("/api/latest");
  return await response.json();
}

async function fetchLineData(country = "all") {
  const response = await fetch(`/api/line-data?country=${encodeURIComponent(country)}`);
  return await response.json();
}

async function fetchStats(country = "all", year = null) {
  const query = new URLSearchParams({ country });
  if (year !== null) query.set("year", year);
  const response = await fetch(`/api/stats?${query.toString()}`);
  return await response.json();
}

async function fetchCountries() {
  const response = await fetch("/api/countries");
  return await response.json();
}

async function fetchCountryCodes() {
  const response = await fetch("/api/country-codes");
  return await response.json();
}

async function fetchMonthlyByYear(year, month, country = "all") {
  const query = new URLSearchParams({ year, month, country });
  const response = await fetch(`/api/monthly-by-year?${query.toString()}`);
  return await response.json();
}

async function fetchMonthlyRadialData(country, year) {
  const query = new URLSearchParams({ country, year });
  const response = await fetch(`/api/monthly-radial?${query.toString()}`);
  return await response.json();
}

async function fetchAnomalyData() {
  const monthNames = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec"
  };

  return await d3.csv("data/HadCRUT4.csv", d => ({
    year: +d.Year,
    month: monthNames[String(d.Month).padStart(2, "0")],
    value: +d.Anomaly
  }));
}

async function fetchInsights(country = "all") {
  const response = await fetch(`/api/insights?country=${encodeURIComponent(country)}`);
  return await response.json();
}

function calculateAverageTemperature(data) {
  if (!data?.length) return null;
  const avg = data.reduce((sum, item) => sum + item.temperature, 0) / data.length;
  return Number(avg.toFixed(2));
}

function calculateLongTermChange(data) {
  if (!data?.length || data.length < 2) return null;

  const sorted = [...data].sort((a, b) => a.year - b.year);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return Number((last.temperature - first.temperature).toFixed(2));
}

function hideCompareSummary() {
  const panel = document.getElementById("compareSummaryPanel");
  if (panel) panel.classList.add("hidden");
}

function updateCompareSummary(primaryLabel, compareLabel, primaryLineData, compareLineData, primaryMonthlyPoint, secondaryMonthlyPoint) {
  const panel = document.getElementById("compareSummaryPanel");
  if (!panel) return;

  panel.classList.remove("hidden");

  const currentMonthValue = document.getElementById("compareCurrentMonth");
  const currentMonthDesc = document.getElementById("compareCurrentMonthDesc");
  const yearAverageValue = document.getElementById("compareYearAverage");
  const yearAverageDesc = document.getElementById("compareYearAverageDesc");
  const trendValue = document.getElementById("compareTrendChange");
  const trendDesc = document.getElementById("compareTrendChangeDesc");

  const primaryMonthTemp = primaryMonthlyPoint?.temperature ?? null;
  const secondaryMonthTemp = secondaryMonthlyPoint?.temperature ?? null;

  const primaryYearAvg = calculateAverageTemperature(primaryLineData);
  const secondaryYearAvg = calculateAverageTemperature(compareLineData);

  const primaryTrend = calculateLongTermChange(primaryLineData);
  const secondaryTrend = calculateLongTermChange(compareLineData);

  if (primaryMonthTemp !== null && secondaryMonthTemp !== null) {
    const diff = Number((primaryMonthTemp - secondaryMonthTemp).toFixed(2));
    currentMonthValue.textContent = `${primaryLabel}: ${primaryMonthTemp} °C | ${compareLabel}: ${secondaryMonthTemp} °C`;
    currentMonthDesc.textContent =
      diff === 0
        ? "Both countries have the same temperature this month"
        : `${primaryLabel} is ${Math.abs(diff)} °C ${diff > 0 ? "warmer" : "cooler"} this month`;
  } else {
    currentMonthValue.textContent = "-";
    currentMonthDesc.textContent = "Monthly comparison data is unavailable";
  }

  if (primaryYearAvg !== null && secondaryYearAvg !== null) {
    const diff = Number((primaryYearAvg - secondaryYearAvg).toFixed(2));
    yearAverageValue.textContent = `${primaryLabel}: ${primaryYearAvg} °C | ${compareLabel}: ${secondaryYearAvg} °C`;
    yearAverageDesc.textContent =
      diff === 0
        ? "Both countries have the same annual average"
        : `${primaryLabel} is ${Math.abs(diff)} °C ${diff > 0 ? "warmer" : "cooler"} on average`;
  } else {
    yearAverageValue.textContent = "-";
    yearAverageDesc.textContent = "Annual comparison data is unavailable";
  }

  if (primaryTrend !== null && secondaryTrend !== null) {
    const diff = Number((primaryTrend - secondaryTrend).toFixed(2));
    trendValue.textContent = `${primaryLabel}: ${primaryTrend} °C | ${compareLabel}: ${secondaryTrend} °C`;
    trendDesc.textContent =
      diff === 0
        ? "Both countries changed equally over time"
        : `${primaryLabel} changed ${Math.abs(diff)} °C ${diff > 0 ? "more" : "less"} over the full period`;
  } else {
    trendValue.textContent = "-";
    trendDesc.textContent = "Trend comparison data is unavailable";
  }
}

function getMonthName(monthNumber) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthNumber - 1] || "January";
}

function getShortMonthName(monthNumber) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[monthNumber - 1] || "Jan";
}

function populateCountryFilter(countries) {
  const select = document.getElementById("countrySelect");
  const compareSelect = document.getElementById("compareCountrySelect");

  if (select) {
    const previousValue = select.value || "all";
    select.innerHTML = `<option value="all">All Countries</option>`;

    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });

    select.value =
      countries.includes(previousValue) || previousValue === "all"
        ? previousValue
        : "all";
  }

  if (compareSelect) {
    const previousCompare = compareSelect.value || "";
    compareSelect.innerHTML = `<option value="">Select country</option>`;

    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      compareSelect.appendChild(option);
    });

    compareSelect.value = countries.includes(previousCompare) ? previousCompare : "";
  }
}

function updateStats(stats) {
  const avgEl = document.getElementById("avgTemp");
  const hotEl = document.getElementById("hottestCountry");
  const coldEl = document.getElementById("coldestCountry");

  if (avgEl) avgEl.textContent = `${stats.averageTemperature} °C`;
  if (hotEl) hotEl.textContent = `${stats.hottestCountry.country} (${stats.hottestCountry.temperature} °C)`;
  if (coldEl) coldEl.textContent = `${stats.coldestCountry.country} (${stats.coldestCountry.temperature} °C)`;
}

function updateInsights(insights) {
  const globalTrend = document.getElementById("globalTrend");
  const globalTrendDesc = document.getElementById("globalTrendDesc");
  const fastestWarming = document.getElementById("fastestWarming");
  const fastestWarmingDesc = document.getElementById("fastestWarmingDesc");
  const fastestCooling = document.getElementById("fastestCooling");
  const fastestCoolingDesc = document.getElementById("fastestCoolingDesc");
  const decadeChange = document.getElementById("decadeChange");
  const decadeChangeDesc = document.getElementById("decadeChangeDesc");

  if (globalTrend) globalTrend.textContent = insights.globalTrend;
  if (globalTrendDesc) globalTrendDesc.textContent = `${insights.globalTrendSlope} °C per decade`;

  if (fastestWarming) {
    fastestWarming.textContent = insights.fastestWarming ? insights.fastestWarming.country : "-";
  }
  if (fastestWarmingDesc) {
    fastestWarmingDesc.textContent = insights.fastestWarming
      ? `${insights.fastestWarming.perDecade} °C/decade`
      : "-";
  }

  if (fastestCooling) {
    fastestCooling.textContent = insights.fastestCooling ? insights.fastestCooling.country : "-";
  }
  if (fastestCoolingDesc) {
    fastestCoolingDesc.textContent = insights.fastestCooling
      ? `${insights.fastestCooling.perDecade} °C/decade`
      : "-";
  }

  if (decadeChange) decadeChange.textContent = `${insights.decadeAverage} °C`;
  if (decadeChangeDesc) decadeChangeDesc.textContent = "Average long-term change per decade";
}

function updateMapCurrentLabel() {
  const label = document.getElementById("mapCurrentLabel");
  if (label) {
    label.textContent = `${getMonthName(currentSelectedMonth)}, ${currentSelectedYear}`;
  }
}

function groupByYear(data) {
  const map = new Map();
  data.forEach(d => {
    if (!map.has(d.year)) {
      map.set(d.year, []);
    }
    map.get(d.year).push(d);
  });
  return map;
}

function renderLineChart(data) {
  const svg = d3.select("#lineChart");
  svg.selectAll("*").remove();

  if (!data?.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(data, d => d.temperature) - 0.5,
      d3.max(data, d => d.temperature) + 0.5
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.temperature));

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 3)
    .attr("d", line);
}

function renderCompareLineChart(data1, data2, label1, label2) {
  const svg = d3.select("#lineChart");
  svg.selectAll("*").remove();

  if (!data1?.length || !data2?.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 130, bottom: 50, left: 60 };

  const allData = [...data1, ...data2];

  const x = d3.scaleLinear()
    .domain(d3.extent(allData, d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(allData, d => d.temperature) - 0.5,
      d3.max(allData, d => d.temperature) + 0.5
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.temperature));

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  svg.append("path")
    .datum(data1)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 3)
    .attr("d", line);

  svg.append("path")
    .datum(data2)
    .attr("fill", "none")
    .attr("stroke", "#ef4444")
    .attr("stroke-width", 3)
    .attr("d", line);

  svg.append("text")
    .attr("x", width - 115)
    .attr("y", margin.top + 10)
    .attr("fill", "#2563eb")
    .attr("font-weight", "bold")
    .text(label1);

  svg.append("text")
    .attr("x", width - 115)
    .attr("y", margin.top + 32)
    .attr("fill", "#ef4444")
    .attr("font-weight", "bold")
    .text(label2);
}

function renderBarChart(data) {
  const svg = d3.select("#barChart");
  svg.selectAll("*").remove();

  const tooltip = d3.select("#tooltip");
  const topData = [...data].sort((a, b) => b.temperature - a.temperature).slice(0, 15);

  if (!topData.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 30, bottom: 110, left: 60 };

  const x = d3.scaleBand()
    .domain(topData.map(d => d.country))
    .range([margin.left, width - margin.right])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.temperature) || 0])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .style("font-size", "11px");

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(topData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.country))
    .attr("y", d => y(d.temperature))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d.temperature))
    .attr("rx", 4)
    .attr("fill", "#10b981")
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#059669");
      tooltip
        .style("opacity", 1)
        .html(`
          <div class="tooltip-title">${d.country}</div>
          <div>Temperature: <span class="tooltip-value">${d.temperature} °C</span></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", event.pageX + 14 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#10b981");
      tooltip.style("opacity", 0);
    });
}

function renderCompareBarChart(primaryPoint, comparePoint, primaryLabel, compareLabel) {
  const svg = d3.select("#barChart");
  svg.selectAll("*").remove();

  const tooltip = d3.select("#tooltip");

  const data = [
    { country: primaryLabel, temperature: primaryPoint?.temperature ?? 0, color: "#2563eb" },
    { country: compareLabel, temperature: comparePoint?.temperature ?? 0, color: "#ef4444" }
  ];

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 30, bottom: 70, left: 60 };

  const x = d3.scaleBand()
    .domain(data.map(d => d.country))
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.temperature) + 2 || 5])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.country))
    .attr("y", d => y(d.temperature))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d.temperature))
    .attr("rx", 6)
    .attr("fill", d => d.color)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      tooltip
        .style("opacity", 1)
        .html(`
          <div class="tooltip-title">${d.country}</div>
          <div>Temperature: <span class="tooltip-value">${d.temperature} °C</span></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", event.pageX + 14 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });
}

function renderCountryRadialChart(data, selectedMonth = 1) {
  const svg = d3.select("#countryRadialChart");
  svg.selectAll("*").remove();

  if (!data?.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 55;

  const centerCountry = data[0]?.country || "Country";
  const centerYear = data[0]?.year || "";

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const normalizedData = monthNames.map((label, index) => {
    const item = data.find(d => d.month === index + 1);
    return {
      month: index + 1,
      label,
      temperature: item ? item.temperature : null
    };
  }).filter(d => d.temperature !== null);

  if (!normalizedData.length) return;

  const angle = d3.scaleBand()
    .domain(normalizedData.map(d => d.month))
    .range([0, 2 * Math.PI]);

  const minTemp = d3.min(normalizedData, d => d.temperature);
  const maxTemp = d3.max(normalizedData, d => d.temperature);

  const r = d3.scaleLinear()
    .domain([minTemp - 2, maxTemp + 2])
    .range([55, radius]);

  const color = d3.scaleSequential()
    .domain([minTemp, maxTemp])
    .interpolator(d3.interpolateTurbo);

  const radialLine = d3.lineRadial()
    .angle(d => angle(d.month) + angle.bandwidth() / 2)
    .radius(d => r(d.temperature))
    .curve(d3.curveCardinalClosed);

  const ringValues = d3.range(
    Math.floor(minTemp / 5) * 5,
    Math.ceil(maxTemp / 5) * 5 + 1,
    5
  );

  g.selectAll(".country-ring")
    .data(ringValues)
    .enter()
    .append("circle")
    .attr("r", d => r(d))
    .attr("fill", "none")
    .attr("stroke", "#d1d5db")
    .attr("stroke-dasharray", "3,3");

  g.selectAll(".country-ring-label")
    .data(ringValues)
    .enter()
    .append("text")
    .attr("y", d => -r(d))
    .attr("dy", -3)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#6b7280")
    .text(d => `${d}°C`);

  g.selectAll(".country-month-label")
    .data(normalizedData)
    .enter()
    .append("text")
    .attr("x", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 16))
    .attr("y", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 16))
    .attr("text-anchor", "middle")
    .attr("font-size", d => d.month === selectedMonth ? "12px" : "10px")
    .attr("font-weight", d => d.month === selectedMonth ? "bold" : "normal")
    .attr("fill", d => d.month === selectedMonth ? "#111827" : "#374151")
    .text(d => d.label);

  g.append("path")
    .datum(normalizedData)
    .attr("fill", "rgba(37, 99, 235, 0.08)")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5)
    .attr("d", radialLine);

  const tooltip = d3.select("#tooltip");

  g.selectAll(".country-radial-point")
    .data(normalizedData)
    .enter()
    .append("circle")
    .attr("cx", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("cy", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("r", d => d.month === selectedMonth ? 6 : 4)
    .attr("fill", d => d.month === selectedMonth ? "#111827" : color(d.temperature))
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 7);

      tooltip
        .style("opacity", 1)
        .html(`
          <div class="tooltip-title">${centerCountry}</div>
          <div>Month: <span class="tooltip-value">${d.label}</span></div>
          <div>Temperature: <span class="tooltip-value">${d.temperature} °C</span></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 14 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("r", d.month === selectedMonth ? 6 : 4);
      tooltip.style("opacity", 0);
    });

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -8)
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .attr("fill", "#111827")
    .text(centerCountry);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 14)
    .attr("font-size", "12px")
    .attr("fill", "#6b7280")
    .text(centerYear);
}

function renderCompareCountryRadialChart(primaryData, secondaryData, selectedMonth, primaryLabel, secondaryLabel) {
  const svg = d3.select("#countryRadialChart");
  svg.selectAll("*").remove();

  if (!primaryData?.length || !secondaryData?.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 55;

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const normalize = (data) =>
    monthNames.map((label, index) => {
      const item = data.find(d => d.month === index + 1);
      return {
        month: index + 1,
        label,
        temperature: item ? item.temperature : null
      };
    }).filter(d => d.temperature !== null);

  const primaryNormalized = normalize(primaryData);
  const secondaryNormalized = normalize(secondaryData);
  const allNormalized = [...primaryNormalized, ...secondaryNormalized];

  if (!allNormalized.length) return;

  const angle = d3.scaleBand()
    .domain(primaryNormalized.map(d => d.month))
    .range([0, 2 * Math.PI]);

  const minTemp = d3.min(allNormalized, d => d.temperature);
  const maxTemp = d3.max(allNormalized, d => d.temperature);

  const r = d3.scaleLinear()
    .domain([minTemp - 2, maxTemp + 2])
    .range([55, radius]);

  const radialLine = d3.lineRadial()
    .angle(d => angle(d.month) + angle.bandwidth() / 2)
    .radius(d => r(d.temperature))
    .curve(d3.curveCardinalClosed);

  const ringValues = d3.range(
    Math.floor(minTemp / 5) * 5,
    Math.ceil(maxTemp / 5) * 5 + 1,
    5
  );

  g.selectAll(".compare-ring")
    .data(ringValues)
    .enter()
    .append("circle")
    .attr("r", d => r(d))
    .attr("fill", "none")
    .attr("stroke", "#d1d5db")
    .attr("stroke-dasharray", "3,3");

  g.selectAll(".compare-ring-label")
    .data(ringValues)
    .enter()
    .append("text")
    .attr("y", d => -r(d))
    .attr("dy", -3)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#6b7280")
    .text(d => `${d}°C`);

  g.selectAll(".compare-month-label")
    .data(primaryNormalized)
    .enter()
    .append("text")
    .attr("x", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 16))
    .attr("y", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 16))
    .attr("text-anchor", "middle")
    .attr("font-size", d => d.month === selectedMonth ? "12px" : "10px")
    .attr("font-weight", d => d.month === selectedMonth ? "bold" : "normal")
    .attr("fill", d => d.month === selectedMonth ? "#111827" : "#374151")
    .text(d => d.label);

  g.append("path")
    .datum(primaryNormalized)
    .attr("fill", "rgba(37, 99, 235, 0.08)")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5)
    .attr("d", radialLine);

  g.append("path")
    .datum(secondaryNormalized)
    .attr("fill", "rgba(239, 68, 68, 0.08)")
    .attr("stroke", "#ef4444")
    .attr("stroke-width", 2.5)
    .attr("d", radialLine);

  g.selectAll(".primary-point")
    .data(primaryNormalized)
    .enter()
    .append("circle")
    .attr("cx", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("cy", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("r", d => d.month === selectedMonth ? 6 : 4)
    .attr("fill", "#2563eb");

  g.selectAll(".secondary-point")
    .data(secondaryNormalized)
    .enter()
    .append("circle")
    .attr("cx", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("cy", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("r", d => d.month === selectedMonth ? 6 : 4)
    .attr("fill", "#ef4444");

  g.append("text")
    .attr("x", -radius + 10)
    .attr("y", -radius + 10)
    .attr("fill", "#2563eb")
    .attr("font-weight", "bold")
    .text(primaryLabel);

  g.append("text")
    .attr("x", -radius + 10)
    .attr("y", -radius + 30)
    .attr("fill", "#ef4444")
    .attr("font-weight", "bold")
    .text(secondaryLabel);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -6)
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .attr("fill", "#111827")
    .text(currentSelectedYear);
}

function renderMapLegend(svg, colorScale, minTemp, maxTemp, width, height) {
  const legendWidth = 280;
  const legendHeight = 14;
  const legendX = width / 2 - legendWidth / 2;
  const legendY = height - 42;

  const defs = svg.append("defs");

  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  linearGradient.selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .enter()
    .append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => colorScale(minTemp + d * (maxTemp - minTemp)));

  svg.append("rect")
    .attr("x", legendX - 18)
    .attr("y", legendY - 30)
    .attr("width", legendWidth + 36)
    .attr("height", 60)
    .attr("rx", 12)
    .attr("fill", "white")
    .attr("opacity", 0.96);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", legendY - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "#374151")
    .attr("font-size", "13px")
    .text("Temperature scale");

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 7)
    .attr("fill", "url(#legend-gradient)");

  svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY + 34)
    .attr("fill", "#374151")
    .attr("font-size", "12px")
    .text(`${minTemp.toFixed(1)} °C`);

  svg.append("text")
    .attr("x", legendX + legendWidth)
    .attr("y", legendY + 34)
    .attr("text-anchor", "end")
    .attr("fill", "#374151")
    .attr("font-size", "12px")
    .text(`${maxTemp.toFixed(1)} °C`);
}

function renderAnomalyChart(yearData, selectedMonth = 1) {
  const svg = d3.select("#anomalyChart");
  svg.selectAll("*").remove();

  if (!yearData?.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 60;

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const tooltip = d3.select("#tooltip");

  const monthsOrder = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const selectedShortMonth = getShortMonthName(selectedMonth);

  const normalizedData = monthsOrder
    .map(month => yearData.find(d => d.month === month))
    .filter(Boolean);

  if (!normalizedData.length) return;

  const minValue = d3.min(normalizedData, d => d.value);
  const maxValue = d3.max(normalizedData, d => d.value);

  const ringMin = Math.floor((minValue - 0.1) * 2) / 2;
  const ringMax = Math.ceil((maxValue + 0.1) * 2) / 2;

  const ringValues = [];
  for (let v = ringMin; v <= ringMax + 0.001; v += 0.5) {
    ringValues.push(Number(v.toFixed(1)));
  }

  const angle = d3.scaleBand()
    .domain(monthsOrder)
    .range([0, 2 * Math.PI]);

  const r = d3.scaleLinear()
    .domain([ringMin, ringMax])
    .range([70, radius]);

  const color = d3.scaleSequential()
    .domain([ringMin, ringMax])
    .interpolator(d3.interpolateRdYlBu);

  const radialLine = d3.lineRadial()
    .angle(d => angle(d.month) + angle.bandwidth() / 2)
    .radius(d => r(d.value))
    .curve(d3.curveCardinalClosed);

  g.selectAll(".anomaly-ring")
    .data(ringValues)
    .enter()
    .append("circle")
    .attr("r", d => r(d))
    .attr("fill", "none")
    .attr("stroke", "#d1d5db")
    .attr("stroke-dasharray", "3,3");

  g.selectAll(".anomaly-ring-label")
    .data(ringValues)
    .enter()
    .append("text")
    .attr("y", d => -r(d))
    .attr("dy", -3)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#6b7280")
    .text(d => `${d.toFixed(1)}°C`);

  g.selectAll(".anomaly-month-label")
    .data(monthsOrder)
    .enter()
    .append("text")
    .attr("x", d => Math.cos(angle(d) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 16))
    .attr("y", d => Math.sin(angle(d) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 16))
    .attr("text-anchor", "middle")
    .attr("font-size", d => d === selectedShortMonth ? "12px" : "10px")
    .attr("font-weight", d => d === selectedShortMonth ? "bold" : "normal")
    .attr("fill", d => d === selectedShortMonth ? "#111827" : "#374151")
    .text(d => d);

  g.append("path")
    .datum(normalizedData)
    .attr("fill", "rgba(239, 68, 68, 0.08)")
    .attr("stroke", "#ef4444")
    .attr("stroke-width", 2.5)
    .attr("d", radialLine);

  g.selectAll(".anomaly-point")
    .data(normalizedData)
    .enter()
    .append("circle")
    .attr("cx", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.value))
    .attr("cy", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.value))
    .attr("r", d => d.month === selectedShortMonth ? 6 : 4)
    .attr("fill", d => d.month === selectedShortMonth ? "#111827" : color(d.value))
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 7);

      tooltip
        .style("opacity", 1)
        .html(`
          <div class="tooltip-title">Global Temperature Anomaly</div>
          <div>Month: <span class="tooltip-value">${d.month}</span></div>
          <div>Value: <span class="tooltip-value">${d.value.toFixed(2)} °C</span></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 14 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("r", d.month === selectedShortMonth ? 6 : 4);
      tooltip.style("opacity", 0);
    });

  const currentYear = normalizedData[0]?.year ?? "";
  const selectedMonthPoint = normalizedData.find(d => d.month === selectedShortMonth);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -10)
    .attr("font-size", "28px")
    .attr("font-weight", "bold")
    .attr("fill", "#111827")
    .text(currentYear);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 14)
    .attr("font-size", "12px")
    .attr("fill", "#6b7280")
    .text("Global anomaly");

  if (selectedMonthPoint) {
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 34)
      .attr("font-size", "12px")
      .attr("fill", "#374151")
      .text(`${selectedMonthPoint.month}: ${selectedMonthPoint.value.toFixed(2)} °C`);
  }
}

function updateAnomalyByYear(year) {
  if (!anomalyGroupedData) return;
  const yearLabel = document.getElementById("yearLabel");
  if (yearLabel) yearLabel.textContent = `Year: ${year}`;
  const yearData = anomalyGroupedData.get(Number(year));
  renderAnomalyChart(yearData, currentSelectedMonth);
}

function setupAnomalyAnimation(groupedData) {
  anomalyGroupedData = groupedData;
  anomalyYears = [...groupedData.keys()].sort((a, b) => a - b);

  const playBtn = document.getElementById("playBtn");
  const yearSlider = document.getElementById("yearSlider");
  const monthSlider = document.getElementById("monthSlider");
  const selectedYearLabel = document.getElementById("selectedYear");
  const selectedMonthLabel = document.getElementById("selectedMonth");
  const monthLabel = document.getElementById("monthLabel");

  if (!playBtn || !anomalyYears.length) return;

  playBtn.onclick = () => {
    if (anomalyAnimationInterval) {
      clearInterval(anomalyAnimationInterval);
      anomalyAnimationInterval = null;
      playBtn.textContent = "Play";
      return;
    }

    playBtn.textContent = "Pause";

    anomalyAnimationInterval = setInterval(async () => {
      let nextYear = currentSelectedYear;
      let nextMonth = currentSelectedMonth + 1;

      if (nextMonth > 12) {
        nextMonth = 1;
        const currentIndex = anomalyYears.indexOf(Number(currentSelectedYear));
        const nextIndex = (currentIndex + 1) % anomalyYears.length;
        nextYear = anomalyYears[nextIndex];
      }

      currentSelectedYear = Number(nextYear);
      currentSelectedMonth = Number(nextMonth);

      if (yearSlider) yearSlider.value = currentSelectedYear;
      if (monthSlider) monthSlider.value = currentSelectedMonth;
      if (selectedYearLabel) selectedYearLabel.textContent = String(currentSelectedYear);
      if (selectedMonthLabel) selectedMonthLabel.textContent = getMonthName(currentSelectedMonth);
      if (monthLabel) monthLabel.textContent = `Month: ${getMonthName(currentSelectedMonth)}`;

      await updateDashboard(currentSelectedCountry);
    }, 350);
  };

  updateAnomalyByYear(currentSelectedYear);
}

async function renderWorldMap(climateData, selectedCountry = "all", compareCountryName = null) {
  const geoData = await d3.json("data/world.geojson");

  const svg = d3.select("#worldMap");
  svg.selectAll("*").remove();

  const tooltip = d3.select("#tooltip");

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const mapAreaHeight = height - 90;

  const projection = d3.geoNaturalEarth1()
    .scale(width / 6.3)
    .translate([width / 2, mapAreaHeight / 2 + 10]);

  const path = d3.geoPath().projection(projection);

  const temperatureMap = new Map(
    climateData.map(d => [d.code.toLowerCase(), d.temperature])
  );

  const selectedCountryCode =
    selectedCountry === "all"
      ? null
      : [...globalCountryCodeMap.entries()].find(([, country]) => country === selectedCountry)?.[0] || null;

  const compareCountryCode =
    compareCountryName
      ? [...globalCountryCodeMap.entries()].find(([, country]) => country === compareCountryName)?.[0] || null
      : null;

  const minTemp = climateData.length ? d3.min(climateData, d => d.temperature) : 0;
  const maxTemp = climateData.length ? d3.max(climateData, d => d.temperature) : 1;

  const colorScale = d3.scaleSequential()
    .domain([minTemp, maxTemp])
    .interpolator(d3.interpolateYlOrRd);

  svg.selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", d => {
      const code = d.properties.cca2?.toLowerCase();
      const value = temperatureMap.get(code);
      return value !== undefined ? colorScale(value) : "#d1d5db";
    })
    .attr("stroke", d => {
      const code = d.properties.cca2?.toLowerCase();
      if (code === compareCountryCode) return "#ef4444";
      if (code === selectedCountryCode) return "#111827";
      return "#ffffff";
    })
    .attr("stroke-width", d => {
      const code = d.properties.cca2?.toLowerCase();
      if (code === compareCountryCode) return 2;
      if (code === selectedCountryCode) return 2;
      return 0.7;
    })
    .style("cursor", d => {
      const code = d.properties.cca2?.toLowerCase();
      return globalCountryCodeMap.has(code) ? "pointer" : "default";
    })
    .on("mouseover", function (event, d) {
      const code = d.properties.cca2?.toLowerCase();
      const value = temperatureMap.get(code);
      const name = globalCountryCodeMap.get(code) || d.properties.name || "Unknown";

      tooltip
        .style("opacity", 1)
        .html(`
          <div class="tooltip-title">${name}</div>
          <div>Temperature: <span class="tooltip-value">${value !== undefined ? value + " °C" : "No data"}</span></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", event.pageX + 14 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    })
    .on("click", async function (event, d) {
      const code = d.properties.cca2?.toLowerCase();
      const clickedCountry = globalCountryCodeMap.get(code);
      if (!clickedCountry) return;

      compareMode = false;
      compareCountry = null;

      const toggle = document.getElementById("compareToggle");
      const compareSelect = document.getElementById("compareCountrySelect");
      if (toggle) toggle.checked = false;
      if (compareSelect) {
        compareSelect.disabled = true;
        compareSelect.value = "";
      }

      currentSelectedCountry = clickedCountry;

      const countrySelect = document.getElementById("countrySelect");
      if (countrySelect) countrySelect.value = clickedCountry;

      await updateDashboard(clickedCountry);
    });

  renderMapLegend(svg, colorScale, minTemp, maxTemp, width, height);
}

async function updateDashboard(selectedCountry = "all") {
  currentSelectedCountry = selectedCountry;

  const [countries, stats, insights, monthlyMapDataAll] = await Promise.all([
    fetchCountries(),
    fetchStats(selectedCountry, currentSelectedYear),
    fetchInsights(selectedCountry),
    fetchMonthlyByYear(currentSelectedYear, currentSelectedMonth, "all")
  ]);

  populateCountryFilter(countries);
  updateStats(stats);
  updateInsights(insights);
  updateMapCurrentLabel();

  const effectivePrimaryCountry = selectedCountry === "all" ? "Canada" : selectedCountry;

  if (compareMode && compareCountry && selectedCountry !== "all" && compareCountry !== selectedCountry) {
  const [
    primaryLineData,
    secondaryLineData,
    primaryRadialData,
    secondaryRadialData,
    compareMonthlyPointData
  ] = await Promise.all([
    fetchLineData(selectedCountry),
    fetchLineData(compareCountry),
    fetchMonthlyRadialData(effectivePrimaryCountry, currentSelectedYear),
    fetchMonthlyRadialData(compareCountry, currentSelectedYear),
    fetchMonthlyByYear(currentSelectedYear, currentSelectedMonth, compareCountry)
  ]);

  const primaryMonthlyPoint = monthlyMapDataAll.find(d => d.country === selectedCountry) || null;
  const secondaryMonthlyPoint = compareMonthlyPointData.find(d => d.country === compareCountry) || null;

  renderCompareLineChart(primaryLineData, secondaryLineData, selectedCountry, compareCountry);
  renderCompareCountryRadialChart(
    primaryRadialData,
    secondaryRadialData,
    currentSelectedMonth,
    selectedCountry,
    compareCountry
  );
  renderCompareBarChart(
    primaryMonthlyPoint,
    secondaryMonthlyPoint,
    selectedCountry,
    compareCountry
  );
  renderWorldMap(monthlyMapDataAll, selectedCountry, compareCountry);

  updateCompareSummary(
    selectedCountry,
    compareCountry,
    primaryLineData,
    secondaryLineData,
    primaryMonthlyPoint,
    secondaryMonthlyPoint
  );
} else {
  const [lineData, radialData] = await Promise.all([
    fetchLineData(selectedCountry),
    fetchMonthlyRadialData(effectivePrimaryCountry, currentSelectedYear)
  ]);

  renderLineChart(lineData);
  renderCountryRadialChart(radialData, currentSelectedMonth);
  renderBarChart(monthlyMapDataAll);
  renderWorldMap(monthlyMapDataAll, selectedCountry, null);

  hideCompareSummary();
}

  updateAnomalyByYear(currentSelectedYear);

  const countrySelect = document.getElementById("countrySelect");
  if (countrySelect) {
    countrySelect.value = selectedCountry;
  }
}

function setupFilterListener() {
  const select = document.getElementById("countrySelect");
  if (!select) return;

  select.addEventListener("change", async (e) => {
    await updateDashboard(e.target.value);
  });
}

function setupCompareMode() {
  const toggle = document.getElementById("compareToggle");
  const compareSelect = document.getElementById("compareCountrySelect");

  if (!toggle || !compareSelect) return;

  toggle.addEventListener("change", async () => {
    compareMode = toggle.checked;
    compareSelect.disabled = !compareMode;

    if (!compareMode) {
      compareCountry = null;
      compareSelect.value = "";
    }

    await updateDashboard(currentSelectedCountry);
  });

  compareSelect.addEventListener("change", async (e) => {
    compareCountry = e.target.value || null;
    await updateDashboard(currentSelectedCountry);
  });
}

function setupYearSlider() {
  const slider = document.getElementById("yearSlider");
  const label = document.getElementById("selectedYear");
  const playBtn = document.getElementById("playBtn");

  if (!slider) return;

  slider.addEventListener("input", async (e) => {
    if (anomalyAnimationInterval) {
      clearInterval(anomalyAnimationInterval);
      anomalyAnimationInterval = null;
      if (playBtn) playBtn.textContent = "Play";
    }

    currentSelectedYear = Number(e.target.value);
    if (label) label.textContent = String(currentSelectedYear);

    await updateDashboard(currentSelectedCountry);
  });
}

function setupMonthSlider() {
  const slider = document.getElementById("monthSlider");
  const label = document.getElementById("selectedMonth");
  const topLabel = document.getElementById("monthLabel");
  const playBtn = document.getElementById("playBtn");

  if (!slider) return;

  slider.addEventListener("input", async (e) => {
    if (anomalyAnimationInterval) {
      clearInterval(anomalyAnimationInterval);
      anomalyAnimationInterval = null;
      if (playBtn) playBtn.textContent = "Play";
    }

    currentSelectedMonth = Number(e.target.value);
    const monthName = getMonthName(currentSelectedMonth);

    if (label) label.textContent = monthName;
    if (topLabel) topLabel.textContent = `Month: ${monthName}`;

    await updateDashboard(currentSelectedCountry);
  });
}

async function init() {
  const countryCodes = await fetchCountryCodes();
  globalCountryCodeMap = new Map(
    countryCodes.map(item => [item.code.toLowerCase(), item.country])
  );

  setupFilterListener();
  setupCompareMode();
  setupYearSlider();
  setupMonthSlider();

  const yearLabel = document.getElementById("selectedYear");
  if (yearLabel) yearLabel.textContent = String(currentSelectedYear);

  const monthLabel = document.getElementById("selectedMonth");
  const topMonthLabel = document.getElementById("monthLabel");
  if (monthLabel) monthLabel.textContent = getMonthName(currentSelectedMonth);
  if (topMonthLabel) topMonthLabel.textContent = `Month: ${getMonthName(currentSelectedMonth)}`;

  updateMapCurrentLabel();

  const anomalyRaw = await fetchAnomalyData();
  const grouped = groupByYear(anomalyRaw);
  setupAnomalyAnimation(grouped);

  await updateDashboard("all");
  updateAnomalyByYear(currentSelectedYear);
}

init();