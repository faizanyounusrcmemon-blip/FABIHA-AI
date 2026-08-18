import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(body));
}

function getBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(res, 500, { error: "GEMINI_API_KEY is not configured on Vercel." });
  }

  const token = getBearer(req);
  if (!token) {
    return json(res, 401, { error: "Authentication required." });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, { error: "Supabase server configuration is missing." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return json(res, 401, { error: "Invalid or expired session." });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: "Messages are required." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const contents = messages
      .filter((m) => ["user", "assistant"].includes(m.role))
      .slice(-20)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }]
      }));

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction: "You are a helpful AI assistant."
      }
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ type: "delta", text: chunk.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("GEMINI API ERROR:", error);
    if (!res.headersSent) {
      return json(res, 500, { error: error?.message || "AI request failed." });
    }
    res.write(`data: ${JSON.stringify({ type: "error", error: error?.message || "AI request failed." })}\n\n`);
    res.end();
  }
}
