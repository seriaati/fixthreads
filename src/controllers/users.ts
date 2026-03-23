import express from "express";
import findUser from "../utils/fetch/findUser";
import renderSeo from "../utils/renderSeo";
const router = express.Router();

router.get("/@:username", async (req, res, _next) => {
  const { username } = req.params;
  try {
    const user = await findUser({
      username,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!user || !user.title) {
      console.log(`[NOT FOUND] username=${username}`);
      return res.redirect(`https://www.threads.com/@${username}`);
    }
    return res.send(renderSeo({ type: "user", content: user }));
  } catch (e: any) {
    console.error(`[ERROR] username=${username}`, e?.message ?? e);
    return res.redirect(`https://www.threads.com/@${username}`);
  }
});

export default router;
