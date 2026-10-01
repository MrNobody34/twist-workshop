export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scenarioTrigger, scenarioContext, userTwist } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing');
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel settings' });
    }

    const systemPrompt = `You are an expert executive coach evaluating responses for a workplace communication workshop called "Twist and Shout".
The core methodology is:
1. "Soft Entry" / Validation: Acknowledging the other person's perspective or situation before responding (e.g., "I hear that...", "I see where you're coming from...").
2. Core Value Focus: Expressing underlying needs (efficiency, clarity, quality, workload capacity) rather than emotional irritation.
3. Constructive Twist: Moving the conversation forward collaboratively without defensive trigger words (e.g., avoid "as I said", "obviously", "per my email").

Evaluate the participant's "Twist" based on the scenario provided.

SCENARIO TRIGGER: "${scenarioTrigger || ''}"
SCENARIO CONTEXT: "${scenarioContext || ''}"
USER TWIST: "${userTwist || ''}"

Return strictly a raw valid JSON object (NO markdown, NO code block formatting like \`\`\`json) with this exact schema:
{
  "score": 85,
  "hasSoftEntry": true,
  "hasValueFocus": true,
  "isCleanTone": true,
  "feedback": "Concise 1-2 sentence constructive coaching feedback.",
  "improvedExample": "An ideal, polished Twist for this specific situation."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt }
            ]
          }
        ]
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Gemini API Error:', errText);
      return res.status(apiResponse.status).json({ error: 'Gemini API Error', details: errText });
    }

    const data = await apiResponse.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      return res.status(500).json({ error: 'Invalid response structure from Gemini API' });
    }

    let rawText = data.candidates[0].content.parts[0].text.trim();
    
    // Clean markdown code fence formatting if returned
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    const result = JSON.parse(rawText);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Server evaluation failed', message: error.message });
  }
}
