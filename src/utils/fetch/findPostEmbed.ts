/* Fallback post source: the official embed iframe page (threads.com/t/<code>/embed/), which is
   server-rendered HTML served to logged-out viewers. The result mimics the GraphQL response
   so findPost maps both sources the same way. */

const proxy = process.env.API_PROXY;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"' };
// HTMLRewriter hands back text and attribute values with entities still encoded
const decode = (s: string) =>
  s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (m, hex, dec, name) =>
    hex
      ? String.fromCodePoint(parseInt(hex, 16))
      : dec
        ? String.fromCodePoint(Number(dec))
        : (ENTITIES[name] ?? m)
  );

// Counts are abbreviated on the embed ("676", "2.5K", "1.2M")
function parseCount(s: string) {
  const m = s.replace(/,/g, "").match(/^([\d.]+)([KM]?)$/);
  if (!m) return 0;
  return Math.round(Number(m[1]) * (m[2] == "K" ? 1e3 : m[2] == "M" ? 1e6 : 1));
}

// Timestamps are Pacific wall-clock time: "10:14 PM · Nov 11, 2026"
function parseTimestamp(s: string) {
  const m = s.match(/^(\d+:\d+ [AP]M) · (.+)$/);
  if (!m) return undefined;
  const asUtc = Date.parse(`${m[2]} ${m[1]} UTC`);
  if (isNaN(asUtc)) return undefined;
  const pacific = Date.parse(
    new Date(asUtc).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) + " UTC"
  );
  return (2 * asUtc - pacific) / 1000;
}

interface EmbedPost {
  isTarget: boolean;
  username: string;
  avatar: string;
  verified: boolean;
  edited: boolean;
  text: string;
  timestamp: string;
  counts: string[]; // likes, replies, reposts, shares; "" when the icon has no count
  media: MediaItem[];
  link: { url: string; image_url?: string } | null;
  quoted: EmbedPost | null;
}

const newPost = (isTarget: boolean): EmbedPost => ({
  isTarget,
  username: "",
  avatar: "",
  verified: false,
  edited: false,
  text: "",
  timestamp: "",
  counts: [],
  media: [],
  link: null,
  quoted: null,
});

function toGraphQLPost(p: EmbedPost, code?: string): any {
  const mediaNode = (m?: MediaItem) => ({
    video_versions: m?.kind == "video" ? [{ url: m.url }] : null,
    image_versions2: { candidates: m?.kind == "image" ? [{ url: m.url }] : [] },
  });
  const counts = p.counts.map(parseCount);
  return {
    code,
    user: { username: p.username, profile_pic_url: p.avatar, is_verified: p.verified },
    caption: p.text ? { text: decode(p.text) } : null,
    caption_is_edited: p.edited,
    like_count: counts[0] ?? 0,
    taken_at: parseTimestamp(decode(p.timestamp)),
    carousel_media: p.media.length > 1 ? p.media.map(mediaNode) : null,
    ...mediaNode(p.media.length == 1 ? p.media[0] : undefined),
    text_post_app_info: {
      direct_reply_count: counts[1] ?? 0,
      link_preview_attachment: p.link,
      share_info: { quoted_post: p.quoted ? toGraphQLPost(p.quoted) : null },
    },
  };
}

async function findPostEmbed(post: string) {
  const res = await fetch(`https://www.threads.com/t/${post}/embed/`, {
    headers: {
      // Without both Sec-Fetch headers Threads serves the logged-out app shell instead of the embed
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    proxy,
  });

  // The embed lists the replied-to post (if any) and then the post itself; a quoted post nests inside
  const posts: EmbedPost[] = [];
  let cur: EmbedPost | undefined;
  const rewriter = new HTMLRewriter()
    .on("div.OuterContainer", {
      element(el) {
        const classes = el.getAttribute("class") ?? "";
        if (classes.includes("OuterContainerQuotePost") && cur) {
          cur = cur.quoted = newPost(false);
        } else {
          cur = newPost(classes.includes("OuterContainerFull"));
          posts.push(cur);
        }
      },
    })
    .on("div.QuotePostContainer", {
      element(el) {
        el.onEndTag(() => {
          cur = posts[posts.length - 1];
        });
      },
    })
    .on("div.AvatarContainer img", {
      element(el) {
        if (!cur) return;
        cur.username = decode(el.getAttribute("alt") ?? "");
        cur.avatar = decode(el.getAttribute("src") ?? "");
      },
    })
    .on("div.VerifiedBadge", { element: () => void (cur && (cur.verified = true)) })
    .on("span.EditIcon", { element: () => void (cur && (cur.edited = true)) })
    .on("span.BodyTextContainer", { text: (t) => void (cur && (cur.text += t.text)) })
    .on("span.Timestamp", { text: (t) => void (cur && (cur.timestamp += t.text)) })
    .on("span.ActionBarIcon", { element: () => void cur?.counts.push("") })
    .on("span.ActionBarCount", {
      text(t) {
        if (cur?.counts.length) cur.counts[cur.counts.length - 1] += t.text;
      },
    })
    .on("div.SoloMediaContainer img, div.MediaScrollContainer img", {
      element(el) {
        const src = el.getAttribute("src");
        if (cur && src) cur.media.push({ url: decode(src), kind: "image" });
      },
    })
    .on("div.SoloMediaContainer source, div.MediaScrollContainer source", {
      element(el) {
        const src = el.getAttribute("src");
        if (cur && src) cur.media.push({ url: decode(src), kind: "video" });
      },
    })
    .on("div.LinkAttachmentOuterContainer > a", {
      element(el) {
        if (!cur) return;
        const href = decode(el.getAttribute("href") ?? "");
        // External links go through an l.facebook.com/l.php?u=<target> redirect
        cur.link = { url: new URL(href).searchParams.get("u") ?? href };
      },
    })
    .on("div.LinkAttachmentImage", {
      element(el) {
        const image = el.getAttribute("style")?.match(/url\(([^)]+)\)/)?.[1];
        if (cur?.link && image) cur.link.image_url = decode(image);
      },
    });
  const html = await res.text();
  await rewriter.transform(new Response(html)).text();

  const target = posts.findIndex((p) => p.isTarget);
  if (target == -1) return null; // "Thread not available" page or the app shell

  // A quoted post's text is not in the static HTML: a script mounts it from a JSON string
  const quoted = posts[target].quoted;
  const quotedMarkup = html.match(
    /"__html":("\\u003Cspan class=\\"BodyTextContainer\\">(?:[^"\\]|\\.)*")/
  )?.[1];
  if (quoted && !quoted.text && quotedMarkup) {
    quoted.text = JSON.parse(quotedMarkup).replace(/<[^>]+>/g, "");
  }
  const thread_items = posts
    .slice(0, target + 1)
    .map((p, i) => ({ post: toGraphQLPost(p, i == target ? post : undefined) }));
  return { data: { data: { edges: [{ node: { thread_items } }] } } };
}

export default findPostEmbed;
