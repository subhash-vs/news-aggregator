import Parser from "rss-parser";
import { DEFAULT_CONFIG } from "../src/lib/defaults";

const parser = new Parser();

async function main() {
  const targets: Array<{ page: string; name: string; url: string }> = [];
  for (const page of DEFAULT_CONFIG.pages) {
    for (const source of page.sources) {
      if (source.type !== "rss") continue;
      const url = source.config.feedUrl;
      if (!url) continue;
      // Focus on newly added / India feeds for verification speed
      const isNewish =
        page.id === "india" ||
        /cnbc|marketwatch|businessinsider|wired|technologyreview|engadget|livemint|business-standard|aljazeera|yahoo|ft\.com|fortune\.com|feeds\.bloomberg\.com|financial times|fortune|bloomberg/i.test(
          url + source.name
        );
      if (!isNewish) continue;
      targets.push({ page: page.id, name: source.name, url });
    }
  }

  let ok = 0;
  let fail = 0;
  for (const t of targets) {
    try {
      const feed = await parser.parseURL(t.url);
      const n = feed.items?.length ?? 0;
      if (n === 0) throw new Error("empty feed");
      ok += 1;
      console.log(`OK  [${t.page}] ${t.name} — ${n} items`);
    } catch (error) {
      fail += 1;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`FAIL [${t.page}] ${t.name} — ${msg}`);
    }
  }
  console.log(`\n${ok} ok, ${fail} failed, ${targets.length} checked`);
  if (fail > 0) process.exitCode = 1;
}

void main();
