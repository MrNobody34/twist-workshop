export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scenarioTrigger, scenarioContext, userTwist } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' });
    }

    const systemPrompt = `
You are an expert executive coach evaluating responses for a workplace communication workshop called "Twist and Shout".
The core methodology is:
1. "Soft Entry" / Validation: Acknowledging the other person's perspective or situation before responding (e.g., "I hear that...", "I see where you're coming from...").
2. Core Value Focus: Expressing underlying needs (efficiency, clarity, quality, workload capacity) rather than emotional irritation.
3. Constructive Twist: Moving the conversation forward collaboratively without defensive trigger words (e.g., avoid "as I said", "obviously", "per my email").

Evaluate the participant's "Twist" based on the scenario provided.

SCENARIO TRIGGER: "${scenarioTrigger}"
SCENARIO CONTEXT: "${scenarioContext}"
USER TWIST: "${userTwist}"

Return strictly a raw JSON object (no Markdown formatting or code blocks) with this schema:
{
  "score": number (0 to 100),
  "hasSoftEntry": boolean,
  "hasValueFocus": boolean,
  "isCleanTone": boolean,
  "feedback": "Concise 1-2 sentence constructive coaching feedback.",
  "improvedExample": "An ideal, polished Twist for this specific situation."
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(rawText);

    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Failed to evaluate Twist' });
  }
}
