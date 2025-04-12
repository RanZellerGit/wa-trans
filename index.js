const express = require("express");
const whatsappWeb = require("./src/whatsappWeb.js");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
const logger = require("./src/utils/logger");

process.on("SIGINT", () => {
  process.exit();
});

process.on("SIGTERM", () => {
  process.exit();
});

// Serve static files from public directory
app.use(express.static("public"));

// Root route serves the HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// QR code endpoint
app.get("/qr", (req, res) => {
  const qrPath = path.join(__dirname, "whatsapp-qr.png");

  console.log("QR request received, checking path:", qrPath);

  if (fs.existsSync(qrPath)) {
    console.log("QR file found, size:", fs.statSync(qrPath).size);
    res.setHeader("Content-Type", "image/png");
    res.sendFile(
      qrPath,
      {
        dotfiles: "deny",
        headers: {
          "x-timestamp": Date.now(),
          "x-sent": true,
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending QR code:", err);
          if (!res.headersSent) {
            res.status(500).send("Error sending QR code");
          }
        }
      }
    );
  } else {
    console.log("QR file not found at path:", qrPath);
    res.status(404).send("QR Code not available yet. Please try again later.");
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    connected: whatsappWeb.isConnected,
  });
});

app.listen(port, host, () => {
  console.log(`Server is running on ${host}:${port}`);
});
