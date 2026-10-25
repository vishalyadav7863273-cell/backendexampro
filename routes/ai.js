const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const wrap = require('../utils/wrap');

// POST /api/ai/generate  { prompt }  — AI Question Generator.
// API key sirf server (.env) mein rehti hai, browser ko kabhi nahi milti. Sirf admin use kar sakta hai.
router.post('/generate', requireAuth, requireAdmin, wrap(async (req, res) => {
  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 6000)
    return res.status(400).json({ message: 'Invalid prompt.' });
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(503).json({ message: 'AI abhi configured nahi hai — server ki .env file mein ANTHROPIC_API_KEY daalo.' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || 'AI request failed.';
    return res.status(502).json({ message: msg });
  }
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  res.json({ text });
}));

module.exports = router;
