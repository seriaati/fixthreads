/* Discord Components V2 "component embed" (link preview) for posts and profiles.
   Spec: a single Container declared via <script id="discord:component-embed" type="application/json">.
   Only link buttons, sections, text displays, thumbnails, galleries and separators are allowed. */

const THREADS = "https://www.threads.com";
const ACCENT_COLOR = 0x000000; // Threads black
const TEXT_BUDGET = 4000; // Discord's total text cap per message
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

function gallery(media: MediaItem[], proxy?: string) {
  return {
    type: 12,
    items: media.slice(0, 10).map((item) => ({
      media: {
        url:
          item.kind == "video" && proxy
            ? `https://${proxy}/${encodeURIComponent(item.url)}`
            : item.url,
      },
    })),
  };
}

function textLength(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((n, x) => n + textLength(x), 0);
  if (node && typeof node == "object") {
    const obj = node as Component;
    const own = obj.type == 10 ? (obj.content as string).length : 0;
    return own + textLength(Object.values(obj));
  }
  return 0;
}

function buildPost(content: ContentProps, proxy?: string) {
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
          quote(cut(richText(content.replyTo.caption), 200))
      )
    );
  }
  const caption = text(""); // filled once the remaining text budget is known
  headerTexts.push(caption);

  const children: Component[] = section(
    headerTexts,
    content.avatar,
    `@${content.username}`
  );

  if (content.media && content.media.length > 0) {
    children.push(separator(false, 2), gallery(content.media, proxy));
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
          text(quote(cut(richText(quoted.caption), 600) + stats)),
        ],
        quoted.avatar,
        `@${quoted.username}`
      )
    );
    if (quoted.media && quoted.media.length > 0) {
      children.push(separator(false, 1), gallery(quoted.media, proxy));
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
  const budget = Math.max(TEXT_BUDGET - textLength(container) - 20, 200);
  caption.content =
    cut(richText(content.caption ?? ""), budget) || "-# (no text)";
  return container;
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

/** Returns the `discord:component-embed` payload, or null when the type is not supported. */
export default function renderComponentEmbed(
  { type, content }: DataProps,
  proxy?: string
) {
  if (type == "post" && content.post) {
    return { component: buildPost(content, proxy) };
  }
  if (type == "user") {
    return { component: buildProfile(content) };
  }
  return null;
}
