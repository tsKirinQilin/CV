let currentSelectedCountry = "all";
let currentSelectedYear = 2020;
let currentSelectedMonth = 1;
let anomalyGroupedData = null;
let anomalyYears = [];
let anomalyAnimationInterval = null;

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
  if (year) query.set("year", year);

  const response = await fetch(`/api/stats?${query.toString()}`);
  return await response.json();
}

async function fetchCountries() {
  const response = await fetch("/api/countries");
  return await response.json();
}

async function fetchByYear(year, country = "all") {
  const query = new URLSearchParams({ year, country });
  const response = await fetch(`/api/by-year?${query.toString()}`);
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
  select.innerHTML = `<option value="all">All Countries</option>`;

  countries.forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    select.appendChild(option);
  });
}

function updateStats(stats) {
  document.getElementById("avgTemp").textContent = `${stats.averageTemperature} °C`;
  document.getElementById("hottestCountry").textContent =
    `${stats.hottestCountry.country} (${stats.hottestCountry.temperature} °C)`;
  document.getElementById("coldestCountry").textContent =
    `${stats.coldestCountry.country} (${stats.coldestCountry.temperature} °C)`;
}

function updateMapCurrentLabel() {
  const label = document.getElementById("mapCurrentLabel");
  if (label) {
    label.textContent = `${getMonthName(currentSelectedMonth)}, ${currentSelectedYear}`;
  }
}

function renderLineChart(data) {
  const svg = d3.select("#lineChart");
  svg.selectAll("*").remove();

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

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "#374151")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("fill", "#374151")
    .text("Temperature (°C)");

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 3)
    .attr("d", line);

  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.temperature))
    .attr("r", 3.5)
    .attr("fill", "#2563eb");
}

function renderBarChart(data) {
  const svg = d3.select("#barChart");
  svg.selectAll("*").remove();

  const topData = [...data]
    .sort((a, b) => b.temperature - a.temperature)
    .slice(0, 15);

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 30, bottom: 110, left: 60 };

  const x = d3.scaleBand()
    .domain(topData.map(d => d.country))
    .range([margin.left, width - margin.right])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.temperature)])
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

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 18)
    .attr("text-anchor", "middle")
    .attr("fill", "#374151")
    .text("Top 15 Countries");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("fill", "#374151")
    .text("Temperature (°C)");

  svg.selectAll("rect")
    .data(topData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.country))
    .attr("y", d => y(d.temperature))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d.temperature))
    .attr("rx", 4)
    .attr("fill", "#10b981");
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

function renderAnomalyChart(yearData, selectedMonth = 1) {
  const svg = d3.select("#anomalyChart");
  svg.selectAll("*").remove();

  if (!yearData || !yearData.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 60;

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const monthsOrder = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const selectedShortMonth = getShortMonthName(selectedMonth);

  const normalizedData = monthsOrder
    .map(month => yearData.find(d => d.month === month))
    .filter(Boolean);

  const angle = d3.scaleBand()
    .domain(monthsOrder)
    .range([0, 2 * Math.PI]);

  const r = d3.scaleLinear()
    .domain([-0.6, 1.2])
    .range([70, radius]);

  const color = d3.scaleSequential()
    .domain([-0.6, 1.2])
    .interpolator(d3.interpolateRdYlBu);

  const radialLine = d3.lineRadial()
    .angle(d => angle(d.month) + angle.bandwidth() / 2)
    .radius(d => r(d.value))
    .curve(d3.curveCardinalClosed);

  const ringValues = [-0.5, 0, 0.5, 1.0];

  g.selectAll(".ring")
    .data(ringValues)
    .enter()
    .append("circle")
    .attr("class", "ring")
    .attr("r", d => r(d))
    .attr("fill", "none")
    .attr("stroke", "#d1d5db")
    .attr("stroke-dasharray", "3,3");

  g.selectAll(".ring-label")
    .data(ringValues)
    .enter()
    .append("text")
    .attr("class", "ring-label")
    .attr("y", d => -r(d))
    .attr("dy", -4)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#6b7280")
    .text(d => `${d}°C`);

  g.selectAll(".month-label")
    .data(monthsOrder)
    .enter()
    .append("text")
    .attr("class", "month-label")
    .attr("x", d => Math.cos(angle(d) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 18))
    .attr("y", d => Math.sin(angle(d) + angle.bandwidth() / 2 - Math.PI / 2) * (radius + 18))
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
    .attr("class", "anomaly-point")
    .attr("cx", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.value))
    .attr("cy", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.value))
    .attr("r", d => d.month === selectedShortMonth ? 6 : 4)
    .attr("fill", d => d.month === selectedShortMonth ? "#111827" : color(d.value));

  const currentYear = normalizedData[0]?.year ?? "";
  const selectedMonthPoint = normalizedData.find(d => d.month === selectedShortMonth);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -8)
    .attr("font-size", "28px")
    .attr("font-weight", "bold")
    .attr("fill", "#111827")
    .text(currentYear);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 16)
    .attr("font-size", "12px")
    .attr("fill", "#6b7280")
    .text("Global anomaly");

  if (selectedMonthPoint) {
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 36)
      .attr("font-size", "12px")
      .attr("fill", "#374151")
      .text(`${selectedMonthPoint.month}: ${selectedMonthPoint.value.toFixed(2)} °C`);
  }
}

function renderCountryRadialChart(data, selectedMonth = 1) {
  const svg = d3.select("#countryRadialChart");
  svg.selectAll("*").remove();

  if (!data || !data.length) return;

  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const radius = Math.min(width, height) / 2 - 55;

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
    .attr("stroke", "#d1d5db");

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

  g.selectAll(".country-radial-point")
    .data(normalizedData)
    .enter()
    .append("circle")
    .attr("cx", d => Math.cos(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("cy", d => Math.sin(angle(d.month) + angle.bandwidth() / 2 - Math.PI / 2) * r(d.temperature))
    .attr("r", d => d.month === selectedMonth ? 6 : 4)
    .attr("fill", d => d.month === selectedMonth ? "#111827" : color(d.temperature));

  const centerCountry = data[0]?.country || "Country";
  const centerYear = data[0]?.year || "";

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

function updateAnomalyByYear(year) {
  if (!anomalyGroupedData) return;

  const yearLabel = document.getElementById("yearLabel");
  if (yearLabel) {
    yearLabel.textContent = `Year: ${year}`;
  }

  const yearData = anomalyGroupedData.get(Number(year));
  renderAnomalyChart(yearData, currentSelectedMonth);
}

function setupAnomalyAnimation(groupedData) {
  anomalyGroupedData = groupedData;
  anomalyYears = [...groupedData.keys()].sort((a, b) => a - b);

  const playBtn = document.getElementById("playBtn");
  if (!playBtn || !anomalyYears.length) return;

  playBtn.onclick = () => {
    if (anomalyAnimationInterval) {
      clearInterval(anomalyAnimationInterval);
      anomalyAnimationInterval = null;
      playBtn.textContent = "Play";
      return;
    }

    playBtn.textContent = "Pause";

    anomalyAnimationInterval = setInterval(() => {
      const currentIndex = anomalyYears.indexOf(Number(currentSelectedYear));
      const nextIndex = (currentIndex + 1) % anomalyYears.length;
      const nextYear = anomalyYears[nextIndex];

      const yearSlider = document.getElementById("yearSlider");
      const selectedYearLabel = document.getElementById("selectedYear");

      currentSelectedYear = nextYear;

      if (yearSlider) yearSlider.value = nextYear;
      if (selectedYearLabel) selectedYearLabel.textContent = String(nextYear);

      updateByYear(nextYear, currentSelectedCountry);
    }, 700);
  };

  updateAnomalyByYear(currentSelectedYear);
}

async function renderWorldMap(climateData, selectedCountry = "all") {
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

  const countryNameMap = new Map(
    climateData.map(d => [d.code.toLowerCase(), d.country])
  );

  const selectedCountryCode = selectedCountry === "all"
    ? null
    : climateData.find(d => d.country === selectedCountry)?.code?.toLowerCase();

  const minTemp = d3.min(climateData, d => d.temperature);
  const maxTemp = d3.max(climateData, d => d.temperature);

  const colorScale = d3.scaleSequential()
    .domain([minTemp, maxTemp])
    .interpolator(d3.interpolateYlOrRd);

  const countriesGroup = svg.append("g");

  countriesGroup.selectAll("path")
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
      return code === selectedCountryCode ? "#111827" : "#ffffff";
    })
    .attr("stroke-width", d => {
      const code = d.properties.cca2?.toLowerCase();
      return code === selectedCountryCode ? 2 : 0.7;
    })
    .style("transition", "transform 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease")
    .style("transform-box", "fill-box")
    .style("transform-origin", "center")
    .on("mouseover", function (event, d) {
      const code = d.properties.cca2?.toLowerCase();
      const value = temperatureMap.get(code);
      const name = countryNameMap.get(code) || d.properties.name || "Unknown";

      d3.select(this)
        .raise()
        .attr("stroke", "#111827")
        .attr("stroke-width", 1.5)
        .style("filter", "brightness(1.05)")
        .style("transform", "scale(1.02)");

      tooltip
        .style("opacity", 1)
        .html(`
          <div class="tooltip-title">${name}</div>
          <div>Temperature: <span class="tooltip-value">${value !== undefined ? value + " °C" : "No data"}</span></div>
          <div>Code: <span class="tooltip-value">${code ? code.toUpperCase() : "-"}</span></div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 14 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function (event, d) {
      const code = d.properties.cca2?.toLowerCase();
      const isSelected = code === selectedCountryCode;

      d3.select(this)
        .attr("stroke", isSelected ? "#111827" : "#ffffff")
        .attr("stroke-width", isSelected ? 2 : 0.7)
        .style("filter", "none")
        .style("transform", "scale(1)");

      tooltip.style("opacity", 0);
    });

  renderMapLegend(svg, colorScale, minTemp, maxTemp, width, height);
}

async function updateDashboard(selectedCountry = "all") {
  const [countries, latestData, lineData, stats] = await Promise.all([
    fetchCountries(),
    fetchLatestData(),
    fetchLineData(selectedCountry),
    fetchStats(selectedCountry)
  ]);

  populateCountryFilter(countries);
  updateStats(stats);
  renderBarChart(latestData);
  renderLineChart(lineData);
  renderWorldMap(latestData, selectedCountry);

  document.getElementById("countrySelect").value = selectedCountry;
}

async function updateByYear(year, selectedCountry = "all") {
  const effectiveCountry = selectedCountry === "all" ? "Canada" : selectedCountry;

  const [data, stats, radialData] = await Promise.all([
    fetchByYear(year, selectedCountry),
    fetchStats(selectedCountry, year),
    fetchMonthlyRadialData(effectiveCountry, year)
  ]);

  currentSelectedYear = Number(year);
  currentSelectedCountry = selectedCountry;

  updateStats(stats);
  updateMapCurrentLabel();
  renderBarChart(data);
  renderWorldMap(data, selectedCountry);
  renderCountryRadialChart(radialData, currentSelectedMonth);
  updateAnomalyByYear(year);
}

function setupFilterListener() {
  const select = document.getElementById("countrySelect");

  select.addEventListener("change", async (e) => {
    currentSelectedCountry = e.target.value;
    await updateDashboard(currentSelectedCountry);

    const yearSlider = document.getElementById("yearSlider");
    if (yearSlider) {
      await updateByYear(yearSlider.value, currentSelectedCountry);
    }
  });
}

function setupYearSlider() {
  const slider = document.getElementById("yearSlider");
  const label = document.getElementById("selectedYear");

  slider.addEventListener("input", async (e) => {
    const year = Number(e.target.value);
    label.textContent = String(year);
    await updateByYear(year, currentSelectedCountry);
  });
}

function setupMonthSlider() {
  const slider = document.getElementById("monthSlider");
  const label = document.getElementById("selectedMonth");
  const topLabel = document.getElementById("monthLabel");

  slider.addEventListener("input", async (e) => {
    const month = Number(e.target.value);
    currentSelectedMonth = month;

    const monthName = getMonthName(month);
    label.textContent = monthName;
    if (topLabel) topLabel.textContent = `Month: ${monthName}`;

    updateMapCurrentLabel();
    updateAnomalyByYear(currentSelectedYear);

    const effectiveCountry = currentSelectedCountry === "all" ? "Canada" : currentSelectedCountry;
    const radialData = await fetchMonthlyRadialData(effectiveCountry, currentSelectedYear);
    renderCountryRadialChart(radialData, currentSelectedMonth);
  });
}

async function init() {
  await updateDashboard("all");
  setupFilterListener();
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

  const initialRadialCountry = currentSelectedCountry === "all" ? "Canada" : currentSelectedCountry;
  const initialRadialData = await fetchMonthlyRadialData(initialRadialCountry, currentSelectedYear);
  renderCountryRadialChart(initialRadialData, currentSelectedMonth);

  updateAnomalyByYear(currentSelectedYear);
}

init();