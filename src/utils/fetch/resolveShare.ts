import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxyAgent = process.env.API_PROXY
  ? new HttpsProxyAgent(process.env.API_PROXY)
  : undefined;

// Threads only sends the 302 to the canonical post URL for non-browser
// user agents, so don't send a browser UA here.
async function resolveShare(share: string) {
  const res = await fetch(`https://www.threads.com/share/${share}/`, {
    redirect: "manual",
    agent: proxyAgent,
  });
  const location = res.headers.get("location");
  if (!location) return null;
  const match = location.match(
    /threads\.(?:com|net)\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/
  );
  if (!match) return null;
  return { username: match[1], post: match[2] };
}

export default resolveShare;
