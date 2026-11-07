import type { CSSProperties } from "react";

type IconName = "book" | "sliders" | "plus" | "arrow" | "back" | "upload" | "volume" | "stop" | "check" | "focus" | "courses" | "file" | "slides" | "recording" | "sparkles" | "search" | "external" | "download" | "close" | "user" | "sun" | "moon";
const paths: Record<IconName, string> = {
  book: "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z",
  sliders: "M4 7h5m4 0h7M4 17h9m4 0h3M9 4v6m4 4v6",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  volume: "m11 5-6 5H2v4h3l6 5V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  stop: "M6 6h12v12H6Z",
  check: "m5 12 4 4L19 6",
  focus: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8",
  courses: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  file: "M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h6",
  slides: "M3 3h18v13H3V3Zm9 13v5m-4 0h8M7 7h10m-10 4h6",
  recording: "M3 5h12v14H3V5Zm12 5 6-4v12l-6-4v-4Z",
  sparkles: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-1v4m-2-2h4",
  search: "M21 21l-5-5m2-6a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  close: "m6 6 12 12M6 18 18 6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  sun: "M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0",
  moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",
};

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}><path d={paths[name]} /></svg>;
}
