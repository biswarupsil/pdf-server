const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

let browserPromise = null;

// 1. Singleton Browser Strategy (Modified for Low Memory)
async function getBrowser() {
    if (!browserPromise) {
        console.log("Launching browser...");
        browserPromise = puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage", // Docker memory fix
                "--disable-gpu",           // Save GPU memory
                "--no-zygote",             // Spawns fewer processes
                "--single-process",        // Critical for low-resource containers
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Use built-in Chrome if available
            headless: "new"
        });
    }
    return browserPromise;
}

// CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.text({ type: "*/*", limit: "20mb" }));

// 2. Health Check - LIGHTWEIGHT
// This endpoint MUST be fast. No database, no Puppeteer, just text.
app.get("/ping", (req, res) => {
    console.log("Ping received. Server is awake.");
    res.status(200).send("Pong! Server is awake.");
});

app.options("/pdf", (req, res) => res.sendStatus(200));

app.post("/pdf", async (req, res) => {
    let page = null;
    try {
        console.log("PDF Request: Getting browser...");
        // WE LAUNCH BROWSER HERE, NOT ON STARTUP
        const browser = await getBrowser();
        
        console.log("Browser ready. Opening page...");
        page = await browser.newPage();
        
        await page.setContent(req.body, { 
            waitUntil: "domcontentloaded", // Faster than networkidle0
            timeout: 60000 // 60s timeout for slow free tier
        });

        const pdf = await page.pdf({ format: "A4", printBackground: true });
        
        await page.close(); 
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
        res.send(pdf);
    } catch (err) {
        console.error("PDF Error:", err);
        // If browser crashed, reset promise to force restart next time
        if (browserPromise) {
            const browser = await browserPromise;
            await browser.close().catch(() => {});
            browserPromise = null;
        }
        res.status(500).send("Error: " + err.toString());
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    // DO NOT CALL getBrowser() HERE!
});
