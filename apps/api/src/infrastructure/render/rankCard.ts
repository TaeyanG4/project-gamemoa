import satori, { init as initSatoriYoga } from "satori";
import { Resvg, initWasm as initResvgWasm } from "@resvg/resvg-wasm";
// Dynamically imported (not top-level) so merely importing this module — e.g. transitively via
// apps/api/src/index.ts, which many test files import just to get Hono's `app` for in-process
// request testing — never triggers resolving the .wasm/.ttf binary assets. Plain Node/tsx (used
// by `pnpm test`) has no loader for those extensions; only Wrangler's bundler does. Cloudflare's
// bundler handles a literal dynamic `import("*.wasm"/"*.ttf")` identically to a static one for
// chunking purposes, so this doesn't change how it behaves once actually deployed.
const loadYogaWasm = () => import("satori/yoga.wasm").then((m) => m.default);
const loadResvgWasm = () => import("@resvg/resvg-wasm/index_bg.wasm").then((m) => m.default);
const loadNotoSansKRFont = () =>
  import("../../assets/fonts/NotoSansKR-Bold-subset.ttf").then((m) => m.default);

// OwOGG brand palette — kept in sync with the ASCII progress bar / embed colors already used in
// interactionHandlers.ts (COLOR_BRAND/COLOR_XP) so the rendered card and the surrounding Discord
// embed read as one consistent design rather than two different color systems.
const COLOR_BRAND = "#6366f1";
const COLOR_XP = "#f59e0b";
const COLOR_BG_FROM = "#0f172a";
const COLOR_BG_TO = "#1e1b4b";

export interface RankCardProps {
  nickname: string;
  level: number;
  totalXp: number;
  progressPercent: number;
  /** Guild name (server rank card) or a generic label (global profile card). */
  subtitle: string;
  /** Omitted entirely (no rank badge rendered) when there's nothing meaningful to show yet. */
  rank?: number | undefined;
}

// The WASM modules + font only need loading/initializing once per Worker isolate — every
// request after the first reuses them. A module-level promise (not a boolean flag) so concurrent
// requests hitting a cold isolate all await the same in-flight init instead of racing to
// initialize twice.
let initPromise: Promise<ArrayBuffer> | null = null;
function ensureInit(): Promise<ArrayBuffer> {
  initPromise ??= (async () => {
    const [yogaWasm, resvgWasm, fontData] = await Promise.all([
      loadYogaWasm(),
      loadResvgWasm(),
      loadNotoSansKRFont(),
    ]);
    await initSatoriYoga(yogaWasm);
    await initResvgWasm(resvgWasm);
    return fontData;
  })();
  return initPromise;
}

function initials(nickname: string): string {
  return nickname.slice(0, 2).toUpperCase();
}

// satori accepts a plain React-element-shaped object tree — no React/JSX toolchain needed, which
// keeps this Hono-only Worker free of a JSX build step for the sake of one rendering feature.
function rankCardTree(props: RankCardProps) {
  const { nickname, level, totalXp, progressPercent, subtitle, rank } = props;

  return {
    type: "div",
    props: {
      style: {
        width: "600px",
        height: "315px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "36px",
        background: `linear-gradient(135deg, ${COLOR_BG_FROM} 0%, ${COLOR_BG_TO} 100%)`,
        fontFamily: "Noto Sans KR",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "20px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "84px",
                    height: "84px",
                    borderRadius: "42px",
                    background: COLOR_BRAND,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#ffffff",
                    border: "3px solid rgba(255,255,255,0.25)",
                  },
                  children: initials(nickname),
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: "6px" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { fontSize: "34px", fontWeight: 700, color: "#ffffff" },
                        children: nickname,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { fontSize: "18px", color: "#94a3b8" },
                        children: subtitle,
                      },
                    },
                  ],
                },
              },
              ...(rank !== undefined
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          marginLeft: "auto",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: { fontSize: "16px", color: "#94a3b8", fontWeight: 700 },
                              children: "RANK",
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: { fontSize: "48px", fontWeight: 700, color: COLOR_XP },
                              children: `#${rank}`,
                            },
                          },
                        ],
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "10px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "16px",
                    color: "#cbd5e1",
                    fontWeight: 700,
                  },
                  children: [
                    { type: "span", props: { children: `LEVEL ${level}` } },
                    { type: "span", props: { children: `${totalXp.toLocaleString()} XP` } },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    width: "100%",
                    height: "18px",
                    borderRadius: "9px",
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                          height: "100%",
                          borderRadius: "9px",
                          background: `linear-gradient(90deg, ${COLOR_BRAND} 0%, ${COLOR_XP} 100%)`,
                        },
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: "2px",
                  },
                  children: "OWOGG.COM",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export async function renderRankCardPng(props: RankCardProps): Promise<Uint8Array> {
  const fontData = await ensureInit();

  const svg = await satori(
    // satori's types want a real ReactNode; the plain-object tree above is structurally
    // compatible (satori documents this "vanilla" usage) but needs a cast at the boundary.
    rankCardTree(props) as unknown as Parameters<typeof satori>[0],
    {
      width: 600,
      height: 315,
      fonts: [{ name: "Noto Sans KR", data: fontData, weight: 700, style: "normal" }],
    },
  );

  const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
  return resvg.render().asPng();
}
