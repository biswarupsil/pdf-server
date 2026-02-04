const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

let browserPromise = null;

// 1. Singleton Browser Strategy
// We launch the browser once. If it crashes or closes, we relaunch it.
async function getBrowser() {
    if (!browserPromise) {
        console.log("Launching new browser instance...");
        browserPromise = puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage", // distinct memory optimization for Docker
                "--single-process" // vital for low-resource containers
            ],
            headless: "new"
        });
    }
    return browserPromise;
}

// CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Added GET
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.text({ type: "*/*", limit: "20mb" }));

// 2. Health Check / Wake-up Endpoint
app.get("/ping", (req, res) => {
    // Just receiving this request wakes up Render
    res.status(200).send("Pong! Server is awake.");
});

app.options("/pdf", (req, res) => res.sendStatus(200));

app.post("/pdf", async (req, res) => {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        // Optimize page loading
        await page.setContent(req.body, { 
            waitUntil: "domcontentloaded" // Faster than networkidle0
        });

        const pdf = await page.pdf({ format: "A4", printBackground: true });
        
        // IMPORTANT: Close the page, but keep the browser open!
        await page.close(); 
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
        res.send(pdf);
    } catch (err) {
        console.error("PDF Error:", err);
        // If the browser crashed, reset the promise so it restarts next time
        if (page) await page.close().catch(() => {}); 
        res.status(500).send(err.toString());
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    // Pre-warm the browser on server start
    getBrowser(); 
});
