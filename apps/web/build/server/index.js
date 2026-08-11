import { jsx, jsxs } from "react/jsx-runtime";
import { ServerRouter, Link, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, useParams, useNavigate } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import { Gamepad2, Search, X, Menu, Clock, Play, ArrowRight, MonitorSmartphone, Timer, Trophy, AlertCircle, ArrowLeft } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
async function handleRequest(request, responseStatusCode, responseHeaders, routerContext, _loadContext) {
  const body = await renderToReadableStream(
    /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
    {
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return /* @__PURE__ */ jsxs("header", { className: "sticky top-0 z-50 w-full backdrop-blur-md bg-surface/80 border-b border-border/50 transition-all", children: [
    /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 h-16 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-8", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2 group", children: [
          /* @__PURE__ */ jsx(Gamepad2, { className: "w-6 h-6 text-brand transition-transform group-hover:-translate-y-1" }),
          /* @__PURE__ */ jsxs("span", { className: "font-bold text-xl tracking-tight", children: [
            "game",
            /* @__PURE__ */ jsx("span", { className: "text-brand", children: "moa" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("nav", { className: "hidden md:flex items-center gap-6", children: [
          /* @__PURE__ */ jsx(Link, { to: "/games", className: "text-sm font-medium text-text-secondary hover:text-text-primary transition-colors", children: "게임" }),
          /* @__PURE__ */ jsx(Link, { to: "/ranking", className: "text-sm font-medium text-text-secondary hover:text-text-primary transition-colors", children: "랭킹" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "hidden md:flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("button", { className: "p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer", children: /* @__PURE__ */ jsx(Search, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsx("button", { className: "px-4 py-2 text-sm font-semibold text-brand border border-brand/50 rounded-full hover:bg-brand/10 transition-colors cursor-pointer", children: "로그인" })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "md:hidden p-2 text-text-secondary cursor-pointer",
          onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen),
          children: isMobileMenuOpen ? /* @__PURE__ */ jsx(X, { className: "w-6 h-6" }) : /* @__PURE__ */ jsx(Menu, { className: "w-6 h-6" })
        }
      )
    ] }),
    isMobileMenuOpen && /* @__PURE__ */ jsx("div", { className: "md:hidden border-t border-border/50 bg-surface", children: /* @__PURE__ */ jsxs("nav", { className: "flex flex-col p-4 gap-4", children: [
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/games",
          className: "px-4 py-3 text-sm font-medium rounded-lg hover:bg-surface-raised transition-colors",
          onClick: () => setIsMobileMenuOpen(false),
          children: "게임"
        }
      ),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/ranking",
          className: "px-4 py-3 text-sm font-medium rounded-lg hover:bg-surface-raised transition-colors",
          onClick: () => setIsMobileMenuOpen(false),
          children: "랭킹"
        }
      ),
      /* @__PURE__ */ jsx("button", { className: "mt-4 px-4 py-3 text-sm font-semibold text-center text-brand border border-brand/50 rounded-lg hover:bg-brand/10 transition-colors cursor-pointer", children: "로그인" })
    ] }) })
  ] });
}
function Footer() {
  return /* @__PURE__ */ jsx("footer", { className: "w-full border-t border-border/30 bg-surface mt-auto", children: /* @__PURE__ */ jsx("div", { className: "container mx-auto px-4 py-8 md:py-12", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row justify-between items-center gap-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center md:items-start gap-2", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "font-bold text-lg tracking-tight", children: [
        "game",
        /* @__PURE__ */ jsx("span", { className: "text-brand", children: "moa" })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-text-muted", children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " gamemoa. All rights reserved."
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6", children: [
      /* @__PURE__ */ jsx("a", { href: "https://github.com", target: "_blank", rel: "noreferrer", className: "text-sm text-text-secondary hover:text-text-primary transition-colors", children: "GitHub" }),
      /* @__PURE__ */ jsx(Link, { to: "/terms", className: "text-sm text-text-secondary hover:text-text-primary transition-colors", children: "이용약관" }),
      /* @__PURE__ */ jsx(Link, { to: "/privacy", className: "text-sm text-text-secondary hover:text-text-primary transition-colors", children: "개인정보처리방침" })
    ] })
  ] }) }) });
}
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen flex flex-col w-full selection:bg-brand/30 selection:text-text-primary", children: [
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx("main", { className: "flex-1 w-full flex flex-col", children }),
    /* @__PURE__ */ jsx(Footer, {})
  ] });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "ko",
    className: "dark",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx("title", {
        children: "gamemoa — 심심할 틈 없이, 게임을 한곳에"
      }), /* @__PURE__ */ jsx("meta", {
        name: "description",
        content: "설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://fonts.googleapis.com"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous"
      }), /* @__PURE__ */ jsx("link", {
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
        rel: "stylesheet"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      className: "bg-surface text-text-primary antialiased",
      children: [/* @__PURE__ */ jsx(Layout, {
        children: /* @__PURE__ */ jsx(Outlet, {})
      }), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
const gameRegistry = {
  "reaction-time": () => import("./assets/index-YQ0Q6w0t.js")
};
const reactionTimeManifest = {
  id: "reaction-time",
  slug: "reaction-time",
  title: "반응속도 테스트",
  shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
  description: "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
  modes: ["single"],
  status: "published",
  categories: ["반응", "측정"],
  tags: ["반응속도", "클릭", "타이밍"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/reaction-time/thumbnail.svg",
  accent: "#22c55e",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  version: "0.1.0"
};
const gameManifests = [
  reactionTimeManifest
].filter((m) => m.status === "published" || m.status === "beta");
async function loadGame(slug) {
  const loader = gameRegistry[slug];
  if (!loader) return null;
  const mod = await loader();
  return "default" in mod ? mod.default : mod;
}
function GameCard({
  slug,
  title,
  shortDescription,
  modes,
  thumbnail,
  accent = "#6366f1",
  estimatedRoundSeconds
}) {
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to: `/games/${slug}`,
      className: "group flex flex-col bg-surface-raised rounded-2xl overflow-hidden border border-border/50 hover:border-border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 block",
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: "w-full aspect-[4/3] relative flex items-center justify-center p-6 overflow-hidden bg-surface-overlay",
            style: {
              background: `linear-gradient(135deg, ${accent}22 0%, ${accent}05 100%)`
            },
            children: [
              /* @__PURE__ */ jsx("div", { className: "absolute top-3 left-3 flex gap-2", children: modes.map((mode) => /* @__PURE__ */ jsx(
                "span",
                {
                  className: "text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md bg-black/40 text-white backdrop-blur-sm",
                  children: mode
                },
                mode
              )) }),
              thumbnail.startsWith("/") || thumbnail.startsWith("http") ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: thumbnail,
                  alt: title,
                  className: "w-20 h-20 rounded-xl shadow-lg object-cover transform group-hover:scale-110 transition-transform duration-300"
                }
              ) : /* @__PURE__ */ jsx(
                "div",
                {
                  className: "w-20 h-20 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300",
                  style: { backgroundColor: accent }
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "p-5 flex flex-col flex-1 gap-2", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-bold text-lg text-text-primary leading-tight group-hover:text-brand transition-colors", children: title }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-text-secondary line-clamp-2 leading-relaxed flex-1", children: shortDescription }),
          estimatedRoundSeconds && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs font-medium text-text-muted mt-2", children: [
            /* @__PURE__ */ jsx(Clock, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "약 ",
              Math.round(estimatedRoundSeconds),
              "초 소요"
            ] })
          ] })
        ] })
      ]
    }
  );
}
const home = UNSAFE_withComponentProps(function Home() {
  const featuredGames = gameManifests.slice(0, 3);
  return /* @__PURE__ */ jsxs("div", {
    className: "flex flex-col w-full",
    children: [/* @__PURE__ */ jsxs("section", {
      className: "relative w-full pt-20 pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[85vh]",
      children: [/* @__PURE__ */ jsx("div", {
        className: "absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--color-surface-raised)_0%,_var(--color-surface)_100%)] -z-10"
      }), /* @__PURE__ */ jsx("div", {
        className: "absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none -z-10"
      }), /* @__PURE__ */ jsxs("div", {
        className: "container mx-auto px-4 flex flex-col items-center text-center z-10 max-w-4xl",
        children: [/* @__PURE__ */ jsx("span", {
          className: "px-4 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-bold tracking-widest mb-8 border border-brand/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]",
          children: "PLAY. SCORE. AGAIN."
        }), /* @__PURE__ */ jsxs("h1", {
          className: "text-5xl md:text-7xl font-extrabold tracking-tight mb-8 whitespace-pre-line leading-[1.1]",
          children: [/* @__PURE__ */ jsx("span", {
            className: "text-text-primary",
            children: "심심할 틈 없이,"
          }), /* @__PURE__ */ jsx("br", {}), /* @__PURE__ */ jsx("span", {
            className: "text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-brand",
            children: "게임을 한곳에."
          })]
        }), /* @__PURE__ */ jsxs("p", {
          className: "text-lg md:text-xl text-text-secondary mb-12 max-w-2xl leading-relaxed whitespace-pre-line",
          children: ["설치 없이 바로 즐기는 가벼운 미니게임.", "\n", "짧게 한 판, 기록을 깨고, 다시 도전하세요."]
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col sm:flex-row gap-4 w-full sm:w-auto",
          children: [/* @__PURE__ */ jsxs(Link, {
            to: "/games",
            className: "flex items-center justify-center gap-2 px-8 py-4 bg-brand text-white rounded-full font-bold text-lg hover:bg-brand-dark hover:scale-105 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] cursor-pointer",
            children: [/* @__PURE__ */ jsx(Play, {
              className: "w-5 h-5 fill-current"
            }), "지금 바로 플레이"]
          }), /* @__PURE__ */ jsx(Link, {
            to: "/games",
            className: "flex items-center justify-center gap-2 px-8 py-4 bg-surface-raised text-text-primary border border-border rounded-full font-bold text-lg hover:bg-surface-overlay transition-colors cursor-pointer",
            children: "게임 둘러보기"
          })]
        })]
      })]
    }), /* @__PURE__ */ jsx("section", {
      className: "py-24 bg-surface-raised w-full",
      children: /* @__PURE__ */ jsxs("div", {
        className: "container mx-auto px-4 max-w-6xl",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "flex flex-col md:flex-row justify-between items-end mb-12 gap-4",
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("h2", {
              className: "text-3xl md:text-4xl font-bold mb-4",
              children: "지금 뭐 할까?"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-text-secondary text-lg",
              children: "고민할 필요 없이 바로 시작할 수 있는 게임들."
            })]
          }), /* @__PURE__ */ jsxs(Link, {
            to: "/games",
            className: "group flex items-center gap-2 text-brand font-semibold hover:text-brand-light transition-colors",
            children: ["전체보기", /* @__PURE__ */ jsx(ArrowRight, {
              className: "w-5 h-5 group-hover:translate-x-1 transition-transform"
            })]
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
          children: featuredGames.map((game) => /* @__PURE__ */ jsx(GameCard, {
            ...game
          }, game.slug))
        })]
      })
    }), /* @__PURE__ */ jsx("section", {
      className: "py-32 bg-surface relative overflow-hidden w-full",
      children: /* @__PURE__ */ jsx("div", {
        className: "container mx-auto px-4 max-w-6xl relative z-10",
        children: /* @__PURE__ */ jsxs("div", {
          className: "grid grid-cols-1 md:grid-cols-3 gap-8",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "p-8 rounded-3xl bg-surface-overlay/50 border border-border/50 backdrop-blur-sm flex flex-col items-start hover:border-brand/30 transition-colors group",
            children: [/* @__PURE__ */ jsx("div", {
              className: "p-4 rounded-2xl bg-brand/10 text-brand mb-6 group-hover:scale-110 transition-transform",
              children: /* @__PURE__ */ jsx(MonitorSmartphone, {
                className: "w-8 h-8"
              })
            }), /* @__PURE__ */ jsx("h3", {
              className: "text-xl font-bold mb-3",
              children: "설치 없이"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-text-secondary leading-relaxed",
              children: "브라우저만 열면 끝. 다운로드도 업데이트도 필요 없어요. 언제 어디서든 바로 시작하세요."
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "p-8 rounded-3xl bg-surface-overlay/50 border border-border/50 backdrop-blur-sm flex flex-col items-start hover:border-accent-green/30 transition-colors group",
            children: [/* @__PURE__ */ jsx("div", {
              className: "p-4 rounded-2xl bg-accent-green/10 text-accent-green mb-6 group-hover:scale-110 transition-transform",
              children: /* @__PURE__ */ jsx(Timer, {
                className: "w-8 h-8"
              })
            }), /* @__PURE__ */ jsx("h3", {
              className: "text-xl font-bold mb-3",
              children: "짧고 가볍게"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-text-secondary leading-relaxed",
              children: "1분이든 10분이든, 원할 때 한 판만 즐겨도 충분해요. 바쁜 일상 속 작은 휴식을 즐기세요."
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "p-8 rounded-3xl bg-surface-overlay/50 border border-border/50 backdrop-blur-sm flex flex-col items-start hover:border-accent-yellow/30 transition-colors group",
            children: [/* @__PURE__ */ jsx("div", {
              className: "p-4 rounded-2xl bg-accent-yellow/10 text-accent-yellow mb-6 group-hover:scale-110 transition-transform",
              children: /* @__PURE__ */ jsx(Trophy, {
                className: "w-8 h-8"
              })
            }), /* @__PURE__ */ jsx("h3", {
              className: "text-xl font-bold mb-3",
              children: "기록에 도전"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-text-secondary leading-relaxed",
              children: "로그인하면 최고 기록과 플레이 이력을 남길 수 있어요. 친구들과 순위를 경쟁해보세요."
            })]
          })]
        })
      })
    }), /* @__PURE__ */ jsx("section", {
      className: "py-24 bg-surface w-full relative",
      children: /* @__PURE__ */ jsxs("div", {
        className: "container mx-auto px-4 max-w-4xl text-center",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-bold text-sm mb-8",
          children: [/* @__PURE__ */ jsxs("span", {
            className: "relative flex h-3 w-3",
            children: [/* @__PURE__ */ jsx("span", {
              className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75"
            }), /* @__PURE__ */ jsx("span", {
              className: "relative inline-flex rounded-full h-3 w-3 bg-accent-blue"
            })]
          }), "COMING SOON"]
        }), /* @__PURE__ */ jsxs("h2", {
          className: "text-4xl md:text-5xl font-bold mb-6 whitespace-pre-line leading-tight",
          children: ["혼자도 좋지만,", "\n", "같이 하면 더 재밌으니까."]
        }), /* @__PURE__ */ jsx("p", {
          className: "text-xl text-text-secondary",
          children: "친구와 바로 입장할 수 있는 온라인 멀티게임도 준비하고 있습니다."
        })]
      })
    }), /* @__PURE__ */ jsx("section", {
      className: "py-24 bg-surface-raised w-full",
      children: /* @__PURE__ */ jsx("div", {
        className: "container mx-auto px-4 max-w-4xl text-center",
        children: /* @__PURE__ */ jsxs("div", {
          className: "bg-surface p-12 rounded-[3rem] border border-border/80 shadow-2xl relative overflow-hidden",
          children: [/* @__PURE__ */ jsx("div", {
            className: "absolute -top-40 -right-40 w-80 h-80 bg-brand/10 blur-[100px] rounded-full"
          }), /* @__PURE__ */ jsxs("div", {
            className: "relative z-10",
            children: [/* @__PURE__ */ jsx("h2", {
              className: "text-3xl md:text-4xl font-bold mb-4",
              children: "오늘의 기록을 남겨볼까요?"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-text-secondary text-lg mb-10 max-w-xl mx-auto",
              children: "Google 또는 Discord로 로그인하고 최고 기록과 즐겨찾기를 안전하게 저장하세요."
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex flex-col sm:flex-row justify-center gap-4",
              children: [/* @__PURE__ */ jsx("button", {
                disabled: true,
                className: "px-8 py-4 bg-white text-black rounded-full font-bold text-lg opacity-50 cursor-not-allowed hover:bg-gray-100 transition-colors",
                children: "Google로 계속하기"
              }), /* @__PURE__ */ jsx("button", {
                disabled: true,
                className: "px-8 py-4 bg-[#5865F2] text-white rounded-full font-bold text-lg opacity-50 cursor-not-allowed hover:bg-[#4752C4] transition-colors",
                children: "Discord로 계속하기"
              })]
            })]
          })]
        })
      })
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home
}, Symbol.toStringTag, { value: "Module" }));
function meta() {
  return [{
    title: "게임 목록 | gamemoa"
  }, {
    name: "description",
    content: "모든 미니게임을 한 곳에서 확인하세요."
  }];
}
const games = UNSAFE_withComponentProps(function Games() {
  return /* @__PURE__ */ jsxs("div", {
    className: "container mx-auto px-4 py-12 max-w-6xl flex-1",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "mb-10",
      children: [/* @__PURE__ */ jsx("h1", {
        className: "text-4xl font-extrabold mb-4",
        children: "모든 게임"
      }), /* @__PURE__ */ jsxs("p", {
        className: "text-lg text-text-secondary",
        children: ["총 ", gameManifests.length, "개의 게임이 준비되어 있습니다."]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
      children: [gameManifests.map((game) => /* @__PURE__ */ jsx(GameCard, {
        ...game
      }, game.slug)), gameManifests.length === 0 && /* @__PURE__ */ jsx("div", {
        className: "col-span-full py-20 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed",
        children: "현재 준비된 게임이 없습니다."
      })]
    })]
  });
});
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: games,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const gameSlug = UNSAFE_withComponentProps(function GamePlay() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.slug ?? "";
  const [GameComponent, setGameComponent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState(null);
  const manifest = useMemo(() => gameManifests.find((m) => m.slug === slug), [slug]);
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setIsLoading(true);
        setError(null);
        const module = await loadGame(slug);
        if (!isMounted) return;
        if (!module) {
          setError("게임을 찾을 수 없습니다.");
        } else {
          setGameComponent(() => module.Game);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load game:", err);
          setError("게임을 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    void init();
    return () => {
      isMounted = false;
    };
  }, [slug]);
  const runtime = useMemo(() => ({
    sessionId: crypto.randomUUID(),
    user: null,
    emit: (event) => {
      console.log("Game event emitted:", event);
    },
    complete: async (gameResult) => {
      console.log("Game completed with result:", gameResult);
      setResult(gameResult);
    },
    cancel: () => {
      void navigate("/games");
    }
  }), [navigate]);
  if (error) {
    return /* @__PURE__ */ jsxs("div", {
      className: "container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1",
      children: [/* @__PURE__ */ jsx(AlertCircle, {
        className: "w-16 h-16 text-accent-red mb-6"
      }), /* @__PURE__ */ jsx("h2", {
        className: "text-2xl font-bold mb-4",
        children: error
      }), /* @__PURE__ */ jsx("button", {
        type: "button",
        onClick: () => void navigate("/games"),
        className: "px-6 py-3 bg-surface-raised border border-border rounded-lg hover:bg-surface-overlay transition-colors",
        children: "목록으로 돌아가기"
      })]
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "flex flex-col flex-1 bg-[#09090b]",
    children: [/* @__PURE__ */ jsx("div", {
      className: "h-14 border-b border-border bg-surface flex items-center px-4 justify-between shrink-0",
      children: /* @__PURE__ */ jsxs("div", {
        className: "flex items-center gap-4",
        children: [/* @__PURE__ */ jsxs("button", {
          type: "button",
          onClick: () => void navigate("/games"),
          className: "p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer flex items-center gap-2",
          children: [/* @__PURE__ */ jsx(ArrowLeft, {
            className: "w-5 h-5"
          }), /* @__PURE__ */ jsx("span", {
            className: "text-sm font-medium hidden sm:inline",
            children: "돌아가기"
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "h-4 w-px bg-border hidden sm:block"
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-3",
          children: [/* @__PURE__ */ jsx("div", {
            className: "w-6 h-6 rounded-md",
            style: {
              backgroundColor: (manifest == null ? void 0 : manifest.accent) ?? "#6366f1"
            }
          }), /* @__PURE__ */ jsx("span", {
            className: "font-bold",
            children: (manifest == null ? void 0 : manifest.title) ?? "게임 로딩중..."
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("div", {
      className: "flex-1 relative flex items-center justify-center overflow-hidden p-4",
      children: isLoading ? /* @__PURE__ */ jsxs("div", {
        className: "flex flex-col items-center gap-4",
        children: [/* @__PURE__ */ jsx("div", {
          className: "w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-text-secondary font-medium animate-pulse",
          children: "게임을 불러오는 중..."
        })]
      }) : GameComponent ? /* @__PURE__ */ jsxs("div", {
        className: "w-full max-w-4xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50",
        children: [result ? /* @__PURE__ */ jsxs("div", {
          className: "absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-8 text-center",
          children: [/* @__PURE__ */ jsx("h3", {
            className: "text-3xl font-extrabold mb-2 text-white",
            children: "게임 종료!"
          }), /* @__PURE__ */ jsxs("div", {
            className: "mb-8 p-6 bg-surface-raised rounded-2xl border border-border",
            children: [/* @__PURE__ */ jsx("p", {
              className: "text-text-secondary text-sm mb-1",
              children: "점수"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-5xl font-black text-brand mb-4",
              children: result.score
            }), result.metadata && Object.keys(result.metadata).length > 0 && /* @__PURE__ */ jsx("div", {
              className: "grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border",
              children: Object.entries(result.metadata).map(([key, value]) => /* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsx("p", {
                  className: "text-xs text-text-muted capitalize",
                  children: key
                }), /* @__PURE__ */ jsx("p", {
                  className: "font-semibold text-text-primary",
                  children: String(value)
                })]
              }, key))
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "flex gap-4",
            children: [/* @__PURE__ */ jsx("button", {
              type: "button",
              onClick: () => setResult(null),
              className: "px-8 py-3 bg-brand text-white rounded-lg font-bold hover:bg-brand-light transition-colors",
              children: "다시 하기"
            }), /* @__PURE__ */ jsx("button", {
              type: "button",
              onClick: () => void navigate("/games"),
              className: "px-8 py-3 bg-surface text-text-primary border border-border rounded-lg font-bold hover:bg-surface-raised transition-colors",
              children: "목록으로"
            })]
          })]
        }) : null, /* @__PURE__ */ jsx("div", {
          className: "p-6",
          children: /* @__PURE__ */ jsx(GameComponent, {
            runtime
          })
        })]
      }) : null
    })]
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: gameSlug
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-CaOTZVTm.js", "imports": ["/assets/chunk-62JRHF6Z-CH7ymSO7.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root--FdAIe4v.js", "imports": ["/assets/chunk-62JRHF6Z-CH7ymSO7.js", "/assets/createLucideIcon-5Vn2kO8t.js"], "css": ["/assets/root-6kfVYbvd.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/home-B8RdAGSK.js", "imports": ["/assets/chunk-62JRHF6Z-CH7ymSO7.js", "/assets/registry-2CJyOPBc.js", "/assets/GameCard-fW6G4Ilh.js", "/assets/createLucideIcon-5Vn2kO8t.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/games": { "id": "routes/games", "parentId": "root", "path": "games", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/games-CXSI9r_N.js", "imports": ["/assets/chunk-62JRHF6Z-CH7ymSO7.js", "/assets/registry-2CJyOPBc.js", "/assets/GameCard-fW6G4Ilh.js", "/assets/createLucideIcon-5Vn2kO8t.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/game-slug": { "id": "routes/game-slug", "parentId": "root", "path": "games/:slug", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/game-slug-B2P1Y2dL.js", "imports": ["/assets/chunk-62JRHF6Z-CH7ymSO7.js", "/assets/registry-2CJyOPBc.js", "/assets/createLucideIcon-5Vn2kO8t.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-5ebf2a72.js", "version": "5ebf2a72", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "v8_passThroughRequests": false, "v8_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/home": {
    id: "routes/home",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  },
  "routes/games": {
    id: "routes/games",
    parentId: "root",
    path: "games",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/game-slug": {
    id: "routes/game-slug",
    parentId: "root",
    path: "games/:slug",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
