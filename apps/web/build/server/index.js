import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { ServerRouter, useNavigate, Link, useLocation, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, useSearchParams, useParams } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import { useState, useMemo, useEffect } from "react";
import { Menu, Gamepad2, Search, Command, Bookmark, User, Flame, Sparkles, Zap, Trophy, Compass, X, Play, Clock, Brain, AlertCircle, ArrowLeft } from "lucide-react";
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
function Header({ onToggleMobileSidebar }) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/games?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  return /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-50 w-full backdrop-blur-xl bg-surface/90 border-b border-border/80 transition-all select-none", children: /* @__PURE__ */ jsxs("div", { className: "w-full px-4 h-16 flex items-center justify-between gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer",
          onClick: onToggleMobileSidebar,
          "aria-label": "메뉴 열기",
          children: /* @__PURE__ */ jsx(Menu, { className: "w-6 h-6" })
        }
      ),
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2.5 group", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-xl bg-gradient-to-tr from-brand to-accent-purple shadow-md shadow-brand/20 group-hover:scale-105 transition-transform duration-200", children: /* @__PURE__ */ jsx(Gamepad2, { className: "w-5 h-5 text-white" }) }),
        /* @__PURE__ */ jsxs("span", { className: "font-extrabold text-xl tracking-tight text-text-primary", children: [
          "game",
          /* @__PURE__ */ jsx("span", { className: "text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-accent-purple", children: "moa" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSearchSubmit, className: "flex-1 max-w-md hidden sm:flex items-center relative", children: [
      /* @__PURE__ */ jsx(Search, { className: "w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "게임명, 태그 또는 카테고리 검색...",
          className: "w-full bg-surface-raised text-text-primary placeholder:text-text-muted text-sm rounded-full pl-10 pr-12 py-2 border border-border/80 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-inner"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "absolute right-3 flex items-center gap-1 text-[10px] font-bold text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border pointer-events-none", children: [
        /* @__PURE__ */ jsx(Command, { className: "w-3 h-3" }),
        /* @__PURE__ */ jsx("span", { children: "K" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
      /* @__PURE__ */ jsx(
        Link,
        {
          to: "/games?category=favorites",
          className: "p-2.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors relative cursor-pointer",
          title: "즐겨찾기",
          children: /* @__PURE__ */ jsx(Bookmark, { className: "w-5 h-5" })
        }
      ),
      /* @__PURE__ */ jsxs("button", { className: "flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-full hover:shadow-lg hover:shadow-brand/30 hover:scale-105 transition-all cursor-pointer", children: [
        /* @__PURE__ */ jsx(User, { className: "w-4 h-4" }),
        /* @__PURE__ */ jsx("span", { children: "로그인" })
      ] })
    ] })
  ] }) });
}
function Sidebar({ isMobileOpen, onMobileClose }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const navItems = [
    { label: "홈", path: "/", icon: Flame, badge: "HOT" },
    { label: "전체 게임", path: "/games", icon: Gamepad2 },
    { label: "인기 게임", path: "/games?category=popular", icon: Sparkles },
    { label: "순발력 & 두뇌", path: "/games?category=reaction", icon: Zap, badge: "NEW" },
    { label: "랭킹 & 기록", path: "/ranking", icon: Trophy }
  ];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("aside", { className: "hidden lg:flex flex-col w-16 hover:w-56 transition-all duration-300 ease-in-out bg-surface-sidebar border-r border-border h-[calc(100vh-4rem)] sticky top-16 z-40 group shadow-2xl overflow-hidden shrink-0 select-none", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col justify-between h-full p-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
        /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-[11px] font-bold text-text-muted uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap", children: "탐색 메뉴" }),
        navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || item.path !== "/" && currentPath.startsWith(item.path);
          return /* @__PURE__ */ jsxs(
            Link,
            {
              to: item.path,
              className: `flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group/btn relative ${isActive ? "bg-brand text-white font-bold shadow-lg shadow-brand/25" : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"}`,
              children: [
                /* @__PURE__ */ jsx(Icon, { className: `w-5 h-5 shrink-0 transition-transform group-hover/btn:scale-110 ${isActive ? "text-white" : "text-brand-light"}` }),
                /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden", children: item.label }),
                item.badge && /* @__PURE__ */ jsx("span", { className: "ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-accent-red text-white uppercase tracking-wider", children: item.badge })
              ]
            },
            item.label
          );
        })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-2 border-t border-border/50 flex flex-col gap-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-2 py-1.5 text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap", children: [
        /* @__PURE__ */ jsx(Compass, { className: "w-4 h-4 text-brand-light" }),
        /* @__PURE__ */ jsx("span", { children: "웹 게임 100% 무설치" })
      ] }) })
    ] }) }),
    isMobileOpen && /* @__PURE__ */ jsxs("div", { className: "lg:hidden fixed inset-0 z-50 flex", children: [
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm", onClick: onMobileClose }),
      /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col w-72 max-w-[80vw] bg-surface-sidebar border-r border-border h-full p-4 z-10 shadow-2xl animate-in slide-in-from-left duration-200", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 mb-4 border-b border-border", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Gamepad2, { className: "w-6 h-6 text-brand" }),
            /* @__PURE__ */ jsx("span", { className: "font-bold text-lg text-text-primary", children: "메뉴" })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: onMobileClose, className: "p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised", children: /* @__PURE__ */ jsx(X, { className: "w-5 h-5" }) })
        ] }),
        /* @__PURE__ */ jsx("nav", { className: "flex flex-col gap-2", children: navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return /* @__PURE__ */ jsxs(
            Link,
            {
              to: item.path,
              onClick: onMobileClose,
              className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? "bg-brand text-white font-bold" : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"}`,
              children: [
                /* @__PURE__ */ jsx(Icon, { className: "w-5 h-5" }),
                /* @__PURE__ */ jsx("span", { className: "text-base font-medium", children: item.label }),
                item.badge && /* @__PURE__ */ jsx("span", { className: "ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded bg-accent-red text-white", children: item.badge })
              ]
            },
            item.label
          );
        }) })
      ] })
    ] })
  ] });
}
function Footer() {
  return /* @__PURE__ */ jsxs("footer", { className: "w-full border-t border-border bg-surface-sidebar mt-auto select-none", children: [
    /* @__PURE__ */ jsx("div", { className: "w-full border-b border-border/50 bg-surface-raised/40 py-12 px-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto flex flex-col gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-brand font-extrabold text-lg", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "w-5 h-5" }),
        /* @__PURE__ */ jsx("h3", { children: "빠르고 재미있는 웹 미니게임 모음 플랫폼, gamemoa!" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-8 text-xs md:text-sm text-text-secondary leading-relaxed", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
          /* @__PURE__ */ jsx("h4", { className: "font-bold text-text-primary text-base", children: "다운로드 없이 1초만에 시작하는 미니게임" }),
          /* @__PURE__ */ jsx("p", { children: "gamemoa는 별도의 회원가입이나 앱 설치 없이 브라우저에서 즉시 실행되는 웹 미니게임 라이브러리입니다. 바쁜 일상 속 점심시간이나 쉬는 시간 동안 순발력 테스트, 두뇌 회전 게임, 아케이드 게임을 부담 없이 즐겨보세요." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
          /* @__PURE__ */ jsx("h4", { className: "font-bold text-text-primary text-base", children: "공정한 기록 도전과 순위 경쟁" }),
          /* @__PURE__ */ jsx("p", { children: "순발력 측정, 반응속도 테스트 등 유저의 정밀한 타이밍과 반응시간을 밀리초(ms) 단위로 측정합니다. 친구들과 기록을 비교하고 최고의 랭커가 되기 위해 계속 도전해 보세요!" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2 pt-4 border-t border-border/30", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-text-muted mr-2", children: "인기 태그:" }),
        ["#반응속도테스트", "#무설치미니게임", "#순발력게임", "#두뇌회전", "#웹게임모음", "#무료게임"].map((tag) => /* @__PURE__ */ jsx("span", { className: "text-xs font-medium px-2.5 py-1 rounded-full bg-surface border border-border/80 text-text-secondary hover:text-text-primary hover:border-brand/40 transition-colors", children: tag }, tag))
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center md:items-start gap-2", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2 group", children: [
          /* @__PURE__ */ jsx(Gamepad2, { className: "w-5 h-5 text-brand" }),
          /* @__PURE__ */ jsxs("span", { className: "font-bold text-lg tracking-tight text-text-primary", children: [
            "game",
            /* @__PURE__ */ jsx("span", { className: "text-brand", children: "moa" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-text-muted", children: [
          "© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " gamemoa. All rights reserved. Designed for speed & fun."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6 text-xs text-text-secondary", children: [
        /* @__PURE__ */ jsx("a", { href: "https://github.com/TaeyanG4/project-gamemoa", target: "_blank", rel: "noreferrer", className: "hover:text-text-primary transition-colors", children: "GitHub Repo" }),
        /* @__PURE__ */ jsx(Link, { to: "/games", className: "hover:text-text-primary transition-colors", children: "전체 게임 목록" }),
        /* @__PURE__ */ jsx(Link, { to: "/ranking", className: "hover:text-text-primary transition-colors", children: "명예의 전당" })
      ] })
    ] })
  ] });
}
function Layout({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen flex flex-col w-full selection:bg-brand/30 selection:text-text-primary bg-surface text-text-primary", children: [
    /* @__PURE__ */ jsx(Header, { onToggleMobileSidebar: () => setIsMobileSidebarOpen((prev) => !prev) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex w-full", children: [
      /* @__PURE__ */ jsx(
        Sidebar,
        {
          isMobileOpen: isMobileSidebarOpen,
          onMobileClose: () => setIsMobileSidebarOpen(false)
        }
      ),
      /* @__PURE__ */ jsx("main", { className: "flex-1 w-full min-w-0 flex flex-col", children })
    ] }),
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
      className: "group relative flex flex-col bg-surface-raised rounded-2xl overflow-hidden border border-border/80 hover:border-brand/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand/10 select-none block",
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: "w-full aspect-[16/10] relative flex items-center justify-center p-6 overflow-hidden bg-surface-overlay",
            style: {
              background: `radial-gradient(circle at center, ${accent}25 0%, rgba(15, 19, 31, 0.95) 100%)`
            },
            children: [
              /* @__PURE__ */ jsx("div", { className: "absolute top-3 left-3 z-10 flex gap-1.5", children: modes.slice(0, 2).map((mode) => /* @__PURE__ */ jsx(
                "span",
                {
                  className: "text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-md border border-white/10 tracking-wider",
                  children: mode
                },
                mode
              )) }),
              thumbnail.startsWith("/") || thumbnail.startsWith("http") ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: thumbnail,
                  alt: title,
                  className: "w-24 h-24 object-contain rounded-2xl shadow-xl transform group-hover:scale-110 transition-transform duration-300"
                }
              ) : /* @__PURE__ */ jsx(
                "div",
                {
                  className: "w-24 h-24 rounded-2xl shadow-xl transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center text-white font-extrabold text-xl",
                  style: { backgroundColor: accent },
                  children: title.slice(0, 2)
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20", children: /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/40 transform scale-75 group-hover:scale-100 transition-transform duration-200", children: /* @__PURE__ */ jsx(Play, { className: "w-6 h-6 fill-current ml-0.5" }) }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "p-4 flex flex-col flex-1 gap-1.5 bg-surface-raised", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-bold text-base text-text-primary group-hover:text-brand transition-colors line-clamp-1", children: title }),
            /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 text-brand-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-text-secondary line-clamp-2 leading-relaxed flex-1", children: shortDescription }),
          estimatedRoundSeconds && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-[11px] font-semibold text-text-muted mt-2 pt-2 border-t border-border/40", children: [
            /* @__PURE__ */ jsx(Clock, { className: "w-3 h-3 text-brand-light" }),
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
function HeroSpotlight({ game }) {
  return /* @__PURE__ */ jsxs("div", { className: "relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-surface-raised via-surface-overlay to-surface border border-border shadow-2xl group select-none", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "absolute -right-20 -top-20 w-96 h-96 blur-[120px] rounded-full pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-500",
        style: { backgroundColor: game.accent || "#6366f1" }
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/10 via-transparent to-transparent pointer-events-none" }),
    /* @__PURE__ */ jsxs("div", { className: "relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-start gap-4 max-w-xl", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand-light text-xs font-extrabold uppercase tracking-wider", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "w-3.5 h-3.5" }),
          /* @__PURE__ */ jsx("span", { children: "오늘의 피처드 게임" })
        ] }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl md:text-5xl font-black text-text-primary tracking-tight leading-tight", children: game.title }),
        /* @__PURE__ */ jsx("p", { className: "text-base md:text-lg text-text-secondary leading-relaxed", children: game.shortDescription }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3 pt-2", children: [
          game.modes.map((mode) => /* @__PURE__ */ jsxs(
            "span",
            {
              className: "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-surface-sidebar border border-border text-text-secondary",
              children: [
                /* @__PURE__ */ jsx(Zap, { className: "w-3 h-3 text-accent-yellow" }),
                mode
              ]
            },
            mode
          )),
          game.estimatedRoundSeconds && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-surface-sidebar border border-border text-text-muted", children: [
            /* @__PURE__ */ jsx(Clock, { className: "w-3 h-3 text-brand-light" }),
            "약 ",
            game.estimatedRoundSeconds,
            "초 라운드"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "pt-4 flex items-center gap-4 w-full sm:w-auto", children: /* @__PURE__ */ jsxs(
          Link,
          {
            to: `/games/${game.slug}`,
            className: "flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-brand to-accent-purple text-white rounded-2xl font-extrabold text-lg shadow-xl shadow-brand/30 hover:scale-105 hover:shadow-2xl hover:shadow-brand/50 transition-all duration-200 cursor-pointer",
            children: [
              /* @__PURE__ */ jsx(Play, { className: "w-6 h-6 fill-current" }),
              /* @__PURE__ */ jsx("span", { children: "지금 바로 플레이" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "w-full md:w-72 aspect-[4/3] relative rounded-2xl overflow-hidden border border-border/80 bg-surface-sidebar flex items-center justify-center p-6 shrink-0 group-hover:border-brand/40 transition-colors shadow-2xl", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity",
            style: {
              background: `radial-gradient(circle, ${game.accent || "#6366f1"} 0%, transparent 70%)`
            }
          }
        ),
        game.thumbnail.startsWith("/") || game.thumbnail.startsWith("http") ? /* @__PURE__ */ jsx(
          "img",
          {
            src: game.thumbnail,
            alt: game.title,
            className: "w-32 h-32 object-contain rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 relative z-10"
          }
        ) : /* @__PURE__ */ jsx(
          "div",
          {
            className: "w-32 h-32 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 relative z-10 flex items-center justify-center text-white font-black text-2xl",
            style: { backgroundColor: game.accent || "#6366f1" },
            children: game.title.slice(0, 2)
          }
        )
      ] })
    ] })
  ] });
}
const CATEGORIES = [
  { id: "all", label: "전체", icon: Flame },
  { id: "popular", label: "인기", icon: Sparkles },
  { id: "reaction", label: "순발력", icon: Zap },
  { id: "brain", label: "두뇌", icon: Brain },
  { id: "arcade", label: "아케이드", icon: Gamepad2 },
  { id: "favorites", label: "즐겨찾기", icon: Bookmark }
];
function CategoryChips({ selectedCategory, onSelectCategory }) {
  return /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 overflow-x-auto no-scrollbar py-2 w-full select-none", children: CATEGORIES.map((cat) => {
    const Icon = cat.icon;
    const isSelected = selectedCategory === cat.id;
    return /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => onSelectCategory(cat.id),
        className: `flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all cursor-pointer border ${isSelected ? "bg-brand text-white border-brand shadow-lg shadow-brand/25 scale-105" : "bg-surface-raised text-text-secondary border-border/80 hover:text-text-primary hover:bg-surface-overlay hover:border-border"}`,
        children: [
          /* @__PURE__ */ jsx(Icon, { className: `w-4 h-4 ${isSelected ? "text-white" : "text-brand-light"}` }),
          /* @__PURE__ */ jsx("span", { children: cat.label })
        ]
      },
      cat.id
    );
  }) });
}
function meta$1() {
  return [{
    title: "gamemoa — 심심할 틈 없이, 게임을 한곳에"
  }, {
    name: "description",
    content: "설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼"
  }];
}
const home = UNSAFE_withComponentProps(function Home() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const featuredGame = gameManifests[0];
  const filteredGames = useMemo(() => {
    if (selectedCategory === "all") return gameManifests;
    if (selectedCategory === "popular") return gameManifests;
    if (selectedCategory === "reaction") {
      return gameManifests.filter((g) => g.modes.includes("single") || g.slug.includes("reaction"));
    }
    if (selectedCategory === "brain") {
      return gameManifests.filter((g) => g.modes.includes("single"));
    }
    if (selectedCategory === "arcade") {
      return gameManifests;
    }
    return gameManifests;
  }, [selectedCategory]);
  return /* @__PURE__ */ jsxs("div", {
    className: "flex flex-col w-full px-4 md:px-8 py-6 gap-10 max-w-7xl mx-auto",
    children: [featuredGame && /* @__PURE__ */ jsx("section", {
      className: "w-full",
      children: /* @__PURE__ */ jsx(HeroSpotlight, {
        game: featuredGame
      })
    }), /* @__PURE__ */ jsxs("section", {
      className: "flex flex-col gap-6 w-full",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-2.5",
          children: [/* @__PURE__ */ jsx(Gamepad2, {
            className: "w-6 h-6 text-brand"
          }), /* @__PURE__ */ jsx("h2", {
            className: "text-2xl font-black text-text-primary tracking-tight",
            children: "미니게임 라인업"
          }), /* @__PURE__ */ jsxs("span", {
            className: "text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20",
            children: [filteredGames.length, "개"]
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "w-full sm:w-auto",
          children: /* @__PURE__ */ jsx(CategoryChips, {
            selectedCategory,
            onSelectCategory: setSelectedCategory
          })
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5",
        children: [filteredGames.map((game) => /* @__PURE__ */ jsx(GameCard, {
          ...game
        }, game.slug)), filteredGames.length === 0 && /* @__PURE__ */ jsx("div", {
          className: "col-span-full py-16 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed",
          children: "해당 카테고리에 준비된 게임이 없습니다."
        })]
      })]
    }), /* @__PURE__ */ jsxs("section", {
      className: "w-full rounded-3xl bg-gradient-to-r from-surface-raised via-surface-overlay to-surface border border-border p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex flex-col gap-2 z-10",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-extrabold text-xs",
          children: [/* @__PURE__ */ jsx(Sparkles, {
            className: "w-3.5 h-3.5"
          }), /* @__PURE__ */ jsx("span", {
            children: "COMMUNITY & MULTIPLAYER"
          })]
        }), /* @__PURE__ */ jsx("h3", {
          className: "text-2xl md:text-3xl font-black text-text-primary",
          children: "실시간 랭킹 & 멀티플레이어 업데이트 예정"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-sm text-text-secondary",
          children: "친구와 링크 하나로 접속해 함께 실시간 대결을 펼칠 수 있는 멀티 모드가 곧 출시됩니다."
        })]
      }), /* @__PURE__ */ jsx(Link, {
        to: "/games",
        className: "z-10 shrink-0 px-6 py-3 bg-surface-raised border border-border hover:border-brand/40 text-text-primary font-bold text-sm rounded-xl transition-all cursor-pointer",
        children: "게임 미리보기"
      })]
    })]
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
function meta() {
  return [{
    title: "전체 미니게임 목록 | gamemoa"
  }, {
    name: "description",
    content: "설치 없는 모든 웹 미니게임을 한 곳에서 탐색하고 즐기세요."
  }];
}
const games = UNSAFE_withComponentProps(function Games() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || "all";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const filteredGames = useMemo(() => {
    return gameManifests.filter((game) => {
      const matchesSearch = !searchQuery || game.title.toLowerCase().includes(searchQuery.toLowerCase()) || game.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || selectedCategory === "popular" || selectedCategory === "reaction" && game.slug.includes("reaction") || selectedCategory === "brain" && game.modes.includes("single");
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);
  return /* @__PURE__ */ jsxs("div", {
    className: "flex flex-col w-full px-4 md:px-8 py-8 gap-8 max-w-7xl mx-auto flex-1",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/60 pb-6",
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider mb-1",
          children: [/* @__PURE__ */ jsx(Gamepad2, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Game Collection"
          })]
        }), /* @__PURE__ */ jsx("h1", {
          className: "text-3xl md:text-4xl font-black text-text-primary",
          children: "전체 미니게임"
        }), /* @__PURE__ */ jsxs("p", {
          className: "text-sm text-text-secondary mt-1",
          children: ["총 ", filteredGames.length, "개의 가벼운 미니게임이 준비되어 있습니다."]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "relative w-full md:w-80",
        children: [/* @__PURE__ */ jsx(Search, {
          className: "w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        }), /* @__PURE__ */ jsx("input", {
          type: "text",
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "게임 검색...",
          className: "w-full bg-surface-raised text-text-primary placeholder:text-text-muted text-sm rounded-xl pl-10 pr-4 py-2.5 border border-border/80 focus:outline-none focus:border-brand transition-all"
        })]
      })]
    }), /* @__PURE__ */ jsx(CategoryChips, {
      selectedCategory,
      onSelectCategory: setSelectedCategory
    }), /* @__PURE__ */ jsxs("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
      children: [filteredGames.map((game) => /* @__PURE__ */ jsx(GameCard, {
        ...game
      }, game.slug)), filteredGames.length === 0 && /* @__PURE__ */ jsx("div", {
        className: "col-span-full py-20 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed",
        children: "검색 결과와 일치하는 게임이 없습니다."
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
const serverManifest = { "entry": { "module": "/assets/entry.client-BdWs7cPS.js", "imports": ["/assets/chunk-62JRHF6Z-CmonFRjV.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-DvwjNhww.js", "imports": ["/assets/chunk-62JRHF6Z-CmonFRjV.js", "/assets/createLucideIcon-Cr_PdLWK.js", "/assets/zap-C5cD1i_b.js", "/assets/search-dUXyqtQM.js"], "css": ["/assets/root-C-aq1qRm.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/home-9T4otNJt.js", "imports": ["/assets/chunk-62JRHF6Z-CmonFRjV.js", "/assets/registry-BNd0FKyJ.js", "/assets/CategoryChips-CiaAKfpd.js", "/assets/zap-C5cD1i_b.js", "/assets/createLucideIcon-Cr_PdLWK.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/games": { "id": "routes/games", "parentId": "root", "path": "games", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/games-CK_8hkWc.js", "imports": ["/assets/chunk-62JRHF6Z-CmonFRjV.js", "/assets/registry-BNd0FKyJ.js", "/assets/CategoryChips-CiaAKfpd.js", "/assets/zap-C5cD1i_b.js", "/assets/search-dUXyqtQM.js", "/assets/createLucideIcon-Cr_PdLWK.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/game-slug": { "id": "routes/game-slug", "parentId": "root", "path": "games/:slug", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/game-slug-R-GW6GNn.js", "imports": ["/assets/chunk-62JRHF6Z-CmonFRjV.js", "/assets/registry-BNd0FKyJ.js", "/assets/createLucideIcon-Cr_PdLWK.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-b90e91d1.js", "version": "b90e91d1", "sri": void 0 };
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
