/* Real URLs behind the component embed's short /m/<post>/<slot> media links. */
import findPost from "./fetch/findPost";
import { mediaSlots } from "./renderComponentEmbed";

const TTL = 6 * 60 * 60 * 1000;
const MAX_POSTS = 500;
const proxies = process.env.PROXIES?.split(",") || [];
const store = new Map<string, { urls: Record<string, string>; at: number }>();

/** Media slot URLs of a post, from the cache or by fetching the post again. */
export async function postMedia(post: string, content?: ContentProps) {
  const hit = store.get(post);
  if (!content && hit && Date.now() - hit.at < TTL) return hit.urls;
  const data = content ?? (await findPost({ post, userAgent: "" }));
  if (!data) return undefined;
  const proxy = proxies[Math.floor(Math.random() * proxies.length)];
  const urls = mediaSlots(data, proxy);
  store.delete(post);
  store.set(post, { urls, at: Date.now() });
  if (store.size > MAX_POSTS) store.delete(store.keys().next().value!);
  return urls;
}
