export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, description: 'Method not allowed. Use POST.' });
  }

  try {
    // Safely parse body if stringified
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { botToken, method, params } = body;

    if (!botToken) {
      return res.status(400).json({ ok: false, description: 'botToken is required' });
    }

    if (!method) {
      return res.status(400).json({ ok: false, description: 'method is required' });
    }

    // Bot token validation (digits:secret format)
    const cleanToken = String(botToken).trim();
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(cleanToken)) {
      return res.status(400).json({ ok: false, description: 'Invalid bot token format' });
    }

    const telegramUrl = `https://api.telegram.org/bot${cleanToken}/${method}`;

    const telegramRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params || {}),
    });

    const result = await telegramRes.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Telegram Proxy Error:', error);
    return res.status(500).json({
      ok: false,
      description: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}
