import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "./supabaseClient";

const MODELS = [
  { id: "gpt-5.6", name: "GPT-5.6" },
  { id: "gpt-5", name: "GPT-5" }
];

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M21 12.8A8.5 8.5 0 0 1 11.2 3a8.5 8.5 0 1 0 9.8 9.8Z"/>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-5"/></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 21v-4M8 21h8"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-15-3.5L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15 3.5L21 14"/><path d="M21 19v-5h-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    x: <><path d="M18 6 6 18M6 6l12 12"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Auth({ onUser }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) setMsg(result.error.message);
    else if (mode === "signup" && !result.data.session) setMsg("Account created. Check your email if confirmation is enabled.");
    else onUser(result.data.user);

    setBusy(false);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark">✦</div>
        <h1>Fabiha AI Chat</h1>
        <p className="muted">Your private AI workspace</p>

        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@example.com" />
          <label>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} placeholder="••••••••" />
          {msg && <div className="auth-message">{msg}</div>}
          <button className="primary wide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>

        <button className="link-btn" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }}>
          {mode === "login" ? "Create a new account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [dark, setDark] = useState(true);
  const [model, setModel] = useState(MODELS[0].id);
  const [notice, setNotice] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("my-ai-theme");
    if (saved) setDark(saved === "dark");

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoadingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoadingAuth(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("my-ai-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (user) loadChats();
    else {
      setChats([]);
      setActiveId(null);
      setMessages([]);
    }
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const activeChat = useMemo(() => chats.find(c => c.id === activeId), [chats, activeId]);

  async function loadChats() {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error) {
      setChats(data || []);
      if (data?.length && !activeId) openChat(data[0].id);
    }
  }

  async function openChat(id) {
    setActiveId(id);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function newChat() {
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: "New chat" })
      .select()
      .single();
    if (error) return setNotice(error.message);
    setChats(prev => [data, ...prev]);
    setActiveId(data.id);
    setMessages([]);
    setNotice("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function deleteChat(id) {
    if (!confirm("Delete this chat?")) return;
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) return setNotice(error.message);
    const remaining = chats.filter(c => c.id !== id);
    setChats(remaining);
    if (activeId === id) {
      setActiveId(remaining[0]?.id || null);
      setMessages([]);
      if (remaining[0]) openChat(remaining[0].id);
    }
  }

  async function renameChat(chat) {
    const title = prompt("Chat name:", chat.title);
    if (!title?.trim()) return;
    const { data, error } = await supabase.from("chats").update({ title: title.trim() }).eq("id", chat.id).select().single();
    if (!error) setChats(prev => prev.map(c => c.id === chat.id ? data : c));
  }

  async function ensureChat(firstText) {
    if (activeId) return activeId;
    const title = firstText.trim().slice(0, 45) || "New chat";
    const { data, error } = await supabase.from("chats").insert({ user_id: user.id, title }).select().single();
    if (error) throw error;
    setChats(prev => [data, ...prev]);
    setActiveId(data.id);
    return data.id;
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Only image files are supported in this version.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setNotice("Please use an image smaller than 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setNotice("Voice input is not supported by this browser.");
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = event => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) text += event.results[i][0].transcript;
      setInput(text);
    };
    recognition.onerror = () => setNotice("Voice input could not be started.");
    recognition.start();
    recognitionRef.current = recognition;
  }

  async function sendMessage(textOverride = null) {
    const text = (textOverride ?? input).trim();
    if ((!text && !image) || sending || !user) return;

    setSending(true);
    setNotice("");

    try {
      const chatId = await ensureChat(text || "Image chat");
      const userMessage = {
        chat_id: chatId,
        user_id: user.id,
        role: "user",
        content: text,
        image_data: image
      };

      const { data: savedUser, error: saveError } = await supabase.from("messages").insert(userMessage).select().single();
      if (saveError) throw saveError;

      const nextMessages = [...messages, savedUser];
      setMessages(nextMessages);
      setInput("");
      setImage(null);
      setImageName("");
      if (fileRef.current) fileRef.current.value = "";

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          model,
          messages: nextMessages.map(m => ({
            role: m.role,
            content: m.content,
            image_data: m.image_data
          }))
        })
      });

      if (!res.ok) {
        let err = "AI request failed.";
        try { err = (await res.json()).error || err; } catch {}
        throw new Error(err);
      }

      const assistantTemp = {
        id: `temp-${Date.now()}`,
        chat_id: chatId,
        user_id: user.id,
        role: "assistant",
        content: ""
      };
      setMessages(prev => [...prev, assistantTemp]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find(l => l.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.type === "delta") {
            answer += payload.text;
            setMessages(prev => prev.map(m => m.id === assistantTemp.id ? { ...m, content: answer } : m));
          }
          if (payload.type === "error") throw new Error(payload.error);
        }
      }

      const { data: savedAssistant, error: assistantError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: "assistant",
          content: answer
        })
        .select()
        .single();

      if (assistantError) throw assistantError;
      setMessages(prev => prev.map(m => m.id === assistantTemp.id ? savedAssistant : m));

      const title = chats.find(c => c.id === chatId)?.title;
      if (!title || title === "New chat") {
        const newTitle = (text || "Image chat").slice(0, 45);
        const { data } = await supabase.from("chats").update({ title: newTitle }).eq("id", chatId).select().single();
        if (data) setChats(prev => prev.map(c => c.id === chatId ? data : c));
      } else {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, updated_at: new Date().toISOString() } : c)
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
      }
    } catch (err) {
      setNotice(err.message || "Something went wrong.");
      setMessages(prev => prev.filter(m => !String(m.id).startsWith("temp-")));
    } finally {
      setSending(false);
    }
  }

  async function regenerate() {
    if (!messages.length || sending) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant?.id) await supabase.from("messages").delete().eq("id", lastAssistant.id);
    setMessages(prev => lastAssistant ? prev.filter(m => m.id !== lastAssistant.id) : prev);
    await sendMessage(lastUser.content);
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
    setNotice("Copied.");
    setTimeout(() => setNotice(""), 1200);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (loadingAuth) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Auth onUser={setUser} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "open" : "closed"}`}>
        <div className="sidebar-top">
          <button className="new-chat" onClick={newChat}><Icon name="plus" /> <span>New chat</span></button>
          <button className="icon-btn mobile-only" onClick={() => setSidebar(false)}><Icon name="x" /></button>
        </div>

        <div className="chat-list">
          {chats.length === 0 && <div className="empty-list">No conversations yet.</div>}
          {chats.map(chat => (
            <div className={`chat-row ${activeId === chat.id ? "active" : ""}`} key={chat.id}>
              <button className="chat-open" onClick={() => openChat(chat.id)} title={chat.title}>
                <span className="chat-dot">•</span>{chat.title}
              </button>
              {activeId === chat.id && (
                <div className="chat-actions">
                  <button className="tiny-btn" onClick={() => renameChat(chat)}><Icon name="edit" size={15} /></button>
                  <button className="tiny-btn danger" onClick={() => deleteChat(chat.id)}><Icon name="trash" size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="user-line"><div className="avatar">{(user.email || "U")[0].toUpperCase()}</div><div className="user-email">{user.email}</div></div>
          <button className="bottom-btn" onClick={() => setDark(!dark)}><Icon name={dark ? "sun" : "moon"} /> {dark ? "Light mode" : "Dark mode"}</button>
          <button className="bottom-btn" onClick={logout}><Icon name="logout" /> Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebar(!sidebar)}><Icon name="menu" /></button>
          <div className="top-title">
            <strong>{activeChat?.title || "New chat"}</strong>
            <select value={model} onChange={e => setModel(e.target.value)} aria-label="AI model">
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </header>

        <section className="conversation">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-logo">✦</div>
              <h2>How can I help you?</h2>
              <p>Ask anything, upload an image, or use your microphone.</p>
              <div className="suggestions">
                {["Explain something simply", "Write a professional email", "Help me with code", "Create a business idea"].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <article className={`message ${m.role}`} key={m.id || i}>
                <div className={`message-avatar ${m.role}`}>{m.role === "user" ? (user.email || "U")[0].toUpperCase() : "✦"}</div>
                <div className="message-body">
                  <div className="message-name">{m.role === "user" ? "You" : "AI"}</div>
                  {m.image_data && <img className="attached-preview" src={m.image_data} alt="attachment" />}
                  {m.role === "assistant" ? (
                    <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || (sending ? "Thinking…" : "")}</ReactMarkdown></div>
                  ) : <div className="plain-text">{m.content}</div>}
                  {m.role === "assistant" && m.content && !sending && (
                    <div className="message-tools">
                      <button onClick={() => copyText(m.content)}><Icon name="copy" size={15} /> Copy</button>
                      {i === messages.length - 1 && <button onClick={regenerate}><Icon name="refresh" size={15} /> Regenerate</button>}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
          <div ref={endRef} />
        </section>

        <div className="composer-wrap">
          {notice && <div className="notice">{notice}</div>}
          {image && (
            <div className="attachment">
              <img src={image} alt="Selected" />
              <span>{imageName}</span>
              <button onClick={() => { setImage(null); setImageName(""); if (fileRef.current) fileRef.current.value = ""; }}><Icon name="x" size={14} /></button>
            </div>
          )}
          <div className="composer">
            <button className="composer-icon" onClick={() => fileRef.current?.click()} title="Attach image"><Icon name="image" /></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message Fabiha AI Chat…"
              rows={1}
            />
            <button className="composer-icon" onClick={startVoice} title="Voice input"><Icon name="mic" /></button>
            <button className="send-btn" disabled={sending || (!input.trim() && !image)} onClick={() => sendMessage()} title="Send"><Icon name="send" size={18} /></button>
          </div>
          <div className="composer-note">AI can make mistakes. Check important information.</div>
        </div>
      </main>
    </div>
  );
}