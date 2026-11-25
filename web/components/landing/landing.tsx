"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./landing.css";

const GH = "https://github.com/prime1999/Route";
const QUERY = "find remote AI hackathons closing this month";

const RESULTS: [string, string][] = [
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

const LIFECYCLE = [
  {
    n: "01",
    title: "Discover",
    description:
      "Search supported sources and get normalized, structured results.",
    future: false,
  },
  {
    n: "02",
    title: "Understand",
    description:
      "Pull the description, deadline, prize, location and source for any opportunity.",
    future: false,
  },
  {
    n: "03",
    title: "Save",
    description:
      "Keep opportunities for later, separate from the sources used for discovery.",
    future: false,
  },
  {
    n: "04",
    title: "Prepare",
    description:
      "Get requirements, rules and dates before you commit to applying.",
    future: false,
  },
  {
    n: "05",
    title: "Act",
    description:
      "Draft applications and plan projects with opportunity context. Coming soon.",
    future: true,
  },
  {
    n: "06",
    title: "Track",
    description:
      "Follow deadlines, progress and updates in one place. Coming soon.",
    future: true,
  },
];

const CATEGORIES = [
  { name: "Jobs", live: true },
  { name: "Hackathons", live: true },
  { name: "Scholarships", live: false },
  { name: "Grants", live: false },
  { name: "Fellowships", live: false },
  { name: "Internships", live: false },
  { name: "Accelerators", live: false },
  { name: "Freelance", live: false },
];

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    let frameId = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        observer.disconnect();

        const startTime = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / 1600, 1);
          const eased = 1 - Math.pow(1 - progress, 4);

          setValue(Math.round(to * eased));

          if (progress < 1) {
            frameId = requestAnimationFrame(tick);
          }
        };

        frameId = requestAnimationFrame(tick);
      },
      { threshold: 0.2 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [to]);

  return (
    <big ref={ref}>
      {value}
      {suffix}
    </big>
  );
}

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Typing animation and sample search results.
  useEffect(() => {
    let index = 0;

    const intervalId = window.setInterval(() => {
      index += 1;

      setTyped(QUERY.slice(0, index));

      if (index > QUERY.length + 4) {
        setShown(Math.min(RESULTS.length, index - QUERY.length - 4));
      }

      if (index > QUERY.length + 40) {
        index = 0;
        setShown(0);
      }
    }, 55);

    return () => window.clearInterval(intervalId);
  }, []);

  // Scroll reveals, scroll-linked CSS variables and card pointer position.
  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );

    root.querySelectorAll<HTMLElement>("[data-r]").forEach((element) => {
      revealObserver.observe(element);
    });

    const graph = root.querySelector<HTMLElement>(".graph");

    let scrollFrame = 0;

    const handleScroll = () => {
      window.cancelAnimationFrame(scrollFrame);

      scrollFrame = window.requestAnimationFrame(() => {
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const currentScroll = window.scrollY;

        const maxScroll = Math.max(documentHeight - viewportHeight, 1);

        root.style.setProperty("--p", String(currentScroll / maxScroll));

        root.style.setProperty(
          "--hp",
          String(
            Math.min(currentScroll / Math.max(viewportHeight * 0.6, 1), 1),
          ),
        );

        setShowBackToTop(currentScroll > viewportHeight * 0.5);

        if (graph) {
          const rect = graph.getBoundingClientRect();
          const graphHeight = Math.max(rect.height * 0.8, 1);

          const graphProgress = Math.min(
            Math.max((viewportHeight * 0.85 - rect.top) / graphHeight, 0),
            1,
          );

          graph.style.setProperty("--gp", String(graphProgress));
        }
      });
    };

    const handlePointerMove = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      const card = target.closest<HTMLElement>(".card");

      if (!card) return;

      const rect = card.getBoundingClientRect();

      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);

      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    root.addEventListener("mousemove", handlePointerMove);

    return () => {
      revealObserver.disconnect();

      window.cancelAnimationFrame(scrollFrame);

      window.removeEventListener("scroll", handleScroll);

      root.removeEventListener("mousemove", handlePointerMove);
    };
  }, []);

  // Particle-network background.
  // Animation pauses when the browser tab is hidden.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let running = false;

    const mouse = {
      x: -999,
      y: -999,
    };

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
    }));

    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];

        particle.x = (particle.x + particle.vx + 1) % 1;
        particle.y = (particle.y + particle.vy + 1) % 1;

        const x = particle.x * width;
        const y = particle.y * height;

        const mouseDistance = Math.hypot(x - mouse.x, y - mouse.y);

        context.fillStyle = `rgba(255,255,255,${
          mouseDistance < 160 ? 0.9 : 0.3
        })`;

        context.fillRect(x, y, 1.6, 1.6);

        // Each particle pair is checked only once.
        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];

          const otherX = other.x * width;
          const otherY = other.y * height;

          const distance = Math.hypot(x - otherX, y - otherY);

          if (distance < 130) {
            const opacity =
              (1 - distance / 130) * (mouseDistance < 200 ? 0.28 : 0.1);

            context.strokeStyle = `rgba(255,255,255,${opacity})`;

            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(otherX, otherY);
            context.stroke();
          }
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const startAnimation = () => {
      if (running || document.hidden) return;

      running = true;

      animationFrame = window.requestAnimationFrame(draw);
    };

    const stopAnimation = () => {
      running = false;

      window.cancelAnimationFrame(animationFrame);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    resizeCanvas();
    startAnimation();

    window.addEventListener("resize", resizeCanvas);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAnimation();

      window.removeEventListener("resize", resizeCanvas);

      window.removeEventListener("mousemove", handleMouseMove);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const reveal = (
    delay = 0,
  ): {
    "data-r": string;
    style: CSSProperties;
  } => ({
    "data-r": "",
    style: {
      "--d": `${delay}s`,
    } as CSSProperties,
  });

  return (
    <div className="ln" ref={rootRef}>
      <canvas className="bg" ref={canvasRef} aria-hidden="true" />

      <header className="nav">
        <Link href="/" className="logo">
          <img
            src="/route-logo.svg"
            alt=""
            style={{
              height: 18,
              width: "auto",
            }}
          />
          ROUTE
        </Link>

        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#graph">Architecture</a>
          <a href="#tools">Tools</a>
          <a href="#cats">Roadmap</a>
        </nav>

        <Link href="/demo" className="btn w">
          Try the demo →
        </Link>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="hero wrap">
          <div className="glow" />

          <div {...reveal()} className="tag">
            <b />
            Open-source MCP infrastructure
          </div>

          <h1 {...reveal(0.1)}>
            Opportunities,
            <br />
            <span className="serif">routed to your agent.</span>
          </h1>

          <p {...reveal(0.2)} className="sub">
            ROUTE gives AI assistants structured access to opportunities across
            different sources. Discover, understand, save and prepare through
            one open-source infrastructure layer.
          </p>

          <div
            {...reveal(0.3)}
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <Link href="/demo" className="btn w">
              Launch demo
            </Link>

            <Link href="/docs" className="btn g">
              Read the docs
            </Link>
          </div>

          <div className="term mono">
            <div className="bar">
              <i />
              <i />
              <i />

              <span style={{ marginLeft: 10 }}>
                route-mcp · streamable-http
              </span>
            </div>

            <div className="body">
              <div>
                <span className="dim">agent ›</span> {typed}
                <span className="cur" />
              </div>

              {shown > 0 && (
                <div className="dim" style={{ marginTop: 10 }}>
                  ↳ search_opportunities → get_opportunity
                </div>
              )}

              <div className="res">
                {RESULTS.slice(0, shown).map(([title, subtitle]) => (
                  <div key={title}>
                    {title}
                    <small>{subtitle}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="marq">
          <div>
            {Array.from({ length: 2 }).flatMap((_, copyIndex) =>
              [
                "MCP native",
                "Agent agnostic",
                "Devpost",
                "RemoteOK",
                "More providers soon",
                "Provider independent",
                "Streamable HTTP",
                "Open source",
                "Composable tools",
              ].map((item, index) => (
                <span key={`${copyIndex}-${index}`}>✦ {item}</span>
              )),
            )}
          </div>
        </div>

        {/* ARCHITECTURE */}
        <section className="s wrap" id="graph">
          <div {...reveal()} className="eyebrow">
            Architecture
          </div>

          <h2 {...reveal(0.1)}>
            One layer between <span className="serif">agents</span> and every
            source.
          </h2>

          <p {...reveal(0.2)} className="lead">
            Providers normalize messy platforms into a single opportunity model.
            Your agent only ever speaks MCP. Devpost and RemoteOK are live; more
            providers can plug in next.
          </p>

          <div className="graph">
            <svg
              viewBox="0 0 1000 560"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {RIGHT.map((provider, index) => {
                const y = (10 + index * 16) * 5.6;

                const path = `M860 ${y} C 700 ${y}, 640 280, 500 280`;

                return (
                  <g key={provider.n}>
                    <path
                      className={`th ${provider.live ? "" : "dash"}`}
                      d={path}
                    />

                    {provider.live && (
                      <path
                        className="gl"
                        d={path}
                        style={{
                          animationDelay: `${-index * 1.1}s`,
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {LEFT.map((agent, index) => {
                const y = agent.y * 5.6;

                const path = `M500 280 C 360 280, 300 ${y}, 140 ${y}`;

                return (
                  <g key={agent.n}>
                    <path className="th" d={path} />

                    <path
                      className="gl"
                      d={path}
                      style={{
                        animationDelay: `${-index * 0.9 - 0.5}s`,
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            <i className="orbit" />
            <i className="orbit o2" />

            <div
              className="node core"
              style={{
                left: "50%",
                top: "50%",
              }}
            >
              <b>ROUTE MCP server</b>

              <span>Tools · services · providers</span>

              <br />

              {["search", "get", "prepare", "save"].map((tool) => (
                <span key={tool} className="chip">
                  {tool}
                </span>
              ))}
            </div>

            {LEFT.map((agent) => (
              <div
                key={agent.n}
                className="node l"
                style={{
                  left: "14%",
                  top: `${agent.y}%`,
                }}
              >
                <b>{agent.n}</b>
                <span>{agent.s}</span>
              </div>
            ))}

            {RIGHT.map((provider, index) => (
              <div
                key={provider.n}
                className={`node r ${provider.live ? "" : "soon"}`}
                style={{
                  left: "86%",
                  top: `${10 + index * 16}%`,
                  animationDelay: `${-index}s`,
                }}
              >
                {provider.live ? (
                  <>
                    <b>{provider.n}</b>
                    <span>{provider.s} · Live</span>
                  </>
                ) : (
                  <>
                    <i className="ico">{provider.n[0]}</i>

                    <div>
                      <b>{provider.n}</b>
                      <span>{provider.s} · Planned</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="s wrap" id="how">
          <div className="steps">
            <div className="stick">
              <div {...reveal()} className="eyebrow">
                Lifecycle
              </div>

              <h2 {...reveal(0.1)}>
                From search to <span className="serif">submission.</span>
              </h2>

              <p {...reveal(0.2)} className="lead">
                Four capabilities ship today. Two more are on the way.
              </p>
            </div>

            <div>
              {LIFECYCLE.map((step) => (
                <div
                  key={step.n}
                  {...reveal()}
                  className={`card ${step.future ? "soon" : ""}`}
                >
                  <span className="n mono">
                    {step.n} / {step.future ? "FUTURE" : "LIVE"}
                  </span>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="s wrap">
          <div className="stats" {...reveal()}>
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

        {/* TOOLS */}
        <section className="s wrap" id="tools">
          <div {...reveal()} className="eyebrow">
            Tools
          </div>

          <h2 {...reveal(0.1)}>
            Small tools. <span className="serif">Big workflows.</span>
          </h2>

          <div {...reveal(0.2)} className="code mono">
            <em>// an agent discovering and preparing for a hackathon</em>
            <br />
            <span>await</span> route.
            <span>search_opportunities</span>({"{"} query:{" "}
            <span>"AI hackathon"</span> {"}"})
            <br />
            <span>await</span> route.
            <span>get_opportunity</span>({"{"} url {"}"})
            <br />
            <span>await</span> route.
            <span>prepare_opportunity</span>({"{"} url {"}"}){" "}
            <em>// rules, dates, requirements</em>
            <br />
            <span>await</span> route.
            <span>get_saved_opportunities</span>()
          </div>
        </section>

        {/* ROADMAP */}
        <section className="s wrap" id="cats">
          <div {...reveal()} className="eyebrow">
            Roadmap
          </div>

          <h2 {...reveal(0.1)}>
            Starting with jobs and hackathons.{" "}
            <span className="serif">Built for everything else.</span>
          </h2>

          <div className="cats">
            {CATEGORIES.map((category, index) => (
              <div
                key={category.name}
                {...reveal(index * 0.05)}
                className={`cat ${category.live ? "" : "off"}`}
              >
                <small>{category.live ? "Live" : "Planned"}</small>

                <b
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                  }}
                >
                  {category.name}
                </b>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="s wrap">
          <div className="cta" {...reveal()}>
            <h2>
              Give your agent a <span className="serif">route.</span>
            </h2>

            <p
              className="lead"
              style={{
                margin: "0 auto 34px",
              }}
            >
              Connect an MCP client and start finding opportunities in minutes.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <Link href="/demo" className="btn w">
                Launch demo
              </Link>

              <a
                href={GH}
                className="btn g"
                target="_blank"
                rel="noopener noreferrer"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* BACK TO TOP */}
      <button
        className={`top ${showBackToTop ? "on" : ""}`}
        aria-label="Back to top"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
      >
        <svg className="ring" viewBox="0 0 54 54" aria-hidden="true">
          <circle className="trk" cx="27" cy="27" r="22" />

          <circle className="bar" cx="27" cy="27" r="22" />
        </svg>

        <span className="orb">
          <i />
        </span>

        <svg
          className="arr"
          width="22"
          viewBox="0 0 1017 715"
          style={{
            rotate: "-90deg",
          }}
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M1 2 L1 142 L489 142 L506 145 L528 154 L541 163 L659 261 L689 283 L710 293 L846 343 L873 355 L689 419 L659 432 L628 454 L506 555 L490 564 L467 571 L1 572 L1 713 L541 714 L575 708 L592 700 L611 687 L912 445 L1015 360 L638 43 L605 18 L585 8 L572 4 L551 1Z"
          />
        </svg>
      </button>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <span className="logo">
            <img
              src="/route-logo.svg"
              alt=""
              style={{
                height: 18,
                width: "auto",
              }}
            />
            ROUTE
          </span>

          <span>
            Open-source opportunity infrastructure · <a href="/docs">Docs</a> ·{" "}
            <a href={GH} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
