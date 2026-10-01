/* Discord Components V2 "component embed" (link preview) for posts and profiles.
   Spec: a single Container declared via <script id="discord:component-embed" type="application/json">.
   Only link buttons, sections, text displays, thumbnails, galleries and separators are allowed.
   Discord refuses inline payloads over ~3,000 bytes ("Unable to read component embed data"), so media
   point at short /m/<post>/<slot> redirects (see mediaSlots) and the caption fills what is left. */

const THREADS = "https://www.threads.com";
const ACCENT_COLOR = 0x000000; // Threads black
const MAX_BYTES = 3000; // Discord's cap on the serialized component-embed JSON
const VERIFIED = " ✓";
const URL_RE = /https?:\/\/[^\s<>()]+/g;

type Component = Record<string, unknown>;
type TextDisplay = { type: 10; content: string };

function escapeMarkdown(s: string) {
  return s
    .replace(/([\\*_~`|>#[\]])/g, "\\$1")
    .replace(/^(\s*)-/gm, "$1\\-");
}

/** Escape markdown outside URLs, then link @mentions and #hashtags to Threads. */
function richText(s: string) {
  const urls = s.match(URL_RE) || [];
  return s
    .split(URL_RE)
    .map((plain, i) => {
      const segment = escapeMarkdown(plain)
        .replace(
          /(^|[^\w/])@([\w.]+\w)/g,
          (_, pre, user) => `${pre}[@${user}](${THREADS}/@${user})`
        )
        .replace(
          /(^|\s)\\#(\w+)/g,
          (_, pre, tag) =>
            `${pre}[#${tag}](${THREADS}/search?q=${encodeURIComponent(tag)}&serp_type=tags)`
        );
      return i < urls.length ? segment + urls[i] : segment;
    })
    .join("");
}

const quote = (s: string) =>
  s
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
const cut = (s: string, max: number) =>
  s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
const num = (n: number) => n.toLocaleString("en-US");
const who = (username: string, verified: boolean | undefined, href: string) =>
  `**[@${username}](${href})**${verified ? VERIFIED : ""}`;

const text = (content: string): TextDisplay => ({ type: 10, content });
const separator = (divider: boolean, spacing: 1 | 2) => ({
  type: 14,
  divider,
  spacing,
});
const linkButton = (label: string, url: string) => ({
  type: 2,
  style: 5,
  label,
  url,
});

/** Section with an avatar thumbnail, or the bare text displays if there is no avatar. */
function section(texts: TextDisplay[], avatar?: string, alt?: string) {
  if (!avatar) return texts;
  return [
    {
      type: 9,
      components: texts,
      accessory: { type: 11, media: { url: avatar }, description: alt },
    },
  ];
}

/** Real URL of every media slot in a post's embed: a/qa = avatars, 0-9/q0-q9 = gallery items. */
export function mediaSlots(content: ContentProps, proxy?: string) {
  const urls: Record<string, string> = {};
  const add = (prefix: string, media?: MediaItem[]) =>
    media?.slice(0, 10).forEach((item, i) => {
      urls[`${prefix}${i}`] =
        item.kind == "video" && proxy
          ? `https://${proxy}/${encodeURIComponent(item.url)}`
          : item.url;
    });
  if (content.avatar) urls.a = content.avatar;
  add("", content.media);
  const quoted = content.quotedPost;
  if (quoted?.quoted && !quoted.unavailable) {
    if (quoted.avatar) urls.qa = quoted.avatar;
    add("q", quoted.media);
  }
  return urls;
}

type SlotUrl = (slot: string, kind?: MediaItem["kind"]) => string;

function gallery(media: MediaItem[], src: SlotUrl, prefix = "") {
  return {
    type: 12,
    items: media
      .slice(0, 10)
      .map((item, i) => ({ media: { url: src(`${prefix}${i}`, item.kind) } })),
  };
}

const serialize = (payload: unknown) =>
  JSON.stringify(payload).replace(/</g, "\\u003c");
const bytes = (s: string) => Buffer.byteLength(s, "utf8");

/* Reply/quote limits, tried in order until the main caption gets at least MIN_CAPTION characters. */
type Level = { reply: number; quote: number; quotedMedia: number };
const LEVELS: Level[] = [
  { reply: 150, quote: 300, quotedMedia: 10 },
  { reply: 100, quote: 150, quotedMedia: 4 },
  { reply: 50, quote: 80, quotedMedia: 1 },
];
const MIN_CAPTION = 280;

function buildPost(content: ContentProps, src: SlotUrl, level: Level) {
  const postUrl = `${THREADS}/@${content.username}/post/${content.post}`;
  const profileUrl = `${THREADS}/@${content.username}`;

  const headerTexts = [
    text(
      `### [@${content.username}](${profileUrl})${content.verified ? VERIFIED : ""}`
    ),
  ];
  if (content.replyTo) {
    const parentUrl = `${THREADS}/@${content.replyTo.username}/post/${content.replyTo.code}`;
    headerTexts.push(
      text(
        `-# ↩️ Replying to ${who(content.replyTo.username, content.replyTo.verified, parentUrl)}\n` +
          quote(cut(richText(content.replyTo.caption), level.reply))
      )
    );
  }
  const caption = text(""); // filled once the remaining text budget is known
  headerTexts.push(caption);

  const children: Component[] = section(
    headerTexts,
    content.avatar && src("a"),
    `@${content.username}`
  );

  if (content.media && content.media.length > 0) {
    children.push(separator(false, 2), gallery(content.media, src));
  }

  const quoted = content.quotedPost;
  if (quoted?.unavailable) {
    children.push(separator(true, 2), text("-# ↪️ Quoted post is unavailable"));
  } else if (quoted?.quoted) {
    const quotedUrl = `${THREADS}/@${quoted.username}/post/${quoted.code}`;
    const stats = `\n-# ❤️ ${num(quoted.likeCount ?? 0)} · 💬 ${num(quoted.replyCount ?? 0)}`;
    children.push(
      separator(true, 2),
      ...section(
        [
          text(
            `-# ↪️ Quoting\n${who(quoted.username, quoted.verified, quotedUrl)}` +
              (quoted.takenAt ? ` · <t:${quoted.takenAt}:d>` : "")
          ),
          text(quote(cut(richText(quoted.caption), level.quote) + stats)),
        ],
        quoted.avatar && src("qa"),
        `@${quoted.username}`
      )
    );
    if (quoted.media && quoted.media.length > 0) {
      children.push(
        separator(false, 1),
        gallery(quoted.media.slice(0, level.quotedMedia), src, "q")
      );
    }
  }

  const footer = [
    `❤️ **${num(content.likeCount ?? 0)}**`,
    `💬 **${num(content.replyCount ?? 0)}**`,
  ];
  if (content.takenAt) footer.push(`<t:${content.takenAt}:f>`);
  if (content.edited) footer.push("✏️ Edited");
  if (content.paidPartnership) footer.push("💼 Paid partnership");
  children.push(
    separator(true, 2),
    text(footer.join(" · ")),
    separator(false, 1),
    {
      type: 1,
      components: [
        linkButton("Open on Threads", postUrl),
        linkButton(`@${content.username}`, profileUrl),
      ],
    }
  );

  const container = { type: 17, accent_color: ACCENT_COLOR, components: children };
  const full = richText(content.caption ?? "");
  const fits = (n: number) => {
    caption.content = cut(full, n) || "-# (no text)";
    return bytes(serialize({ component: container })) <= MAX_BYTES;
  };
  // longest caption (in characters) whose serialized payload stays under MAX_BYTES
  let lo = 0;
  let hi = full.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  const fitted = fits(lo);
  return { container, roomy: fitted && lo >= Math.min(full.length, MIN_CAPTION) };
}

function buildProfile(content: ContentProps) {
  const profileUrl = `${THREADS}/@${content.username}`;
  const name = escapeMarkdown(content.fullName || content.username);
  const texts = [
    text(
      `## ${name}${content.verified ? VERIFIED : ""}\n-# [@${content.username}](${profileUrl}) · Threads`
    ),
  ];
  if (content.description) texts.push(text(richText(content.description)));

  const children: Component[] = section(
    texts,
    content.avatar,
    `@${content.username}`
  );
  children.push(
    separator(true, 2),
    text(
      `👤 **${num(content.followerCount ?? 0)}** followers` +
        (content.bioLink ? ` · 🔗 ${escapeMarkdown(content.bioLink)}` : "")
    ),
    separator(false, 1),
    { type: 1, components: [linkButton("View profile", profileUrl)] }
  );
  return { type: 17, accent_color: ACCENT_COLOR, components: children };
}

/** Returns the serialized `discord:component-embed` payload, or null when the type is not
    supported or the payload cannot fit in MAX_BYTES (the page then falls back to OG tags). */
export default function renderComponentEmbed(
  { type, content }: DataProps,
  origin?: string
) {
  let component;
  if (type == "post" && content.post && origin) {
    const src: SlotUrl = (slot, kind = "image") =>
      `${origin}/m/${content.post}/${slot}.${kind == "video" ? "mp4" : "jpg"}`;
    for (const level of LEVELS) {
      const built = buildPost(content, src, level);
      component = built.container;
      if (built.roomy) break;
    }
  } else if (type == "user") {
    component = buildProfile(content);
  } else {
    return null;
  }
  const json = serialize({ component });
  return bytes(json) <= MAX_BYTES ? json : null;
}
