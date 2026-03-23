import express from "express";
import findPost from "../utils/fetch/findPost";
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
