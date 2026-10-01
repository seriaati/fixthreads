/* Short media URLs for the component embed: /m/<post>/<slot>.<ext> redirects to the real
   (Instagram or PROXIES) URL, keeping the embed JSON under Discord's size cap. */
import express from "express";
import { postMedia } from "../utils/mediaStore";
const router = express.Router();

router.get("/m/:post/:file", async (req, res) => {
  const { post, file } = req.params;
  try {
    const url = (await postMedia(post))?.[file.split(".")[0]];
    if (!url) return res.sendStatus(404);
    return res.redirect(url);
  } catch (e: any) {
    console.error(`[ERROR] media post=${post} file=${file}`, e?.message ?? e);
    return res.sendStatus(502);
  }
});

export default router;
