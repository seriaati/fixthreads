import express from "express";
import findPost from "../utils/fetch/findPost";
import resolveShare from "../utils/fetch/resolveShare";
import renderSeo from "../utils/renderSeo";
const router = express.Router();

function threadsPostUrl(username: string | undefined, post: string) {
  if (username) return `https://www.threads.com/@${username}/post/${post}`;
  return `https://www.threads.com/t/${post}`;
}

router.get("/t/:post", async (req, res, _next) => {
  const { post } = req.params;
  try {
    const data = await findPost({
      post,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!data || !data.title) {
      console.log(`[NOT FOUND] post=${post}`);
      return res.redirect(threadsPostUrl(undefined, post));
    }
    return res.send(renderSeo({ type: "post", content: data }));
  } catch (e: any) {
    console.error(`[ERROR] post=${post}`, e?.message ?? e);
    return res.redirect(threadsPostUrl(undefined, post));
  }
});

router.get("/share/:share", async (req, res, _next) => {
  const { share } = req.params;
  try {
    const resolved = await resolveShare(share);
    if (!resolved) {
      console.log(`[NOT FOUND] share=${share}`);
      return res.redirect(`https://www.threads.com/share/${share}/`);
    }
    const data = await findPost({
      post: resolved.post,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!data || !data.title) {
      console.log(`[NOT FOUND] share=${share} post=${resolved.post}`);
      return res.redirect(threadsPostUrl(resolved.username, resolved.post));
    }
    return res.send(renderSeo({ type: "post", content: data }));
  } catch (e: any) {
    console.error(`[ERROR] share=${share}`, e?.message ?? e);
    return res.redirect(`https://www.threads.com/share/${share}/`);
  }
});

router.get("/:username/post/:post", async (req, res, _next) => {
  const { username, post } = req.params;
  try {
    const data = await findPost({
      post,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!data || !data.title) {
      console.log(`[NOT FOUND] username=${username} post=${post}`);
      return res.redirect(threadsPostUrl(username, post));
    }
    return res.send(renderSeo({ type: "post", content: data }));
  } catch (e: any) {
    console.error(`[ERROR] username=${username} post=${post}`, e?.message ?? e);
    return res.redirect(threadsPostUrl(username, post));
  }
});

export default router;
