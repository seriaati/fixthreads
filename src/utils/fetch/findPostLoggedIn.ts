/* Post source for login-gated posts: the post page as a logged-in browser gets it. Its preloaded
   JSON holds the post in the same shape as the GraphQL response's thread items. */

// The `sessionid` cookie of a browser session logged in to threads.com
const sessionId = process.env.THREADS_SESSION_ID;

function findByCode(node: any, code: string): any {
  if (!node || typeof node != "object") return null;
  if (node.code == code && node.user) return node;
  for (const value of Object.values(node)) {
    const hit = findByCode(value, code);
    if (hit) return hit;
  }
  return null;
}

async function findPostLoggedIn(post: string) {
  if (!sessionId) return null;
  // No proxy: the session should keep coming from the server's own IP
  const res = await fetch(`https://www.threads.com/t/${post}`, {
    headers: {
      // Without Accept and the Sec-Fetch headers the page comes back without the preloaded post
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Cookie: `sessionid=${sessionId}`,
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  for (const [, json] of html.matchAll(
    /<script type="application\/json"[^>]*data-sjs>([\s\S]*?)<\/script>/g
  )) {
    if (!json.includes(`"code":"${post}"`)) continue;
    const media = findByCode(JSON.parse(json), post);
    if (!media) continue;
    // The page preloads only the post itself; of the replied-to post it has just the author
    const parent = media.text_post_app_info?.reply_to_author;
    const thread_items = [
      ...(parent ? [{ post: { user: parent, caption: null } }] : []),
      { post: media },
    ];
    return { data: { data: { edges: [{ node: { thread_items } }] } } };
  }
  return null;
}

export default findPostLoggedIn;
