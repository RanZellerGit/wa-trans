const express = require("express");
const whatsappWeb = require("./whatsappWeb.js");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/qr", (req, res) => {
  const qrPath = path.join(__dirname, "whatsapp-qr.png");

  console.log("QR request received, checking path:", qrPath);

  // Check if QR file exists
  if (fs.existsSync(qrPath)) {
    console.log("QR file found, size:", fs.statSync(qrPath).size);

    // Set proper content type
    res.setHeader("Content-Type", "image/png");

    // Send the QR code image and delete after sending
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
          // Only send error if headers haven't been sent
          if (!res.headersSent) {
            res.status(500).send("Error sending QR code");
          }
        } else {
          // Delete the file after it's sent
          fs.unlink(qrPath, (unlinkErr) => {
            if (unlinkErr) {
              console.error("Error deleting QR code file:", unlinkErr);
            } else {
              console.log("QR code file deleted successfully");
            }
          });
        }
      }
    );
  } else {
    console.log("QR file not found at path:", qrPath);
    res.status(404).send("QR Code not available yet. Please try again later.");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
