"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./landing.css";

// Shared Tailwind class strings for the repeated design tokens.
const REV =
  "opacity-0 translate-y-12 blur-[8px] transition-[opacity,translate,filter] duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] [transition-delay:var(--d,0s)] data-in:opacity-100 data-in:translate-y-0 data-in:blur-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:blur-none";
const SERIF = "font-(family-name:--font-serif) font-normal italic";
const WRAP = "mx-auto w-full max-w-[1160px] px-6";
const SECTION = `${WRAP} py-[140px]`;
const EYEBROW = "mb-[18px] text-xs uppercase tracking-[.2em] text-white/50";
const H2 =
  "mb-[18px] max-w-[820px] text-[clamp(34px,5vw,64px)] leading-[1.04] font-medium tracking-[-.035em]";
const LEAD = "max-w-[560px] text-base leading-[1.75] text-white/50";
const BTN =
  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-[11px] text-[13px] font-medium transition duration-300";
const BTN_W = `${BTN} border-white bg-white !text-black hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(255,255,255,.35)]`;
const BTN_G = `${BTN} border-white/10 bg-white/[.04] hover:bg-white/10`;
const NODE =
  "ln-node absolute z-[2] w-max left-(--x) -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-white/10 bg-[#0a0a0a] px-4 py-3.5 text-xs transition-[border-color,box-shadow] duration-[400ms] hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,.18)] max-md:left-(--xm) max-md:px-2.5 max-md:py-2 max-md:text-[11px]";
const NODE_B = "mb-[3px] block text-[13px] font-medium";
const NODE_S = "text-white/50 max-md:hidden";
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
  return (
    <big
      className="block text-[56px] font-medium tracking-[-.04em]"
      ref={ref as React.RefObject<HTMLElement>}
    >
      {v}
      {suffix}
    </big>
  );
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0);
  const [top, setTop] = useState(false);

  // Simulate an agent typing a query, then reveal its results before restarting.
  useEffect(() => {
    let i = 0,
      alive = true;
    const t = setInterval(() => {
      if (!alive) return;
      i++;
      setTyped(QUERY.slice(0, i));
      if (i > QUERY.length + 4) setShown(Math.min(3, i - QUERY.length - 4));
      if (i > QUERY.length + 40) {
        i = 0;
        setShown(0);
      }
    }, 55);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Reveal marked elements as they enter the viewport and update CSS variables
  // used by the progress effects, architecture graph, and back-to-top control.
  useEffect(() => {
    const el = root.current!;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach(
          (e) =>
            e.isIntersecting &&
            (e.target.setAttribute("data-in", ""), io.unobserve(e.target)),
        ),
      { threshold: 0.15 },
    );
    el.querySelectorAll("[data-r]").forEach((n) => io.observe(n));
    const graph = el.querySelector<HTMLElement>(".ln-graph")!;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        el.style.setProperty(
          "--p",
          String(scrollY / (h.scrollHeight - innerHeight || 1)),
        );
        el.style.setProperty(
          "--hp",
          String(Math.min(scrollY / (innerHeight * 0.6), 1)),
        );
        setTop(scrollY > innerHeight * 0.5);
        const r = graph.getBoundingClientRect();
        graph.style.setProperty(
          "--gp",
          String(
            Math.min(
              Math.max((innerHeight * 0.85 - r.top) / (r.height * 0.45), 0),
              1,
            ),
          ),
        );
      });
    };
    onScroll();
    // capture:true also catches scrolling inside any ancestor scroller, not just the window.
    addEventListener("scroll", onScroll, { passive: true, capture: true });
    addEventListener("resize", onScroll);
    // Cards expose a pointer-following highlight through CSS custom properties.
    const spot = (e: MouseEvent) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>(".ln-card");
      if (!c) return;
      const b = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - b.left}px`);
      c.style.setProperty("--my", `${e.clientY - b.top}px`);
    };
    el.addEventListener("mousemove", spot);
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll, true);
      removeEventListener("resize", onScroll);
      el.removeEventListener("mousemove", spot);
    };
  }, []);

  // Draw the decorative particle network behind the page. Coordinates are
  // normalized so the same particle layout survives viewport resizes.
  useEffect(() => {
    const c = canvas.current!,
      x = c.getContext("2d")!;
    let w = 0,
      h = 0,
      raf = 0;
    const m = { x: -999, y: -999 };
    const P = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
    }));
    const size = () => {
      w = c.width = innerWidth;
      h = c.height = innerHeight;
    };
    size();
    const mv = (e: MouseEvent) => {
      m.x = e.clientX;
      m.y = e.clientY;
    };
    addEventListener("resize", size);
    addEventListener("mousemove", mv);
    const draw = () => {
      x.clearRect(0, 0, w, h);
      for (const p of P) {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        const px = p.x * w,
          py = p.y * h,
          d = Math.hypot(px - m.x, py - m.y);
        x.fillStyle = `rgba(255,255,255,${d < 160 ? 0.9 : 0.3})`;
        x.fillRect(px, py, 1.6, 1.6);
        for (const q of P) {
          const dd = Math.hypot(px - q.x * w, py - q.y * h);
          if (dd < 130) {
            x.strokeStyle = `rgba(255,255,255,${(1 - dd / 130) * (d < 200 ? 0.28 : 0.1)})`;
            x.beginPath();
            x.moveTo(px, py);
            x.lineTo(q.x * w, q.y * h);
            x.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      removeEventListener("mousemove", mv);
    };
  }, []);

  // Props for scroll-revealed elements: shared reveal classes + stagger delay.
  const rv = (extra = "", d = 0) => ({
    "data-r": "",
    className: `${REV} ${extra}`,
    style: { "--d": `${d}s` } as React.CSSProperties,
  });
  const LOGO = (
    <img src="/route-logo.svg" alt="" style={{ height: 18, width: "auto" }} />
  );
  const LOGO_CLS =
    "flex items-center gap-2 text-sm font-semibold tracking-[.22em]";

  return (
    <div
      className="ln relative overflow-x-clip bg-[#050505] text-[15px] text-[#fafafa]"
      ref={root}
    >
      {/* The canvas is decorative; all meaningful content remains in HTML below. */}
      <canvas
        className="pointer-events-none fixed inset-0 z-0 size-full"
        ref={canvas}
      />

      {/* Primary navigation and the persistent demo call to action. */}
      <header className="fixed top-3.5 left-1/2 z-50 flex w-[min(860px,calc(100%-24px))] -translate-x-1/2 items-center justify-between gap-7 rounded-full border border-white/10 bg-[#0a0a0a]/60 py-[9px] pr-2.5 pl-5 backdrop-blur-[14px]">
        <Link href="/" className={LOGO_CLS}>
          {LOGO}ROUTE
        </Link>
        <nav className="flex gap-[26px] text-[13px] text-white/50 max-md:hidden">
          {[
            ["#how", "How it works"],
            ["#graph", "Architecture"],
            ["#tools", "Tools"],
            ["#cats", "Roadmap"],
          ].map(([h, t]) => (
            <a key={h} href={h} className="hover:text-white">
              {t}
            </a>
          ))}
        </nav>
        <Link href="/demo" className={BTN_W}>
          Try the demo →
        </Link>
      </header>

      <main className="relative z-[1]">
        {/* Hero section: explains the product and previews an MCP interaction. */}
        <section
          className={`${WRAP} relative min-h-screen pt-[150px] text-center`}
        >
          <div className="pointer-events-none absolute top-[210px] left-1/2 size-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.11),transparent_62%)] blur-[30px] animate-[ln-breathe_6s_ease-in-out_infinite]" />
          <div
            {...rv(
              "inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[.03] px-3.5 py-1.5 text-xs text-white/50",
            )}
          >
            <b className="size-1.5 rounded-full bg-white animate-[ln-pulse_1.6s_infinite]" />
            Open-source MCP infrastructure
          </div>
          <h1
            {...rv(
              "mt-[26px] mb-[22px] text-[clamp(44px,8vw,104px)] leading-[.98] font-medium tracking-[-.04em]",
              0.1,
            )}
          >
            Opportunities,
            <br />
            <span className={SERIF}>routed to your agent.</span>
          </h1>
          <p
            {...rv(
              "mx-auto mb-[34px] max-w-[560px] text-base leading-[1.7] text-white/50",
              0.2,
            )}
          >
            ROUTE gives any AI agent structured access to jobs, hackathons and
            more. Discover, understand, save and prepare, through one MCP
            server.
          </p>
          <div {...rv("flex justify-center gap-3", 0.3)}>
            <Link href="/demo" className={BTN_W}>
              Launch demo
            </Link>
            <Link href="/docs" className={BTN_G}>
              Read the docs
            </Link>
          </div>
          <div className="mx-auto mt-[70px] max-w-[880px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.06] to-white/[.015] text-left font-mono shadow-[0_60px_140px_-40px_rgba(255,255,255,.12)] [transform:perspective(1400px)_rotateX(calc(14deg_-_var(--hp,0)*14deg))_translateY(calc(var(--hp,0)*-30px))]">
            <div className="flex items-center gap-[7px] border-b border-white/10 px-4 py-[13px] text-[11px] text-white/50">
              {[0, 1, 2].map((i) => (
                <i key={i} className="size-[9px] rounded-full bg-white/20" />
              ))}
              <span className="ml-2.5">route-mcp · streamable-http</span>
            </div>
            <div className="min-h-[290px] p-[22px] text-[13px] leading-[1.9]">
              <div>
                <span className="text-white/50">agent ›</span> {typed}
                <span className="inline-block h-[15px] w-2 bg-white align-middle animate-[ln-blink_1s_steps(2)_infinite]" />
              </div>
              {shown > 0 && (
                <div className="mt-2.5 text-white/50">
                  ↳ search_opportunities → get_opportunity
                </div>
              )}
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {RESULTS.slice(0, shown).map(([a, b]) => (
                  <div
                    key={a}
                    className="rounded-[10px] border border-white/10 bg-white/[.03] p-3 animate-[ln-rise_.6s_both]"
                  >
                    {a}
                    <small className="mt-1 block text-[11px] text-white/50">
                      {b}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Duplicate the labels so the CSS marquee can loop without a gap. */}
        <div className="mt-[90px] overflow-hidden border-y border-white/10 py-5 [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <div className="flex w-max gap-14 text-xs tracking-[.2em] text-white/50 uppercase animate-[ln-scroll_32s_linear_infinite]">
            {Array.from({ length: 2 })
              .flatMap(() => [
                "MCP native",
                "Agent agnostic",
                "Devpost",
                "RemoteOK",
                "More providers soon",
                "Provider independent",
                "Streamable HTTP",
                "Open source",
                "Composable tools",
              ])
              .map((t, i) => (
                <span key={i}>✦ {t}</span>
              ))}
          </div>
        </div>

        {/* Architecture diagram showing clients, the Route server, and providers. */}
        <section className={SECTION} id="graph">
          <div {...rv(EYEBROW)}>Architecture</div>
          <h2 {...rv(H2, 0.1)}>
            One layer between <span className={SERIF}>agents</span> and every
            source.
          </h2>
          <p {...rv(LEAD, 0.2)}>
            Providers normalize messy platforms into a single opportunity model.
            Your agent only ever speaks MCP. Devpost and RemoteOK are live; more
            providers plug in next.
          </p>
          <div className="ln-graph relative mt-[70px] h-[720px] overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:22px_22px] md:h-[560px]">
            <svg
              className="absolute inset-0 z-[1] size-full"
              viewBox="0 0 1000 560"
              preserveAspectRatio="none"
              aria-hidden
            >
              {RIGHT.map((p, i) => {
                const y = (10 + i * 16) * 5.6,
                  d = `M860 ${y} C 700 ${y}, 640 280, 500 280`;
                return (
                  <g key={p.n}>
                    <path className={`ln-th ${p.live ? "" : "dash"}`} d={d} />
                    {p.live && (
                      <path
                        className="ln-gl"
                        d={d}
                        style={{ animationDelay: `${-i * 1.1}s` }}
                      />
                    )}
                  </g>
                );
              })}
              {LEFT.map((p, i) => {
                const y = p.y * 5.6,
                  d = `M500 280 C 360 280, 300 ${y}, 140 ${y}`;
                return (
                  <g key={p.n}>
                    <path className="ln-th" d={d} />
                    <path
                      className="ln-gl"
                      d={d}
                      style={{ animationDelay: `${-i * 0.9 - 0.5}s` }}
                    />
                  </g>
                );
              })}
            </svg>
            <i
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 z-[1] size-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/25 animate-[ln-spin_28s_linear_infinite] md:size-[300px]"
            />
            <i
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 z-[1] size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.12] animate-[ln-ping_3s_ease-out_infinite] md:size-[420px]"
            />
            <div className="ln-node ln-core absolute top-1/2 left-1/2 z-[3] min-w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-white bg-white px-4 py-3.5 text-center text-xs text-black max-md:min-w-[120px] max-md:p-3 max-md:text-[11px]">
              <b className={NODE_B}>ROUTE MCP server</b>
              <span className="text-[#555]">Tools · services · providers</span>
              <br />
              {["search", "get", "prepare", "save"].map((t) => (
                <span
                  key={t}
                  className="mx-1 mt-2 inline-block rounded-md border border-[#bbb] px-2 py-[3px] text-[10px] text-[#333] max-md:hidden"
                >
                  {t}
                </span>
              ))}
            </div>
            {LEFT.map((p) => (
              <div
                key={p.n}
                className={`${NODE} min-w-[170px] max-md:min-w-0`}
                style={
                  {
                    "--x": "14%",
                    "--xm": "22%",
                    top: `${p.y}%`,
                  } as React.CSSProperties
                }
              >
                <b className={NODE_B}>{p.n}</b>
                <span className={NODE_S}>{p.s}</span>
              </div>
            ))}
            {RIGHT.map((p, i) => (
              <div
                key={p.n}
                className={`${NODE} ${p.live ? "min-w-[170px]" : "flex min-w-[150px] items-center gap-2.5 border-dashed px-3! py-[9px]! [&>*]:opacity-60"} max-md:min-w-0`}
                style={
                  {
                    "--x": "86%",
                    "--xm": "78%",
                    top: `${10 + i * 16}%`,
                    animationDelay: `-${i}s`,
                  } as React.CSSProperties
                }
              >
                {p.live ? (
                  <>
                    <b className={NODE_B}>{p.n}</b>
                    <span className={NODE_S}>{p.s} · Live</span>
                  </>
                ) : (
                  <>
                    <i className="grid size-[26px] place-items-center rounded-lg border border-dashed border-white/40 text-xs text-white/50 not-italic">
                      {p.n[0]}
                    </i>
                    <div>
                      <b className={`${NODE_B} mb-0!`}>{p.n}</b>
                      <span className={NODE_S}>{p.s} · Soon</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Lifecycle cards distinguish currently available capabilities from the roadmap. */}
        <section className={SECTION} id="how">
          <div className="grid gap-[70px] md:grid-cols-2">
            <div className="self-start md:sticky md:top-[130px]">
              <div {...rv(EYEBROW)}>Lifecycle</div>
              <h2 {...rv(H2, 0.1)}>
                From search to <span className={SERIF}>submission.</span>
              </h2>
              <p {...rv(LEAD, 0.2)}>
                Four capabilities ship today. Two more are on the way.
              </p>
            </div>
            <div>
              {[
                [
                  "01",
                  "Discover",
                  "Search supported sources and get normalized, structured results.",
                  0,
                ],
                [
                  "02",
                  "Understand",
                  "Pull the description, deadline, prize, location and source for any opportunity.",
                  0,
                ],
                [
                  "03",
                  "Save",
                  "Keep opportunities for later, separate from the sources used for discovery.",
                  0,
                ],
                [
                  "04",
                  "Prepare",
                  "Get requirements, rules and dates before you commit to applying.",
                  0,
                ],
                [
                  "05",
                  "Act",
                  "Draft applications and plan projects with opportunity context. Coming soon.",
                  1,
                ],
                [
                  "06",
                  "Track",
                  "Follow deadlines, progress and updates in one place. Coming soon.",
                  1,
                ],
              ].map(([n, t, d, s]) => (
                <div key={n as string} {...rv("mb-[22px]")}>
                  <div
                    className={`ln-card relative overflow-hidden rounded-[18px] border bg-gradient-to-br from-white/[.055] to-white/[.01] p-[30px] transition duration-[400ms] hover:-translate-y-1 hover:border-white/40 ${s ? "border-dashed border-white/10 opacity-55" : "border-white/10"}`}
                  >
                    <span className="font-mono text-xs text-white/50">
                      {n} / {s ? "FUTURE" : "LIVE"}
                    </span>
                    <h3 className="mt-[30px] mb-2 text-2xl font-medium tracking-[-.02em]">
                      {t}
                    </h3>
                    <p className="leading-[1.7] text-white/50">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Animated product metrics reinforce the current project scope. */}
        <section className={SECTION}>
          <div
            {...rv(
              "grid grid-cols-2 overflow-hidden rounded-[18px] border border-white/10 md:grid-cols-4 [&>div]:border-r [&>div]:border-white/10 [&>div]:px-[26px] [&>div]:py-[34px] [&>div:last-child]:border-r-0 [&_small]:text-white/50",
            )}
          >
            <div>
              <Counter to={2} />
              <small>Live categories</small>
            </div>
            <div>
              <Counter to={5} />
              <small>MCP tools</small>
            </div>
            <div>
              <Counter to={2} />
              <small>Source providers</small>
            </div>
            <div>
              <Counter to={100} suffix="%" />
              <small>Open source</small>
            </div>
          </div>
        </section>

        {/* Example tool calls show how an agent composes Route capabilities. */}
        <section className={SECTION} id="tools">
          <div {...rv(EYEBROW)}>Tools</div>
          <h2 {...rv(H2, 0.1)}>
            Small tools. <span className={SERIF}>Big workflows.</span>
          </h2>
          <div
            {...rv(
              "mt-[34px] overflow-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-[26px] font-mono text-[12.5px] leading-[1.9] [&_em]:text-white/50 [&_em]:not-italic",
              0.2,
            )}
          >
            <em>// an agent discovering and preparing for a hackathon</em>
            <br />
            <span>await</span> route.<span>search_opportunities</span>({"{"}{" "}
            query: <span>"AI hackathon"</span> {"}"})<br />
            <span>await</span> route.<span>get_opportunity</span>({"{"} url{" "}
            {"}"})<br />
            <span>await</span> route.<span>prepare_opportunity</span>({"{"} url{" "}
            {"}"}) <em>// rules, dates, requirements</em>
            <br />
            <span>await</span> route.<span>get_saved_opportunities</span>()
          </div>
        </section>

        {/* Provider categories make the live scope and planned expansion explicit. */}
        <section className={SECTION} id="cats">
          <div {...rv(EYEBROW)}>Roadmap</div>
          <h2 {...rv(H2, 0.1)}>
            Starting with jobs and hackathons.{" "}
            <span className={SERIF}>Built for everything else.</span>
          </h2>
          <div className="mt-[60px] grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {[
              ["Jobs", 1],
              ["Hackathons", 1],
              ["Scholarships", 0],
              ["Grants", 0],
              ["Fellowships", 0],
              ["Internships", 0],
              ["Accelerators", 0],
              ["Freelance", 0],
            ].map(([t, on], i) => (
              <div key={t as string} {...rv("", i * 0.05)}>
                <div
                  className={`group flex min-h-[140px] flex-col justify-between rounded-[14px] border p-[22px] transition duration-[350ms] hover:-translate-y-1.5 hover:bg-white hover:text-black ${on ? "border-white/10" : "border-dashed border-white/10 opacity-45"}`}
                >
                  <small className="text-[11px] tracking-[.14em] text-white/50 uppercase group-hover:text-[#444]">
                    {on ? "Live" : "Planned"}
                  </small>
                  <b className="text-xl font-medium">{t}</b>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final conversion block for visitors who have read the overview. */}
        <section className={SECTION}>
          <div
            {...rv(
              "overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.14),transparent_60%)] px-6 py-[110px] text-center",
            )}
          >
            <h2 className={`${H2} mx-auto`}>
              Give your agent a <span className={SERIF}>route.</span>
            </h2>
            <p className={`${LEAD} mx-auto mb-[34px]`}>
              Connect an MCP client and start finding opportunities in minutes.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/demo" className={BTN_W}>
                Launch demo
              </Link>
              <a href={GH} className={BTN_G} target="_blank" rel="noreferrer">
                Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Appears after the first half-screen and returns the visitor smoothly to the hero. */}
      <button
        aria-label="Back to top"
        onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
        className={`group fixed right-[22px] bottom-[22px] z-[55] grid size-[54px] cursor-pointer place-items-center rounded-full bg-[#0a0a0a]/75 text-white backdrop-blur-[10px] transition duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)] hover:bg-white hover:text-black max-md:right-3.5 max-md:bottom-3.5 ${top ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-5 scale-[.8] opacity-0"}`}
      >
        <svg
          className="absolute inset-0 size-full -rotate-90 fill-none stroke-2"
          viewBox="0 0 54 54"
        >
          <circle className="stroke-white/15" cx="27" cy="27" r="22" />
          <circle
            className="stroke-current [stroke-dasharray:138.2] [stroke-dashoffset:calc(138.2*(1_-_var(--p,0)))] [stroke-linecap:round]"
            cx="27"
            cy="27"
            r="22"
          />
        </svg>
        <span className="absolute inset-0 [rotate:calc(var(--p,0)*360deg)]">
          <i className="absolute top-0.5 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
        </span>
        <svg
          className="transition duration-300 group-hover:-translate-y-[3px]"
          width="22"
          viewBox="0 0 1017 715"
          style={{ rotate: "-90deg" }}
        >
          <path
            fill="currentColor"
            d="M1 2 L1 142 L489 142 L506 145 L528 154 L541 163 L659 261 L689 283 L710 293 L846 343 L873 355 L689 419 L659 432 L628 454 L506 555 L490 564 L467 571 L1 572 L1 713 L541 714 L575 708 L592 700 L611 687 L912 445 L1015 360 L638 43 L605 18 L585 8 L572 4 L551 1Z"
          />
        </svg>
      </button>

      <footer className="relative z-[1]">
        <div
          className={`${WRAP} flex justify-between border-t border-white/10 py-11 text-[13px] text-white/50`}
        >
          <span className={LOGO_CLS}>{LOGO}ROUTE</span>
          <span>
            Open-source opportunity infrastructure · <a href="/docs">Docs</a> ·{" "}
            <a href={GH}>GitHub</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
