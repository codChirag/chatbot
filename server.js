// server.js
// Simple proxy to OpenAI Chat Completions. Store your API key in .env
import express from "express";
import fetch from "node-fetch"; // or use undici/fetch in Node 18+
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5173;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Set OPENAI_API_KEY in .env");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static("public")); // serve frontend from /public

// Example system prompt tuned for accuracy and chords generation
const SYSTEM_PROMPT = `You are an expert assistant: accurate, concise, and helpful.
If the user asks for music or chords, provide:
  - A short explanation (1–2 lines),
  - A chord progression (e.g., "C - G - Am - F"),
  - The key, suggested voicings (basic triads), and a simple strumming or rhythm suggestion.
When answering technical or factual questions, prefer short accurate answers and cite sources if asked for them.
Always ask clarifying questions only if the user's request is genuinely ambiguous.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model = "gpt-4o-mini" } = req.body;
    // messages should be an array of chat messages from client:
    // [{role: 'user', content: '...'}, ...]
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Build payload: include system message first
    const payload = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
      // max_tokens and temperature are adjustable
      max_tokens: 800,
      temperature: 0.2
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).send(txt);
    }

    const data = await r.json();
    // Return the assistant reply text to the client
    const assistant = data.choices?.[0]?.message ?? null;
    res.json({ assistant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
