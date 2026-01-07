module.exports = async function handler(req, res) {
  // Allow requests from any origin (CORS)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { scenario, answer } = req.body;

  if (!scenario || !answer) {
    return res.status(400).json({ error: "Missing scenario or answer" });
  }

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
          {
            role: "system",
            content:
              "You are a strict corporate communication coach evaluating tone and friction avoidance."
          },
          {
            role: "user",
            content: `
Scenario:
${scenario}

Participant response:
"${answer}"

SCORING RULES:
- Rude, insulting, dismissive → 20
- Filler / meaningless → 40
- Polite but unhelpful refusal → 50
- Neutral professional → 60
- Empathy + constructive boundary → 80
- Empathy + relationship-building → 100

Return ONLY valid JSON:
{ "score": number, "tip": string }
`
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    res.status(200).json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Evaluation failed" });
  }
};
