const express = require("express");
const cors = require("cors");
const path = require("path");
const climateRoutes = require("./routes/climateRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", climateRoutes);

const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});