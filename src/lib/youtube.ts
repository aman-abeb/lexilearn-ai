export type YouTubeVideo = { videoId: string; url: string };
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIDEO_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

/** Parse known video URL forms without following redirects or accepting lookalike hosts. */
export function parseYouTubeUrl(value: string): YouTubeVideo | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})\/?$/)?.[1] ?? null;
    else if (VIDEO_HOSTS.has(url.hostname)) {
      if (/^\/watch\/?$/.test(url.pathname) && url.searchParams.getAll("v").length === 1) id = url.searchParams.get("v");
      else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})\/?$/)?.[1] ?? null;
    } else if (url.hostname === "www.youtube-nocookie.com" || url.hostname === "youtube-nocookie.com") {
      id = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})\/?$/)?.[1] ?? null;
    }
    return id && VIDEO_ID.test(id) ? { videoId: id, url: `https://www.youtube.com/watch?v=${id}` } : null;
  } catch { return null; }
}
