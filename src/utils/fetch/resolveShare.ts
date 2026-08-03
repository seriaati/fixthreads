import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxyAgent = process.env.API_PROXY
  ? new HttpsProxyAgent(process.env.API_PROXY)
  : undefined;

const MAX_HOPS = 5;
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

// Matches both post URL forms: threads.com/@user/post/CODE and threads.com/t/CODE
const POST_URL_REGEX =
  /threads\.(?:com|net)\/(?:@([\w.]+)\/post|t)\/([A-Za-z0-9_-]+)/;

function matchPostUrl(text: string) {
  // JSON-embedded URLs escape slashes (threads.com\/@user\/post\/CODE)
  const match = text.replace(/\\\//g, "/").match(POST_URL_REGEX);
  if (!match) return null;
  return { username: match[1] as string | undefined, post: match[2] };
}

async function resolveShare(share: string) {
  const shareUrl = `https://www.threads.com/share/${share}/`;

  // Threads sends a 302 to the canonical post URL for non-browser user
  // agents, so walk the redirect chain without a browser UA first. The chain
  // may include intermediate hops (canonicalization, .net -> .com) and
  // relative Location headers, so resolve and follow each hop.
  let url = shareUrl;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      agent: proxyAgent,
    });
    const location = res.headers.get("location");
    if (!location) {
      console.log(
        `[SHARE] share=${share} hop=${hop} status=${res.status} no location header`
      );
      break;
    }
    const next = new URL(location, url).toString();
    const found = matchPostUrl(next);
    if (found) return found;
    if (next === url) break;
    url = next;
  }

  // Fallback: Threads didn't 302 us to the post URL directly. Fetch as a
  // browser, following redirects, and look for the post URL in the final
  // URL or in the page HTML (og:url / canonical / embedded JSON).
  try {
    const res = await fetch(shareUrl, {
      redirect: "follow",
      follow: MAX_HOPS,
      agent: proxyAgent,
      headers: { "User-Agent": BROWSER_UA },
    });
    const fromFinalUrl = matchPostUrl(res.url);
    if (fromFinalUrl) return fromFinalUrl;
    const fromBody = matchPostUrl(await res.text());
    if (fromBody) return fromBody;
    console.log(
      `[SHARE] share=${share} fallback failed status=${res.status} finalUrl=${res.url}`
    );
  } catch (e: any) {
    console.log(`[SHARE] share=${share} fallback error`, e?.message ?? e);
  }

  return null;
}

export default resolveShare;
