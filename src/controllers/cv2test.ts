/* TEMPORARY: component-embed variants of one real video-gallery post, to find why Discord
   reports "Unable to read component embed data: Internal error". Remove once done. */
import express from "express";
import findPost from "../utils/fetch/findPost";
import renderComponentEmbed from "../utils/renderComponentEmbed";
const router = express.Router();

const POST = "C87OuCipGOY";
const HOST = "https://fixthreads.seria.moe";

type Node = Record<string, any>;

let cached: { data: Node; at: number } | undefined;
async function load() {
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.data;
  const data = await findPost({ post: POST, userAgent: "cv2test" });
  if (!data) return undefined;
  cached = { data, at: Date.now() };
  return data;
}

const media = (data: Node): MediaItem[] => data.media ?? [];
const withMedia = (data: Node, items: MediaItem[]) => ({ ...data, media: items });

const variants: Record<string, (data: Node) => Node> = {
  full: (d) => d,
  none: (d) => withMedia(d, []),
  one: (d) => withMedia(d, media(d).slice(0, 1)),
  three: (d) => withMedia(d, media(d).slice(0, 3)),
  stills: (d) =>
    withMedia(d, media(d).map((m) => ({ url: m.poster ?? m.url, kind: "image" }))),
  redirect: (d) =>
    withMedia(d, media(d).map((m, i) => ({ ...m, url: `${HOST}/cv2-test/m/${i}.mp4` }))),
};

router.get("/cv2-test/m/:file", async (req, res) => {
  const data = await load();
  const item = data && media(data)[parseInt(req.params.file)];
  if (!item) return res.sendStatus(404);
  return res.redirect(item.url);
});

router.get("/cv2-test/:variant", async (req, res) => {
  const variant = variants[req.params.variant] as ((d: Node) => Node) | undefined;
  const data = variant && (await load());
  if (!data) return res.sendStatus(404);
  const payload = renderComponentEmbed({ type: "post", content: variant(data) as ContentProps });
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return res.send(`<!DOCTYPE html><html><head>
<meta property="og:title" content="cv2-test ${req.params.variant}">
<meta property="og:description" content="fallback">
<script id="discord:component-embed" type="application/json">${json}</script>
</head><body></body></html>`);
});

export default router;
