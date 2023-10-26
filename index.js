const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Welcome to the Home page of package 1!");
});

app.get("/dummy", (req, res) => {
  res.json({ message: "Dummy response from package 1" });
});

app.get("/google", async (req, res) => {
  try {
    const response = await axios.get("https://google.com");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to call endpoint" });
  }
});

app.get("/call-endpoint", async (req, res) => {
  try {
    const response = await axios.get("http://app-2.retail-store");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to call endpoint" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
