"use client";

import {
  ArrowDown,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Compass,
  ExternalLink,
  FileText,
  Globe2,
  Layers3,
  LoaderCircle,
  MapPin,
  Mic,
  Plus,
  Radio,
  Trophy,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

type ToolActivity = {
  name: string;
  arguments?: unknown;
  status: "running" | "complete" | "error";
  summary?: string;
};

type OpportunityCard = {
  title: string;
  url: string;
  organization?: string;
  type?: string;
  source?: string;
  location?: string;
  deadline?: string;
  prize?: string;
  description?: string;
  remote?: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  activities?: ToolActivity[];
  opportunities?: OpportunityCard[];
};

type ToolInfo = { name: string; description?: string };

const starterPrompts = [
  {
    icon: Compass,
    title: "Find opportunities",
    prompt:
      "Find promising AI hackathons I can enter soon. Show me the deadlines and prize details when available.",
  },
  {
    icon: FileText,
    title: "Understand the rules",
    prompt:
      "Prepare me for the Amazon Developer Hackathon 2026. Find the important rules, requirements, dates, and resources.",
  },
  {
    icon: Bookmark,
    title: "Review saved items",
    prompt: "Show me my saved opportunities.",
  },
];

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function prettyToolName(name: string) {
  return name.replaceAll("_", " ");
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "saved">("chat");
  const [activityOpen, setActivityOpen] = useState(true);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const [savingUrls, setSavingUrls] = useState<string[]>([]);
  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const latestActivities = useMemo(
    () =>
      [...messages].reverse().find((message) => message.activities?.length)
        ?.activities ?? [],
    [messages],
  );

  useEffect(() => {
    let alive = true;
    fetch("/api/route-test")
      .then(async (response) => {
        const data = await response.json();
        if (!alive) return;
        setConnected(Boolean(response.ok && data.success));
        setTools(data.tools ?? []);
        if (!response.ok || !data.success) {
          setNotice(
            "ROUTE MCP is not reachable yet. Check your server URL and try again.",
          );
        }
      })
      .catch(() => {
        if (alive) {
          setConnected(false);
          setNotice(
            "ROUTE MCP is not reachable yet. Check your server URL and try again.",
          );
        }
      });

    if (typeof window !== "undefined") {
      const w = window as any;
      setSpeechAvailable(
        Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
      );
    }
    return () => {
      alive = false;
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function sendMessage(value = input) {
    const text = value.trim();
    if (!text || busy) return;
    setNotice("");
    const userMessage: ChatMessage = { id: id(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "The assistant couldn't complete that request.",
        );
      }
      const answer: ChatMessage = {
        id: id(),
        role: "assistant",
        content:
          data.answer ||
          "I couldn't find a clear answer from the available opportunity data.",
        activities: data.activities ?? [],
        opportunities: data.opportunities ?? [],
      };
      setMessages((current) => [...current, answer]);
      if (
        data.activities?.some(
          (activity: ToolActivity) => activity.status === "error",
        )
      ) {
        setNotice(
          "One or more ROUTE tools reported an issue. Open the activity panel to inspect the run.",
        );
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: id(),
          role: "assistant",
          content:
            error instanceof Error
              ? `I couldn't complete that request. ${error.message}`
              : "I couldn't complete that request. Check that the ROUTE server and Gemini API key are configured.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startListening() {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice(
        "Speech recognition isn't supported in this browser. You can still type your request.",
      );
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    setListening(true);
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setNotice(
        "I couldn't hear that clearly. Try again or type your request.",
      );
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setNotice("Speech playback isn't supported in this browser.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function saveOpportunity(opportunity: OpportunityCard) {
    if (
      savedUrls.includes(opportunity.url) ||
      savingUrls.includes(opportunity.url)
    )
      return;
    const confirmed = window.confirm(
      `Save “${opportunity.title}” to your ROUTE saved opportunities?`,
    );
    if (!confirmed) return;
    setSavingUrls((current) => [...current, opportunity.url]);
    setNotice("");
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: opportunity.url,
          title: opportunity.title,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || "Save failed.");
      setSavedUrls((current) => [...current, opportunity.url]);
      setNotice(data.message || "Opportunity saved.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "ROUTE could not save this opportunity.",
      );
    } finally {
      setSavingUrls((current) =>
        current.filter((url) => url !== opportunity.url),
      );
    }
  }

  function newConversation() {
    window.speechSynthesis?.cancel?.();
    setMessages([]);
    setInput("");
    setNotice("");
    setActiveTab("chat");
    inputRef.current?.focus();
  }

  const hasConversation = messages.length > 0;

  return (
    <main className="route-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <span>R</span>
            <i />
          </div>
          <div className="brand-copy">
            <span className="brand-name">ROUTE</span>
            <span className="brand-caption">OPPORTUNITY INFRASTRUCTURE</span>
          </div>
          <button
            className="icon-button sidebar-collapse"
            aria-label="Sidebar options"
          >
            <Command size={16} />
          </button>
        </div>

        <button className="new-chat-button" onClick={newConversation}>
          <Plus size={17} strokeWidth={2.3} />
          <span>New conversation</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button
            className={activeTab === "chat" ? "nav-item selected" : "nav-item"}
            onClick={() => setActiveTab("chat")}
          >
            <Sparkles size={17} />
            <span>Assistant</span>
            <span className="nav-dot" />
          </button>
          <button
            className={activeTab === "saved" ? "nav-item selected" : "nav-item"}
            onClick={() => {
              setActiveTab("saved");
              void sendMessage("Show me my saved opportunities.");
            }}
          >
            <Bookmark size={17} />
            <span>Saved opportunities</span>
          </button>
          <a className="nav-item" href="/docs">
            <Layers3 size={17} />
            <span>Documentation</span>
            <ArrowRight className="nav-arrow" size={14} />
          </a>
        </nav>

        <div className="nav-label recent-label">TRY A WORKFLOW</div>
        <div className="workflow-list">
          <button
            onClick={() =>
              void sendMessage(
                "Find remote software engineering jobs that look relevant to a TypeScript developer.",
              )
            }
          >
            <span className="workflow-icon violet">
              <BriefcaseBusiness size={15} />
            </span>
            <span>
              <b>Discover jobs</b>
              <small>Search across sources</small>
            </span>
          </button>
          <button
            onClick={() =>
              void sendMessage(
                "Prepare me for the Amazon Developer Hackathon 2026. Summarize the official rules, deadlines, submission requirements, and useful resources, and point out any conflicting information.",
              )
            }
          >
            <span className="workflow-icon mint">
              <FileText size={15} />
            </span>
            <span>
              <b>Prepare for a hackathon</b>
              <small>Rules, dates & resources</small>
            </span>
          </button>
          <button
            onClick={() => void sendMessage("Show me my saved opportunities.")}
          >
            <span className="workflow-icon amber">
              <Bookmark size={15} />
            </span>
            <span>
              <b>Pick up where I left off</b>
              <small>Review saved items</small>
            </span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <div className="connection-top">
              <span
                className={`status-indicator ${connected ? "online" : connected === false ? "offline" : "checking"}`}
              />
              <span>
                {connected
                  ? "ROUTE connected"
                  : connected === false
                    ? "Connection needed"
                    : "Connecting to ROUTE"}
              </span>
              <span className="connection-live">
                {connected ? "LIVE" : "MCP"}
              </span>
            </div>
            <p>
              {connected
                ? `${tools.length} tools discovered over MCP`
                : "Your assistant connects to your ROUTE server."}
            </p>
          </div>
          <button
            className="profile-row"
            onClick={() =>
              setNotice(
                "ROUTE is agent-agnostic: this demo uses Gemini as its reasoning model.",
              )
            }
          >
            <div className="profile-avatar">R</div>
            <div className="profile-copy">
              <b>ROUTE demo</b>
              <span>Gemini · MCP client</span>
            </div>
            <Settings2 size={16} className="profile-settings" />
          </button>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <b>{activeTab === "saved" ? "Saved opportunities" : "Assistant"}</b>
            <ChevronDown size={14} />
          </div>
          <div className="topbar-right">
            <div className="model-pill">
              <span className="model-spark">
                <Sparkles size={13} />
              </span>{" "}
              Gemini <span className="model-separator" />{" "}
              <span className="model-light">ROUTE tools</span>
            </div>
            <a
              className="github-link"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <Globe2 size={17} />
            </a>
          </div>
        </header>

        <div className="content-grid">
          <div className="conversation-column">
            {!hasConversation ? (
              <div className="welcome-view">
                <div className="welcome-eyebrow">
                  <span className="eyebrow-line" /> YOUR NEXT MOVE STARTS HERE{" "}
                  <span className="eyebrow-line" />
                </div>
                <div className="hero-orbit">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <div className="orbit-core">
                    <div className="core-inner">
                      <span>R</span>
                      <i />
                    </div>
                  </div>
                  <span className="orbit-node node-one">
                    <Compass size={15} />
                  </span>
                  <span className="orbit-node node-two">
                    <Zap size={15} />
                  </span>
                  <span className="orbit-node node-three">
                    <Bookmark size={14} />
                  </span>
                  <span className="orbit-node node-four">
                    <Radio size={15} />
                  </span>
                </div>
                <h1>
                  Find the opportunity.
                  <br />
                  <span>Make your move.</span>
                </h1>
                <p className="welcome-description">
                  Tell ROUTE what you’re working toward. Discover real
                  opportunities, understand what they need, and get ready to
                  act.
                </p>

                <form className="composer welcome-composer" onSubmit={onSubmit}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Ask ROUTE to find your next opportunity..."
                    rows={2}
                    aria-label="Message ROUTE"
                  />
                  <div className="composer-bottom">
                    <div className="composer-tools">
                      <span className="composer-hint">
                        <span className="hint-key">↵</span> to send{" "}
                        <span className="hint-divider">·</span> shift + ↵ for a
                        new line
                      </span>
                    </div>
                    <div className="composer-actions">
                      <button
                        type="button"
                        className={`icon-button mic-button ${listening ? "listening" : ""}`}
                        onClick={startListening}
                        title={
                          speechAvailable
                            ? "Speak your request"
                            : "Speech recognition unavailable"
                        }
                        aria-label="Speak your request"
                      >
                        <Mic size={17} />
                      </button>
                      <button
                        type="submit"
                        className="send-button"
                        disabled={!input.trim() || busy}
                        aria-label="Send message"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </form>

                <div className="starter-heading">
                  <span>START WITH A PROMPT</span>
                  <div />
                </div>
                <div className="starter-grid">
                  {starterPrompts.map(({ icon: Icon, title, prompt }) => (
                    <button
                      key={title}
                      className="starter-card"
                      onClick={() => void sendMessage(prompt)}
                    >
                      <span className="starter-icon">
                        <Icon size={17} />
                      </span>
                      <span className="starter-text">
                        <b>{title}</b>
                        <small>
                          {title === "Find opportunities"
                            ? "Jobs, hackathons and more"
                            : title === "Understand the rules"
                              ? "Get the details that matter"
                              : "Return to what you saved"}
                        </small>
                      </span>
                      <ArrowRight size={15} className="starter-arrow" />
                    </button>
                  ))}
                </div>
                <div className="trust-line">
                  <ShieldCheck size={14} />
                  <span>Source-backed information</span>
                  <span className="trust-sep">·</span>
                  <span>Powered by your ROUTE MCP server</span>
                </div>
              </div>
            ) : (
              <div className="chat-view">
                <div className="chat-heading">
                  <div>
                    <span className="section-kicker">ROUTE ASSISTANT</span>
                    <h1>
                      {activeTab === "saved"
                        ? "Your saved opportunities"
                        : "Let's find your next move."}
                    </h1>
                  </div>
                  <button className="quiet-button" onClick={newConversation}>
                    <Plus size={15} /> New chat
                  </button>
                </div>
                <div className="message-list">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message-row ${message.role}`}
                    >
                      {message.role === "assistant" ? (
                        <div className="message-avatar">
                          <span>R</span>
                          <i />
                        </div>
                      ) : (
                        <div className="user-avatar">Y</div>
                      )}
                      <div className="message-body">
                        <div className="message-meta">
                          <b>
                            {message.role === "assistant" ? "ROUTE" : "You"}
                          </b>
                          <span>
                            {message.role === "assistant"
                              ? "Assistant"
                              : "Just now"}
                          </span>
                        </div>
                        <div className="message-content">{message.content}</div>
                        {message.opportunities?.length ? (
                          <div className="opportunity-results">
                            <div className="results-label">
                              <span>OPPORTUNITIES FOUND</span>
                              <span>
                                {message.opportunities.length} results
                              </span>
                            </div>
                            {message.opportunities.map((opportunity) => (
                              <article
                                className="opportunity-card"
                                key={opportunity.url}
                              >
                                <div className="opportunity-card-top">
                                  <span
                                    className={`opportunity-type ${opportunity.type?.toLowerCase() === "job" ? "job" : "hackathon"}`}
                                  >
                                    {opportunity.type?.toLowerCase() ===
                                    "job" ? (
                                      <BriefcaseBusiness size={12} />
                                    ) : (
                                      <Compass size={12} />
                                    )}
                                    {opportunity.type || "Opportunity"}
                                  </span>
                                  {opportunity.source && (
                                    <span className="opportunity-source">
                                      {opportunity.source}
                                    </span>
                                  )}
                                </div>
                                <h3>{opportunity.title}</h3>
                                {opportunity.organization && (
                                  <p className="opportunity-org">
                                    {opportunity.organization}
                                  </p>
                                )}
                                {opportunity.description && (
                                  <p className="opportunity-description">
                                    {opportunity.description.length > 190
                                      ? `${opportunity.description.slice(0, 187)}…`
                                      : opportunity.description}
                                  </p>
                                )}
                                <div className="opportunity-meta">
                                  {opportunity.deadline && (
                                    <span>
                                      <CalendarDays size={12} />{" "}
                                      {opportunity.deadline}
                                    </span>
                                  )}
                                  {opportunity.location && (
                                    <span>
                                      <MapPin size={12} />{" "}
                                      {opportunity.location}
                                    </span>
                                  )}
                                  {opportunity.prize && (
                                    <span>
                                      <Trophy size={12} /> {opportunity.prize}
                                    </span>
                                  )}
                                  {opportunity.remote && (
                                    <span>
                                      <Globe2 size={12} /> Remote
                                    </span>
                                  )}
                                </div>
                                <div className="opportunity-card-actions">
                                  <a
                                    href={opportunity.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View source <ExternalLink size={12} />
                                  </a>
                                  <button
                                    onClick={() =>
                                      void saveOpportunity(opportunity)
                                    }
                                    disabled={
                                      savingUrls.includes(opportunity.url) ||
                                      savedUrls.includes(opportunity.url)
                                    }
                                  >
                                    {savingUrls.includes(opportunity.url) ? (
                                      <LoaderCircle
                                        size={13}
                                        className="spin"
                                      />
                                    ) : savedUrls.includes(opportunity.url) ? (
                                      <BookmarkCheck size={13} />
                                    ) : (
                                      <Bookmark size={13} />
                                    )}
                                    {savingUrls.includes(opportunity.url)
                                      ? "Saving…"
                                      : savedUrls.includes(opportunity.url)
                                        ? "Saved"
                                        : "Save"}
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}
                        {message.activities?.length ? (
                          <div className="inline-activity">
                            <TerminalSquare size={14} />
                            <span>
                              {message.activities.length} MCP{" "}
                              {message.activities.length === 1
                                ? "tool"
                                : "tools"}{" "}
                              used
                            </span>
                            <button onClick={() => setActivityOpen(true)}>
                              View run <ArrowRight size={12} />
                            </button>
                          </div>
                        ) : null}
                        {message.role === "assistant" && (
                          <div className="message-actions">
                            <button
                              onClick={() => speak(message.content)}
                              title={
                                speaking ? "Stop reading" : "Read answer aloud"
                              }
                            >
                              <Volume2 size={14} />{" "}
                              {speaking ? "Stop reading" : "Read aloud"}
                            </button>
                            <button
                              onClick={() =>
                                navigator.clipboard?.writeText(message.content)
                              }
                              title="Copy answer"
                            >
                              <Command size={13} /> Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {busy && (
                    <article className="message-row assistant">
                      <div className="message-avatar">
                        <span>R</span>
                        <i />
                      </div>
                      <div className="message-body">
                        <div className="message-meta">
                          <b>ROUTE</b>
                          <span>Working on it</span>
                        </div>
                        <div className="thinking-state">
                          <span className="thinking-dots">
                            <i />
                            <i />
                            <i />
                          </span>
                          <span>
                            Checking opportunity sources and calling tools…
                          </span>
                        </div>
                      </div>
                    </article>
                  )}
                  <div ref={bottomRef} />
                </div>
                <form className="composer chat-composer" onSubmit={onSubmit}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Ask a follow-up..."
                    rows={2}
                    aria-label="Message ROUTE"
                  />
                  <div className="composer-bottom">
                    <div className="composer-tools">
                      <span className="mcp-chip">
                        <span className="tiny-live" /> ROUTE MCP
                      </span>
                      <span className="composer-hint">
                        Shift + ↵ for a new line
                      </span>
                    </div>
                    <div className="composer-actions">
                      <button
                        type="button"
                        className={`icon-button mic-button ${listening ? "listening" : ""}`}
                        onClick={startListening}
                        aria-label="Speak your request"
                      >
                        <Mic size={17} />
                      </button>
                      <button
                        type="submit"
                        className="send-button"
                        disabled={!input.trim() || busy}
                        aria-label="Send message"
                      >
                        {busy ? (
                          <LoaderCircle size={17} className="spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
                <div className="conversation-footnote">
                  ROUTE uses source data from connected opportunity providers.
                  Always verify critical details with the original source.
                </div>
              </div>
            )}
            {notice && (
              <div className="notice-banner" role="status">
                <CircleHelp size={15} />
                <span>{notice}</span>
                <button
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {hasConversation && busy && (
              <div className="run-progress">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <aside
            className={`activity-panel ${activityOpen ? "open" : "closed"}`}
          >
            <div className="activity-header">
              <div>
                <span className="section-kicker">OBSERVABILITY</span>
                <h2>Live activity</h2>
              </div>
              <button
                className="icon-button panel-toggle"
                onClick={() => setActivityOpen(!activityOpen)}
                aria-label={
                  activityOpen
                    ? "Collapse activity panel"
                    : "Expand activity panel"
                }
              >
                {activityOpen ? (
                  <ArrowDown size={15} />
                ) : (
                  <TerminalSquare size={15} />
                )}
              </button>
            </div>
            {activityOpen && (
              <>
                <div className="activity-status">
                  <span
                    className={`status-indicator ${connected ? "online" : connected === false ? "offline" : "checking"}`}
                  />
                  <div>
                    <b>
                      {connected
                        ? "MCP connection active"
                        : connected === false
                          ? "Waiting for connection"
                          : "Connecting…"}
                    </b>
                    <small>
                      {connected
                        ? "Streamable HTTP · Server tools discovered"
                        : "Check ROUTE_MCP_URL and the server process"}
                    </small>
                  </div>
                </div>
                <div className="panel-section">
                  <div className="panel-label">
                    LATEST RUN{" "}
                    <span>
                      {latestActivities.length
                        ? `${latestActivities.length} calls`
                        : "READY"}
                    </span>
                  </div>
                  {latestActivities.length ? (
                    <div className="tool-run-list">
                      {latestActivities.map((activity, index) => (
                        <div
                          className="tool-run"
                          key={`${activity.name}-${index}`}
                        >
                          <div className={`tool-run-icon ${activity.status}`}>
                            <TerminalSquare size={14} />
                          </div>
                          <div className="tool-run-content">
                            <b>{prettyToolName(activity.name)}</b>
                            <span>
                              {activity.status === "running"
                                ? "Executing…"
                                : activity.status === "error"
                                  ? "Returned an error"
                                  : "Completed"}
                            </span>
                            {activity.summary && (
                              <small>{activity.summary}</small>
                            )}
                          </div>
                          {activity.status === "complete" ? (
                            <Check size={14} className="tool-check" />
                          ) : activity.status === "running" ? (
                            <LoaderCircle
                              size={14}
                              className="spin tool-spinner"
                            />
                          ) : (
                            <X size={14} className="tool-error" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-run">
                      <div className="empty-run-graphic">
                        <TerminalSquare size={21} />
                        <span />
                        <span />
                      </div>
                      <b>Ready when you are</b>
                      <p>
                        Your tool calls will appear here as ROUTE searches,
                        retrieves, and prepares opportunities.
                      </p>
                    </div>
                  )}
                </div>
                <div className="panel-section available-tools">
                  <div className="panel-label">
                    AVAILABLE MCP TOOLS <span>{tools.length}</span>
                  </div>
                  {tools.length ? (
                    tools.map((tool) => (
                      <div className="available-tool" key={tool.name}>
                        <span className="tool-status-dot" />
                        <span>{prettyToolName(tool.name)}</span>
                        <Check size={12} />
                      </div>
                    ))
                  ) : (
                    <p className="tools-empty">
                      Tools appear here once the MCP connection is available.
                    </p>
                  )}
                </div>
                <div className="panel-bottom-note">
                  <ShieldCheck size={14} />
                  <span>
                    Tool calls are visible. Private model reasoning is not
                    recorded.
                  </span>
                </div>
              </>
            )}
          </aside>
        </div>
        <footer className="app-footer">
          <span>
            ROUTE <span className="footer-version">DEMO / 0.1</span>
          </span>
          <span>
            <span className="footer-status" /> Built on MCP{" "}
            <span className="footer-sep">·</span> Agent-agnostic by design
          </span>
        </footer>
      </section>
    </main>
  );
}
