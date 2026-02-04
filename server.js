const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// 🔑 IMPORTANT: enable CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.text({ limit: "10mb" }));

// Handle preflight request
app.options("/pdf", (req, res) => {
  res.sendStatus(200);
});

app.post("/pdf", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(req.body, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=output.pdf"
    );

    res.send(pdf);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
