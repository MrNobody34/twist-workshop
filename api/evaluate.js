module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { scenarioTrigger, scenarioContext, userTwist } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel settings' });

    const systemPrompt = `You are an executive coach evaluating responses for the workshop "Twist and Shout".
Methodology:
1. Soft Entry / Validation (acknowledging perspective).
2. Core Value Focus (quality, capacity, time, efficiency).
3. Constructive Twist (collaborative, free of passive-aggressive words like "obviously", "as I said").

Scenario Trigger: "${scenarioTrigger || ''}"
Scenario Context: "${scenarioContext || ''}"
User Twist: "${userTwist || ''}"

Return ONLY a raw JSON object with no markdown formatting or backticks:
{
  "score": 85,
  "hasSoftEntry": true,
  "hasValueFocus": true,
  "isCleanTone": true,
  "feedback": "Concise coaching advice.",
  "improvedExample": "Polished twist alternative."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Gemini API Error', details: data });

    let rawText = data.candidates[0].content.parts[0].text.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const result = JSON.parse(rawText);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Evaluation server crash', details: err.message });
  }
};
