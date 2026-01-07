// api/evaluate.js
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { scenario, answer } = req.body;
  if (!scenario || !answer) return res.status(400).json({ error: "Missing scenario or answer" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a strict corporate communication coach. Score tone and friction avoidance." },
          { role: "user", content: `
Scenario:
${scenario}

Participant response:
"${answer}"

SCORING RULES:
- 20: Rude, insulting, dismissive
- 40: Filler / meaningless
- 50: Polite but unhelpful refusal
- 60: Neutral professional
- 80: Empathy + constructive boundary
- 100: Empathy + relationship-building

Return ONLY JSON with:
{ "score": number, "tip": string }
` }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";

    // Clean up in case OpenAI returns stringified JSON
    let output;
    try { output = JSON.parse(content); } 
    catch { output = { score: 60, tip: "Could not parse AI output, defaulting to 60." }; }

    // Make sure we always return score and tip
    res.status(200).json({ score: output.score || 60, tip: output.tip || "No tip provided." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ score: 60, tip: "AI evaluation failed, defaulting to 60." });
  }
};
