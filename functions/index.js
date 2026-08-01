const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const https = require("https");

// Set the region (change if you prefer a different region)
setGlobalOptions({ region: "us-central1" });

/**
 * Telegram Proxy Cloud Function
 *
 * Proxies requests to the Telegram Bot API to avoid CORS issues in the browser.
 * The browser calls this function, which then calls api.telegram.org on the server.
 *
 * Expected POST body:
 *   { botToken: string, method: string, params: object }
 *
 * Returns the raw Telegram API JSON response.
 */
exports.telegramProxy = onRequest(
  {
    cors: true, // Automatically handles CORS headers for all origins
    timeoutSeconds: 30,
    memory: "128MiB",
  },
  async (req, res) => {
    // Handle preflight CORS requests
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, description: "Method not allowed. Use POST." });
      return;
    }

    const { botToken, method, params } = req.body;

    if (!botToken) {
      res.status(400).json({ ok: false, description: "botToken is required" });
      return;
    }

    if (!method) {
      res.status(400).json({ ok: false, description: "method is required" });
      return;
    }

    // Basic token format validation (prevents sending malformed requests)
    if (!/^\d+:[A-Za-z0-9_-]{35,}$/.test(botToken)) {
      res.status(400).json({ ok: false, description: "Invalid bot token format" });
      return;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`;
    const postData = JSON.stringify(params || {});

    console.log(`[telegramProxy] Calling Telegram API: ${method}`);

    return new Promise((resolve) => {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const telegramReq = https.request(telegramUrl, options, (telegramRes) => {
        let data = "";

        telegramRes.on("data", (chunk) => {
          data += chunk;
        });

        telegramRes.on("end", () => {
          try {
            const result = JSON.parse(data);
            console.log(`[telegramProxy] Telegram responded: ok=${result.ok}`);
            res.status(200).json(result);
          } catch (parseError) {
            console.error("[telegramProxy] Failed to parse Telegram response:", parseError);
            res.status(500).json({
              ok: false,
              description: "Failed to parse Telegram API response",
            });
          }
          resolve();
        });
      });

      telegramReq.on("error", (error) => {
        console.error("[telegramProxy] Request to Telegram failed:", error);
        res.status(500).json({
          ok: false,
          description: `Failed to reach Telegram API: ${error.message}`,
        });
        resolve();
      });

      telegramReq.write(postData);
      telegramReq.end();
    });
  }
);
