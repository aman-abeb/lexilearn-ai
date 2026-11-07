import type { CSSProperties } from "react";

type IconName = "book" | "sliders" | "plus" | "arrow" | "back" | "upload" | "volume" | "stop" | "check" | "focus";
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
};

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}><path d={paths[name]} /></svg>;
}
