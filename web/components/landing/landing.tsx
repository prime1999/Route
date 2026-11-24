"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./landing.css";

const GH = "https://github.com/prime1999/Route";
const QUERY = "find remote AI hackathons closing this month";
const RESULTS = [
  ["Amazon Developer Hackathon", "Devpost · Deadline Oct 23"],
  ["OpenCV AI Competition", "Devpost · Prize pool"],
  ["Senior TypeScript Engineer", "RemoteOK · Remote"],
];

const LEFT = [
  { n: "Claude", s: "MCP client", y: 20 },
  { n: "Your agent", s: "Any MCP-compatible app", y: 50 },
  { n: "IDE agents", s: "Developer workflows", y: 80 },
];
const RIGHT = [
  { n: "Devpost", s: "Hackathons", live: true },
  { n: "RemoteOK", s: "Remote jobs", live: true },
  { n: "LinkedIn", s: "Jobs", live: false },
  { n: "DoraHacks", s: "Hackathons", live: false },
  { n: "Grants.gov", s: "Grants", live: false },
  { n: "Opportunity Desk", s: "Scholarships", live: false },
];

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min((t - t0) / 1600, 1);
        setV(Math.round(to * (1 - Math.pow(1 - k, 4))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <big ref={ref as React.RefObject<HTMLElement>}>{v}{suffix}</big>;
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0);
  const [top, setTop] = useState(false);

  // typing + results loop
  useEffect(() => {
    let i = 0, alive = true;
    const t = setInterval(() => {
      if (!alive) return;
      i++;
      setTyped(QUERY.slice(0, i));
      if (i > QUERY.length + 4) setShown(Math.min(3, i - QUERY.length - 4));
      if (i > QUERY.length + 40) { i = 0; setShown(0); }
    }, 55);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // scroll reveals + scroll-linked vars
  useEffect(() => {
    const el = root.current!;
    const io = new IntersectionObserver(
      es => es.forEach(e => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.15 },
    );
    el.querySelectorAll("[data-r]").forEach(n => io.observe(n));
    const graph = el.querySelector<HTMLElement>(".graph")!;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        el.style.setProperty("--p", String(scrollY / (h.scrollHeight - innerHeight || 1)));
        el.style.setProperty("--hp", String(Math.min(scrollY / (innerHeight * 0.6), 1)));
        setTop(scrollY > innerHeight * 0.5);
        const r = graph.getBoundingClientRect();
        graph.style.setProperty("--gp", String(Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height * 0.8), 0), 1)));
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    const spot = (e: MouseEvent) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>(".card");
      if (!c) return;
      const b = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - b.left}px`);
      c.style.setProperty("--my", `${e.clientY - b.top}px`);
    };
    el.addEventListener("mousemove", spot);
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); el.removeEventListener("mousemove", spot); };
  }, []);

  // particle network canvas
  useEffect(() => {
    const c = canvas.current!, x = c.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const m = { x: -999, y: -999 };
    const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0003, vy: (Math.random() - 0.5) * 0.0003 }));
    const size = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    size();
    const mv = (e: MouseEvent) => { m.x = e.clientX; m.y = e.clientY; };
    addEventListener("resize", size); addEventListener("mousemove", mv);
    const draw = () => {
      x.clearRect(0, 0, w, h);
      for (const p of P) {
        p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
        const px = p.x * w, py = p.y * h, d = Math.hypot(px - m.x, py - m.y);
        x.fillStyle = `rgba(255,255,255,${d < 160 ? 0.9 : 0.3})`;
        x.fillRect(px, py, 1.6, 1.6);
        for (const q of P) {
          const dd = Math.hypot(px - q.x * w, py - q.y * h);
          if (dd < 130) { x.strokeStyle = `rgba(255,255,255,${(1 - dd / 130) * (d < 200 ? 0.28 : 0.1)})`; x.beginPath(); x.moveTo(px, py); x.lineTo(q.x * w, q.y * h); x.stroke(); }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); removeEventListener("mousemove", mv); };
  }, []);

  const r = (d = 0) => ({ "data-r": "", style: { "--d": `${d}s` } as React.CSSProperties });

  return (
    <div className="ln" ref={root}>
      <canvas className="bg" ref={canvas} />

      <header className="nav">
        <Link href="/" className="logo"><img src="/route-logo.svg" alt="" style={{ height: 18, width: "auto" }} />ROUTE</Link>
        <nav>
          <a href="#how">How it works</a><a href="#graph">Architecture</a><a href="#tools">Tools</a><a href="#cats">Roadmap</a>
        </nav>
        <Link href="/demo" className="btn w">Try the demo →</Link>
      </header>

      <main>
        <section className="hero wrap">
          <div className="glow" />
          <div {...r()} className="tag"><b />Open-source MCP infrastructure</div>
          <h1 {...r(0.1)}>Opportunities,<br /><span className="serif">routed to your agent.</span></h1>
          <p {...r(0.2)} className="sub">ROUTE gives any AI agent structured access to jobs, hackathons and more. Discover, understand, save and prepare, through one MCP server.</p>
          <div {...r(0.3)} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/demo" className="btn w">Launch demo</Link>
            <Link href="/docs" className="btn g">Read the docs</Link>
          </div>
          <div className="term mono">
            <div className="bar"><i /><i /><i /><span style={{ marginLeft: 10 }}>route-mcp · streamable-http</span></div>
            <div className="body">
              <div><span className="dim">agent ›</span> {typed}<span className="cur" /></div>
              {shown > 0 && <div className="dim" style={{ marginTop: 10 }}>↳ search_opportunities → get_opportunity</div>}
              <div className="res">{RESULTS.slice(0, shown).map(([a, b]) => <div key={a}>{a}<small>{b}</small></div>)}</div>
            </div>
          </div>
        </section>

        <div className="marq"><div>{Array.from({ length: 2 }).flatMap(() => ["MCP native", "Agent agnostic", "Devpost", "RemoteOK", "More providers soon", "Provider independent", "Streamable HTTP", "Open source", "Composable tools"]).map((t, i) => <span key={i}>✦ {t}</span>)}</div></div>

        <section className="s wrap" id="graph">
          <div {...r()} className="eyebrow">Architecture</div>
          <h2 {...r(0.1)}>One layer between <span className="serif">agents</span> and every source.</h2>
          <p {...r(0.2)} className="lead">Providers normalize messy platforms into a single opportunity model. Your agent only ever speaks MCP. Devpost and RemoteOK are live; more providers plug in next.</p>
          <div className="graph">
            <svg viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden>
              {RIGHT.map((p, i) => {
                const y = (10 + i * 16) * 5.6, d = `M860 ${y} C 700 ${y}, 640 280, 500 280`;
                return (
                  <g key={p.n}>
                    <path className={`th ${p.live ? "" : "dash"}`} d={d} />
                    {p.live && <path className="gl" d={d} style={{ animationDelay: `${-i * 1.1}s` }} />}
                  </g>
                );
              })}
              {LEFT.map((p, i) => {
                const y = p.y * 5.6, d = `M500 280 C 360 280, 300 ${y}, 140 ${y}`;
                return (
                  <g key={p.n}>
                    <path className="th" d={d} />
                    <path className="gl" d={d} style={{ animationDelay: `${-i * 0.9 - 0.5}s` }} />
                  </g>
                );
              })}
            </svg>
            <i className="orbit" /><i className="orbit o2" />
            <div className="node core" style={{ left: "50%", top: "50%" }}>
              <b>ROUTE MCP server</b><span>Tools · services · providers</span><br />
              {["search", "get", "prepare", "save"].map(t => <span key={t} className="chip">{t}</span>)}
            </div>
            {LEFT.map(p => (
              <div key={p.n} className="node l" style={{ left: "14%", top: `${p.y}%` }}><b>{p.n}</b><span>{p.s}</span></div>
            ))}
            {RIGHT.map((p, i) => (
              <div key={p.n} className={`node r ${p.live ? "" : "soon"}`} style={{ left: "86%", top: `${10 + i * 16}%`, animationDelay: `-${i}s` }}>
                {p.live ? <><b>{p.n}</b><span>{p.s} · Live</span></> : <><i className="ico">{p.n[0]}</i><div><b>{p.n}</b><span>{p.s} · Soon</span></div></>}
              </div>
            ))}
          </div>
        </section>

        <section className="s wrap" id="how">
          <div className="steps">
            <div className="stick">
              <div {...r()} className="eyebrow">Lifecycle</div>
              <h2 {...r(0.1)}>From search to <span className="serif">submission.</span></h2>
              <p {...r(0.2)} className="lead">Four capabilities ship today. Two more are on the way.</p>
            </div>
            <div>
              {[["01", "Discover", "Search supported sources and get normalized, structured results.", 0],
                ["02", "Understand", "Pull the description, deadline, prize, location and source for any opportunity.", 0],
                ["03", "Save", "Keep opportunities for later, separate from the sources used for discovery.", 0],
                ["04", "Prepare", "Get requirements, rules and dates before you commit to applying.", 0],
                ["05", "Act", "Draft applications and plan projects with opportunity context. Coming soon.", 1],
                ["06", "Track", "Follow deadlines, progress and updates in one place. Coming soon.", 1]].map(([n, t, d, s]) => (
                <div key={n as string} {...r()} className={`card ${s ? "soon" : ""}`}>
                  <span className="n mono">{n} / {s ? "FUTURE" : "LIVE"}</span><h3>{t}</h3><p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="s wrap">
          <div className="stats" {...r()}>
            <div><Counter to={2} /><small>Live categories</small></div>
            <div><Counter to={5} /><small>MCP tools</small></div>
            <div><Counter to={2} /><small>Source providers</small></div>
            <div><Counter to={100} suffix="%" /><small>Open source</small></div>
          </div>
        </section>

        <section className="s wrap" id="tools">
          <div {...r()} className="eyebrow">Tools</div>
          <h2 {...r(0.1)}>Small tools. <span className="serif">Big workflows.</span></h2>
          <div {...r(0.2)} className="code mono">
            <em>// an agent discovering and preparing for a hackathon</em><br />
            <span>await</span> route.<span>search_opportunities</span>({"{"} query: <span>"AI hackathon"</span> {"}"})<br />
            <span>await</span> route.<span>get_opportunity</span>({"{"} url {"}"})<br />
            <span>await</span> route.<span>prepare_opportunity</span>({"{"} url {"}"}) <em>// rules, dates, requirements</em><br />
            <span>await</span> route.<span>get_saved_opportunities</span>()
          </div>
        </section>

        <section className="s wrap" id="cats">
          <div {...r()} className="eyebrow">Roadmap</div>
          <h2 {...r(0.1)}>Starting with jobs and hackathons. <span className="serif">Built for everything else.</span></h2>
          <div className="cats">
            {[["Jobs", 1], ["Hackathons", 1], ["Scholarships", 0], ["Grants", 0], ["Fellowships", 0], ["Internships", 0], ["Accelerators", 0], ["Freelance", 0]].map(([t, on], i) => (
              <div key={t as string} {...r(i * 0.05)} className={`cat ${on ? "" : "off"}`}><small>{on ? "Live" : "Planned"}</small><b style={{ fontSize: 20, fontWeight: 500 }}>{t}</b></div>
            ))}
          </div>
        </section>

        <section className="s wrap">
          <div className="cta" {...r()}>
            <h2>Give your agent a <span className="serif">route.</span></h2>
            <p className="lead" style={{ margin: "0 auto 34px" }}>Connect an MCP client and start finding opportunities in minutes.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link href="/demo" className="btn w">Launch demo</Link>
              <a href={GH} className="btn g" target="_blank" rel="noreferrer">Star on GitHub</a>
            </div>
          </div>
        </section>
      </main>

      <button className={`top ${top ? "on" : ""}`} aria-label="Back to top" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}>
        <svg className="ring" viewBox="0 0 54 54"><circle className="trk" cx="27" cy="27" r="22" /><circle className="bar" cx="27" cy="27" r="22" /></svg>
        <span className="orb"><i /></span>
        <svg className="arr" width="22" viewBox="0 0 1017 715" style={{ rotate: "-90deg" }}><path fill="currentColor" d="M1 2 L1 142 L489 142 L506 145 L528 154 L541 163 L659 261 L689 283 L710 293 L846 343 L873 355 L689 419 L659 432 L628 454 L506 555 L490 564 L467 571 L1 572 L1 713 L541 714 L575 708 L592 700 L611 687 L912 445 L1015 360 L638 43 L605 18 L585 8 L572 4 L551 1Z" /></svg>
      </button>

      <footer><div className="wrap"><span className="logo"><img src="/route-logo.svg" alt="" style={{ height: 18, width: "auto" }} />ROUTE</span><span>Open-source opportunity infrastructure · <a href="/docs">Docs</a> · <a href={GH}>GitHub</a></span></div></footer>
    </div>
  );
}
