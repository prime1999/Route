/**
 * Devpost multi-page preparation test (offline).
 *
 * Verifies how DevpostProvider.getPreparationContext() retrieves pages
 * linked from a hackathon overview. Unlike devpost.test.ts, this test
 * makes no network requests: global fetch is replaced with a stub that
 * serves small HTML fixtures.
 *
 * Test cases:
 *
 * 1. Link discovery and URL restrictions.
 * 2. Multi-page sourceContent and schema validation.
 * 3. Deduplication of URLs and structured facts.
 * 4. Bounded concurrency and per-page timeouts being applied.
 * 5. Partial failures keep the pages that were retrieved.
 * 6. Redirects away from the hackathon are not reported as pages.
 * 7. The page limit counts failed requests.
 * 8. An overview failure is reported as an error.
 *
 * This is intentionally a simple executable test, matching the other
 * Route tests. Run it after compiling with:
 *
 *     node dist/opportunities/providers/devpost.crawl.test.js
 */

import { DevpostProvider } from "./devpost.js";

import { opportunityPreparationContextSchema } from "../preparation/schema.js";

import type { Opportunity } from "../types.js";

const ORIGIN = "https://hack.devpost.com";

/** MAX_PREPARATION_PAGES in devpost.ts, including the overview. */
const EXPECTED_PAGE_LIMIT = 12;

/** PREPARATION_FETCH_CONCURRENCY in devpost.ts. */
const EXPECTED_CONCURRENCY = 3;

interface StubPage {
  status?: number;
  contentType?: string;
  html?: string;
  redirectedTo?: string;
  throws?: boolean;
}

const pages = new Map<string, StubPage>();
const requested: string[] = [];
const sentSignal = new Map<string, boolean>();

let inFlight = 0;
let maxInFlight = 0;

const realFetch = globalThis.fetch;

/**
 * Replace fetch with a stub that serves the fixtures above.
 *
 * Unknown URLs return 404, like a missing Devpost page.
 */
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);

  requested.push(url);
  sentSignal.set(url, init?.signal instanceof AbortSignal);

  inFlight += 1;
  maxInFlight = Math.max(maxInFlight, inFlight);

  try {
    // Let concurrent requests overlap so concurrency can be measured.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const page = pages.get(url);

    if (!page) {
      return new Response("Not found", { status: 404 });
    }

    if (page.throws) {
      throw new TypeError("fetch failed");
    }

    const response = new Response(page.html ?? "", {
      status: page.status ?? 200,
      headers: {
        "content-type": page.contentType ?? "text/html; charset=utf-8",
      },
    });

    if (page.redirectedTo) {
      // fetch() exposes the final address of a followed redirect as url.
      Object.defineProperty(response, "url", { value: page.redirectedTo });
    }

    return response;
  } finally {
    inFlight -= 1;
  }
}) as typeof fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSameList(actual: string[], expected: string[], label: string) {
  const a = JSON.stringify([...actual].sort());
  const e = JSON.stringify([...expected].sort());

  assert(a === e, `${label}\n  expected: ${e}\n  actual:   ${a}`);
}

function page(title: string, body: string, nav = ""): string {
  return (
    `<!doctype html><html><head><title>${title} - Devpost</title></head>` +
    `<body><header><nav>${nav}</nav></header>` +
    `<main><h1>${title}</h1>${body}</main>` +
    `<footer>Footer text</footer></body></html>`
  );
}

/**
 * Navigation links: relevant pages, duplicates of them, and links that
 * must never be followed.
 */
const OVERVIEW_NAV = `
  <a href="/">Overview</a>
  <a href="/participants">Participants</a>
  <a href="/resources">Resources</a>
  <a href="/rules">Rules</a>
  <a href="/project-gallery">Project gallery</a>
  <a href="/updates">Updates</a>
  <a href="/forum_topics">Discussions</a>
  <a href="/details/faqs">FAQs</a>
  <a href="/details/dates">Schedule</a>
  <a href="/rules#judging">Judging criteria</a>
  <a href="/rules/">Rules again</a>
  <a href="https://devpost.com/submit-to/123-hack/manage/submissions">My projects</a>
  <a href="/submit-to/123-hack/manage/submissions">Submissions</a>
  <a href="https://example.com/rules">External rules</a>
  <a href="https://other.devpost.com/rules">Another hackathon rules</a>
  <a href="http://hack.devpost.com/prizes">Prizes over http</a>
  <a href="mailto:help@example.com">Rules contact</a>
  <a href="/register?flow%5Bdata%5D%5Bchallenge_id%5D=1&flow%5Bname%5D=register_for_challenge">Join hackathon</a>
  <a href="/users/login?next=/rules">Rules login</a>
  <a href="/home?topic=rules">Home page</a>
`;

const opportunity: Opportunity = {
  id: `devpost:url:${ORIGIN}/`,
  title: "Example Hackathon",
  type: "hackathon",
  organization: "Devpost",
  description: "Example hackathon overview.",
  url: `${ORIGIN}/`,
  source: "devpost",
  sourceUrl: `${ORIGIN}/`,
};

/** Reset state and publish a small, realistic hackathon site. */
function resetSite(): void {
  pages.clear();
  requested.length = 0;
  sentSignal.clear();
  inFlight = 0;
  maxInFlight = 0;

  pages.set(`${ORIGIN}/`, {
    html: page(
      "Example Hackathon",
      `<p>Deadline: Oct 23, 2026 @ 12:00pm PDT</p>
       <h6>Who can participate</h6>
       <ul>
         <li>Above legal age of majority</li>
         <li>All countries excluding standard exceptions</li>
       </ul>`,
      OVERVIEW_NAV,
    ),
  });

  pages.set(`${ORIGIN}/rules`, {
    html: page(
      "Rules",
      "<p>Deadline: Oct 23, 2026 @ 12:00pm PDT</p><p>Official rules text.</p>",
    ),
  });

  pages.set(`${ORIGIN}/resources`, {
    html: page("Resources", "<p>Resources text.</p>"),
  });

  pages.set(`${ORIGIN}/details/faqs`, {
    html: page("FAQs", "<p>FAQ text.</p>"),
  });

  pages.set(`${ORIGIN}/details/dates`, {
    html: page("Schedule", "<p>Schedule text.</p>"),
  });

  pages.set(`${ORIGIN}/updates`, {
    html: page(
      "Updates",
      `<a href="/updates/46538-strong-submission-tips">Strong Submission Tips</a>
       <a href="/updates">All updates</a>`,
    ),
  });

  pages.set(`${ORIGIN}/updates/46538-strong-submission-tips`, {
    html: page(
      "Strong Submission Tips",
      "<p>Tips text.</p>",
      `<a href="/rules">Rules</a><a href="/updates">Updates</a>`,
    ),
  });
}

async function prepare() {
  return new DevpostProvider().getPreparationContext(opportunity);
}

async function main() {
  console.log("=== TEST 1: Link discovery and URL restrictions ===");

  resetSite();

  const context = await prepare();

  assertSameList(
    requested.slice(1),
    [
      `${ORIGIN}/resources`,
      `${ORIGIN}/rules`,
      `${ORIGIN}/updates`,
      `${ORIGIN}/details/faqs`,
      `${ORIGIN}/details/dates`,
      `${ORIGIN}/updates/46538-strong-submission-tips`,
    ],
    "Only relevant same-host https pages should be requested.",
  );

  assert(requested[0] === `${ORIGIN}/`, "The overview must be fetched first.");

  console.log("✓ Rules, Resources, FAQs, Dates, Updates and the update");
  console.log("  article were discovered (the article from the Updates page).");
  console.log("✓ Not requested: Participants, Project gallery, Discussions,");
  console.log("  external hosts, other subdomains, http, mailto, register,");
  console.log("  login, submission management, query-string-only matches.");

  console.log("\n=== TEST 2: Multi-page sourceContent ===");

  const sourceContent = context.sourceContent ?? [];

  assert(
    sourceContent.length === 7,
    `Expected 7 pages, got ${sourceContent.length}.`,
  );

  assert(
    sourceContent[0]?.url === `${ORIGIN}/`,
    "The overview must remain the first sourceContent entry.",
  );

  assert(
    sourceContent[0]?.content.includes("Deadline: Oct 23, 2026"),
    "The overview content must be preserved.",
  );

  assertSameList(
    sourceContent.map((entry) => entry.title ?? ""),
    [
      "Example Hackathon",
      "Rules",
      "Resources",
      "FAQs",
      "Schedule",
      "Updates",
      "Strong Submission Tips",
    ],
    "Each page should keep its own title.",
  );

  for (const entry of sourceContent) {
    assert(entry.content.length > 0, `Empty content for ${entry.url}.`);
    assert(entry.url.startsWith(`${ORIGIN}/`), `Unexpected URL ${entry.url}.`);
  }

  const validation = opportunityPreparationContextSchema.safeParse(context);

  assert(validation.success, "Multi-page context failed schema validation.");

  assert(context.source.provider === "devpost", "Unexpected provider.");
  assert(
    context.source.url === `${ORIGIN}/`,
    "source.url must be the overview.",
  );
  assert(Boolean(context.source.retrievedAt), "Missing retrievedAt.");

  console.log("✓ Overview first, then six linked pages, one entry each.");
  console.log("✓ Titles, URLs and content preserved per page.");
  console.log("✓ Result passed the preparation schema.");

  console.log("\n=== TEST 3: Deduplication ===");

  const counts = new Map<string, number>();

  for (const url of requested) {
    counts.set(url, (counts.get(url) ?? 0) + 1);
  }

  for (const [url, count] of counts) {
    assert(count === 1, `${url} was requested ${count} times.`);
  }

  console.log("✓ /rules#judging and /rules/ did not cause extra requests.");
  console.log("✓ Pages linking back to visited pages did not refetch them.");

  const dates = context.preparation.importantDates ?? [];

  assert(
    dates.length === 1 && dates[0]?.value === "Oct 23, 2026",
    `Expected one deduplicated deadline, got ${JSON.stringify(dates)}.`,
  );

  assert(
    (context.preparation.eligibility ?? []).length === 2,
    "Overview eligibility must be preserved.",
  );

  console.log("✓ The deadline found on two pages appears once.");
  console.log("✓ Existing eligibility extraction from the overview kept.");

  console.log("\n=== TEST 4: Concurrency and timeouts ===");

  assert(
    maxInFlight <= EXPECTED_CONCURRENCY,
    `Up to ${maxInFlight} concurrent requests; limit is ${EXPECTED_CONCURRENCY}.`,
  );

  assert(maxInFlight >= 2, "Linked pages should be fetched in parallel.");

  for (const url of requested.slice(1)) {
    assert(sentSignal.get(url) === true, `No timeout signal sent for ${url}.`);
  }

  console.log(`✓ At most ${maxInFlight} requests were in flight at once.`);
  console.log("✓ Every linked-page request carried a timeout signal.");
  console.log("  (The timeout duration itself is not exercised here.)");

  console.log("\n=== TEST 5: Partial failures ===");

  resetSite();

  pages.set(`${ORIGIN}/resources`, { status: 404 });
  pages.set(`${ORIGIN}/details/faqs`, { throws: true });
  pages.set(`${ORIGIN}/details/dates`, {
    contentType: "application/pdf",
    html: "%PDF-1.7",
  });
  pages.set(`${ORIGIN}/updates/46538-strong-submission-tips`, {
    html: "<html><body><main></main></body></html>",
  });

  const partial = await prepare();

  assertSameList(
    (partial.sourceContent ?? []).map((entry) => entry.url),
    [`${ORIGIN}/`, `${ORIGIN}/rules`, `${ORIGIN}/updates`],
    "Only pages that were retrieved with content should be returned.",
  );

  assert(
    requested.includes(`${ORIGIN}/updates/46538-strong-submission-tips`),
    "The update article should still have been requested.",
  );

  console.log("✓ 404, network error, non-HTML and empty pages were omitted.");
  console.log("✓ The overview, Rules and Updates were still returned.");

  console.log("\n=== TEST 6: Redirects ===");

  resetSite();

  pages.set(`${ORIGIN}/rules`, {
    redirectedTo: "https://secure.devpost.com/users/login",
    html: page("Log in", "<p>Please log in.</p>"),
  });

  const loginRedirect = await prepare();

  assert(
    !(loginRedirect.sourceContent ?? []).some((entry) =>
      entry.content.includes("Please log in."),
    ),
    "A login page was reported as a retrieved page.",
  );

  assert(
    !(loginRedirect.sourceContent ?? []).some((entry) =>
      entry.url.includes("secure.devpost.com"),
    ),
    "A page from another host was returned.",
  );

  console.log("✓ A redirect to another host (login) was not returned.");

  // Each case isolates one rule, so it cannot be hidden by another one.
  resetSite();

  pages.set(`${ORIGIN}/resources`, {
    redirectedTo: "https://example.com/resources",
    html: page("Elsewhere", "<p>MARKER-OTHER-HOST</p>"),
  });

  pages.set(`${ORIGIN}/details/faqs`, {
    redirectedTo: "http://hack.devpost.com/details/faqs",
    html: page("Downgraded", "<p>MARKER-HTTP-DOWNGRADE</p>"),
  });

  pages.set(`${ORIGIN}/details/dates`, {
    redirectedTo: `${ORIGIN}/users/login`,
    html: page("Sign in", "<p>MARKER-SAME-HOST-LOGIN</p>"),
  });

  const rejected = await prepare();
  const rejectedContent = (rejected.sourceContent ?? [])
    .map((entry) => `${entry.url} ${entry.content}`)
    .join("\n");

  for (const marker of [
    "MARKER-OTHER-HOST",
    "MARKER-HTTP-DOWNGRADE",
    "MARKER-SAME-HOST-LOGIN",
  ]) {
    assert(
      !rejectedContent.includes(marker),
      `A redirected page was reported as retrieved (${marker}).`,
    );
  }

  console.log("✓ Redirects to another host, to http, or to a login path on");
  console.log("  the same host were each rejected.");

  resetSite();

  pages.set(`${ORIGIN}/details/dates`, {
    redirectedTo: `${ORIGIN}/details/schedule`,
    html: page("Schedule", "<p>Schedule text.</p>"),
  });

  pages.set(`${ORIGIN}/details/faqs`, {
    redirectedTo: `${ORIGIN}/rules`,
    html: page("Rules", "<p>Official rules text.</p>"),
  });

  const sameHost = await prepare();
  const urls = (sameHost.sourceContent ?? []).map((entry) => entry.url);

  assert(
    urls.includes(`${ORIGIN}/details/schedule`) &&
      !urls.includes(`${ORIGIN}/details/dates`),
    "A same-host redirect should be reported under its final URL.",
  );

  assert(
    urls.filter((url) => url === `${ORIGIN}/rules`).length === 1,
    "A redirect to an already retrieved page must not duplicate it.",
  );

  console.log("✓ A same-host redirect is reported under its final URL.");
  console.log("✓ A redirect to an already retrieved page is not duplicated.");

  console.log("\n=== TEST 7: Page limit counts failures ===");

  const manyLinks = Array.from(
    { length: 40 },
    (_, index) => `<a href="/rules/${index + 1}">Rules ${index + 1}</a>`,
  ).join("");

  resetSite();

  pages.set(`${ORIGIN}/`, {
    html: page("Example Hackathon", "<p>Overview text.</p>", manyLinks),
  });

  for (let index = 1; index <= 40; index += 1) {
    pages.set(`${ORIGIN}/rules/${index}`, {
      html: page(`Rules ${index}`, `<p>Rules page ${index}.</p>`),
    });
  }

  const limited = await prepare();

  assert(
    requested.length === EXPECTED_PAGE_LIMIT,
    `Expected ${EXPECTED_PAGE_LIMIT} requests, made ${requested.length}.`,
  );

  assert(
    (limited.sourceContent ?? []).length === EXPECTED_PAGE_LIMIT,
    "Expected the overview plus 11 linked pages.",
  );

  console.log(`✓ 40 relevant links produced ${requested.length} requests.`);

  for (let index = 1; index <= 40; index += 1) {
    pages.set(`${ORIGIN}/rules/${index}`, { status: 500 });
  }

  requested.length = 0;

  const failing = await prepare();

  assert(
    requested.length === EXPECTED_PAGE_LIMIT,
    `Failures must count toward the limit; made ${requested.length} requests.`,
  );

  assert(
    (failing.sourceContent ?? []).length === 1,
    "Only the overview should remain when every linked page fails.",
  );

  console.log("✓ When every linked page failed, requests stayed at the limit.");

  console.log("\n=== TEST 8: Overview failure ===");

  resetSite();

  pages.set(`${ORIGIN}/`, { status: 500 });

  let overviewError: unknown;

  try {
    await prepare();
  } catch (error) {
    overviewError = error;
  }

  assert(
    overviewError instanceof Error &&
      overviewError.message === "Devpost preparation request failed with 500.",
    "An overview failure should reject with the existing error message.",
  );

  console.log("✓ An overview failure still rejects with the existing error.");

  console.log("\n✓ DEVPOST MULTI-PAGE PREPARATION TEST PASSED.");
}

main()
  .catch((error) => {
    console.error("Devpost multi-page preparation test failed:", error);

    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = realFetch;
  });
