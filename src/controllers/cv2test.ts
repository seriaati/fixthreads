/* TEMPORARY: /cv2-test/size-<N> serves a component embed padded to exactly N bytes of JSON,
   to confirm Discord's inline payload cap. Remove once done. */
import express from "express";
const router = express.Router();

function padded(n: number) {
  const make = (pad: number) => ({
    component: {
      type: 17,
      accent_color: 0,
      components: [
        { type: 10, content: `### cv2 size probe: ${n} bytes` },
        { type: 10, content: "x".repeat(pad) },
      ],
    },
  });
  const base = JSON.stringify(make(0)).length;
  return JSON.stringify(make(Math.max(n - base, 0)));
}

router.get("/cv2-test/size-:n", (req, res) => {
  const n = Math.min(parseInt(req.params.n) || 0, 8000);
  return res.send(`<!DOCTYPE html><html><head>
<meta property="og:title" content="cv2-test size-${n}">
<meta property="og:description" content="fallback">
<script id="discord:component-embed" type="application/json">${padded(n)}</script>
</head><body></body></html>`);
});

export default router;
