// api/evaluate.js
module.exports = async function handler(req, res) {
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
          { role: "system", content: `
You are a strict corporate communication coach for the "Twist Workshop". 
Your task is to evaluate participant responses to scenarios. 
The goal is to **improve tone, avoid friction, and encourage constructive communication**.

Always follow these rules:
- Return **ONLY JSON** in the exact format: { "score": number, "tip": string }
- Choose ONE score based on the rubric below:

SCORING RUBRIC:
20 - Very rude / insulting / aggressive
40 - Polite but dismissive / unhelpful
60 - Neutral / professional / factual
80 - Shows empathy and constructive suggestion
100 - Turns conflict into bonding / adds humor or warmth / excellent emotional intelligence
` },
          { role: "user", content: `
Scenario:
${scenario}

Participant response:
"${answer}"
` }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON safely
    let output;
    try { output = JSON.parse(content); } 
    catch { output = { score: 60, tip: "The AI could not parse the response, defaulting to 60." }; }

    res.status(200).json({ score: output.score || 60, tip: output.tip || "No tip provided." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ score: 60, tip: "AI evaluation failed, defaulting to 60." });
  }
};
