const express = require("express");
const axios = require("axios");
const client = require("prom-client");

const app = express();
const PORT = 3000;

// Create a Registry to register the metrics
const register = new client.Registry();

// The metrics we would like to collect:
// 1. A gauge for the current number of active requests
const activeRequests = new client.Gauge({
  name: "active_requests",
  help: "Number of active requests",
  labelNames: ["method", "endpoint"],
});

// 2. A counter for the total number of requests
const totalRequests = new client.Counter({
  name: "app_total_requests",
  help: "Total number of requests",
  labelNames: ["method", "endpoint", "status"],
});

// 3. Summary for tracking request durations with labels
const requestDurationSummary = new client.Summary({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "endpoint", "status"],
  // Define the quantiles you are interested in
  percentiles: [0.5, 0.9, 0.99],
});

// Define a Histogram metric
const requestDurationHistogram = new client.Histogram({
  name: "http_request_duration_seconds_histogram",
  help: "Histogram for the duration in seconds.",
  labelNames: ["method", "endpoint", "status"],
  // Define your bucket sizes
  buckets: [0.1, 0.2, 0.5, 1, 5], // These are example values for buckets in seconds
});

// Register the metrics
register.registerMetric(activeRequests);
register.registerMetric(totalRequests);
register.registerMetric(requestDurationSummary);
register.registerMetric(requestDurationHistogram);

client.collectDefaultMetrics({ register });

// Add a middleware that increases activeRequests on request and decreases on response
app.use((req, res, next) => {
  // Create a start time
  const end = requestDurationHistogram.startTimer();
  const endTimer = requestDurationSummary.startTimer();

  // Increment with labels
  activeRequests.inc({
    method: req.method,
    endpoint: req.path,
  });

  totalRequests.inc({
    method: req.method,
    endpoint: req.path,
  });

  res.on("finish", () => {
    // Decrement with labels for active requests
    activeRequests.dec({
      method: req.method,
      endpoint: req.path,
    });

    // Here's how you could add a label for status code, for example
    totalRequests.inc(
      {
        method: req.method,
        endpoint: req.path,
        status: res.statusCode,
      },
      1
    ); // The '1' is the increment value

    // Observe the duration in the summary with labels
    // Stop the timer and record the request duration with labels
    endTimer({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode,
    });

    // End the timer and add labels
    end({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode,
    });
  });

  next();
});

// Define a route to expose the metrics
app.get("/metrics", async (req, res) => {
  // Allow Prometheus to scrape the metrics
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

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
    const response = await axios.get("http://app-2-active.retail-store");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to call endpoint" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
