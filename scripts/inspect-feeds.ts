import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["media:content", "mediaContent", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

async function inspect(name: string, url: string) {
  const feed = await parser.parseURL(url);
  const items = (feed.items ?? []).slice(0, 4);
  console.log(`\n=== ${name} (${(feed.items ?? []).length} items)`);
  for (const it of items) {
    const enc = (it as { enclosure?: { url?: string; type?: string } }).enclosure;
    const mt = (it as { mediaThumbnail?: unknown }).mediaThumbnail;
    const mc = (it as { mediaContent?: unknown }).mediaContent;
    const ce = (it as { contentEncoded?: string }).contentEncoded;
    const content = it.content || "";
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    console.log({
      title: (it.title || "").slice(0, 55),
      enclosure: enc?.url?.slice(0, 80),
      mediaThumbnail: JSON.stringify(mt)?.slice(0, 120),
      mediaContent: JSON.stringify(mc)?.slice(0, 160),
      contentImg: imgMatch?.[1]?.slice(0, 80),
      contentEncodedImg: ce?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]?.slice(0, 80),
    });
  }
}

async function main() {
  await inspect("TechCrunch", "https://techcrunch.com/feed/");
  await inspect("Verge", "https://www.theverge.com/rss/index.xml");
  await inspect("Ars", "https://arstechnica.com/feed/");
  await inspect("GoogleNews", "https://news.google.com/rss/search?q=ai&hl=en-US&gl=US&ceid=US:en");
  await inspect("BBC", "https://feeds.bbci.co.uk/news/world/rss.xml");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
