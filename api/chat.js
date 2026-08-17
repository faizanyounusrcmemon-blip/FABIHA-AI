import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(body));
}

function getBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function normalizeMessages(messages = []) {
  return messages
    .filter((m) => ["user", "assistant", "system"].includes(m.role))
    .slice(-40)
    .map((m) => {
      if (m.image_data && m.role === "user") {
        return {
          role: "user",
          content: [
            { type: "input_text", text: String(m.content || "") },
            { type: "input_image", image_url: m.image_data }
          ]
        };
      }

      return {
        role: m.role,
        content: String(m.content || "")
      };
    });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(res, 500, { error: "OPENAI_API_KEY is not configured." });
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

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: "Messages are required." });
  }

  const input = normalizeMessages(messages);
  const selectedModel = String(model || process.env.OPENAI_MODEL || "gpt-5.6");

  try {
    const stream = await openai.responses.create({
      model: selectedModel,
      input,
      instructions:
        "You are a helpful, accurate AI assistant. Answer naturally. Use Markdown when useful. Do not claim to have performed actions you did not perform.",
      stream: true
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(`data: ${JSON.stringify({ type: "delta", text: event.delta })}\n\n`);
      }

      if (event.type === "response.completed") {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      }

      if (event.type === "error") {
        res.write(`data: ${JSON.stringify({ type: "error", error: event.error?.message || "AI error" })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error("OPENAI CHAT ERROR", error);
    if (!res.headersSent) {
      return json(res, 500, {
        error: error?.message || "AI request failed."
      });
    }
    res.write(`data: ${JSON.stringify({ type: "error", error: error?.message || "AI request failed." })}\n\n`);
    res.end();
  }
}