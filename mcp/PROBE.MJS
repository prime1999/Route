const urls = [
  "https://amazonappdev2026.devpost.com/",
  "https://amazonappdev2026.devpost.com/rules",
  "https://amazonappdev2026.devpost.com/resources",
];

for (const url of urls) {
  for (const label of ["plain", "with Accept header"]) {
    const init =
      label === "plain"
        ? {}
        : { headers: { Accept: "text/html,application/xhtml+xml" } };

    try {
      const r = await fetch(url, init);
      console.log(
        label,
        "|",
        url,
        "|",
        r.status,
        "|",
        r.headers.get("content-type"),
        "| final:",
        r.url,
      );
    } catch (e) {
      console.log(label, "|", url, "| ERROR", e.cause?.code ?? e.message);
    }
  }
}
