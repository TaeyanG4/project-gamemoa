import type { SupportedLocale } from "@gamemoa/contracts";

/** Keys covered so far: global navigation (header/footer), the language selector itself, and
 * common loading/error/empty states. This is a real, working i18n foundation — translating every
 * remaining screen (games/ranking/profile/discord/admin/wiki body copy) is deliberately left for
 * a follow-up session (see docs/I18N.md and docs/WORK_PROGRESS.md) rather than rushed here. */
export interface Dictionary {
  common: {
    loading: string;
    error: string;
    retry: string;
    empty: string;
    save: string;
    cancel: string;
  };
  nav: {
    searchPlaceholder: string;
    favorites: string;
    login: string;
    logout: string;
    myProfile: string;
    ranking: string;
    wiki: string;
  };
  footer: {
    tagline: string;
    githubRepo: string;
    allGames: string;
    ranking: string;
    wiki: string;
    rightsReserved: string;
  };
  home: {
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    browseGames: string;
    lineupTitle: string;
  };
  language: {
    label: string;
    ko: string;
    en: string;
    ja: string;
    zh: string;
  };
}

export const DICTIONARIES: Record<SupportedLocale, Dictionary> = {
  "ko-KR": {
    common: {
      loading: "불러오는 중...",
      error: "문제가 발생했습니다.",
      retry: "다시 시도",
      empty: "표시할 항목이 없습니다.",
      save: "저장",
      cancel: "취소",
    },
    nav: {
      searchPlaceholder: "게임명, 태그 또는 카테고리 검색...",
      favorites: "즐겨찾기",
      login: "로그인",
      logout: "로그아웃",
      myProfile: "내 프로필 & 기록",
      ranking: "명예의 전당",
      wiki: "Wiki",
    },
    footer: {
      tagline: "설치 없이, 1초 만에 즐기는 미니게임",
      githubRepo: "GitHub Repo",
      allGames: "전체 게임 목록",
      ranking: "명예의 전당",
      wiki: "Wiki",
      rightsReserved: "All rights reserved.",
    },
    home: {
      heroEyebrow: "설치 없이 바로 플레이",
      heroTitle: "심심할 틈 없이, 게임을 한곳에",
      heroSubtitle: "가벼운 웹 미니게임을 모아 즐기고, 친구들과 기록을 겨뤄보세요.",
      browseGames: "게임 둘러보기",
      lineupTitle: "미니게임 라인업",
    },
    language: { label: "언어", ko: "한국어", en: "English", ja: "日本語", zh: "简体中文" },
  },
  "en-US": {
    common: {
      loading: "Loading...",
      error: "Something went wrong.",
      retry: "Retry",
      empty: "Nothing to show here.",
      save: "Save",
      cancel: "Cancel",
    },
    nav: {
      searchPlaceholder: "Search by game name, tag, or category...",
      favorites: "Favorites",
      login: "Log in",
      logout: "Log out",
      myProfile: "My Profile & Records",
      ranking: "Hall of Fame",
      wiki: "Wiki",
    },
    footer: {
      tagline: "No install, playable in a second",
      githubRepo: "GitHub Repo",
      allGames: "All Games",
      ranking: "Hall of Fame",
      wiki: "Wiki",
      rightsReserved: "All rights reserved.",
    },
    home: {
      heroEyebrow: "Play instantly, no install",
      heroTitle: "Never a dull moment — all your games in one place",
      heroSubtitle: "Play light web mini-games and compete for the best record with friends.",
      browseGames: "Browse games",
      lineupTitle: "Mini-Game Lineup",
    },
    language: { label: "Language", ko: "한국어", en: "English", ja: "日本語", zh: "简体中文" },
  },
  "ja-JP": {
    common: {
      loading: "読み込み中...",
      error: "問題が発生しました。",
      retry: "再試行",
      empty: "表示する項目がありません。",
      save: "保存",
      cancel: "キャンセル",
    },
    nav: {
      searchPlaceholder: "ゲーム名、タグ、カテゴリで検索...",
      favorites: "お気に入り",
      login: "ログイン",
      logout: "ログアウト",
      myProfile: "マイプロフィール＆記録",
      ranking: "殿堂入り",
      wiki: "Wiki",
    },
    footer: {
      tagline: "インストール不要、すぐに遊べるミニゲーム",
      githubRepo: "GitHub リポジトリ",
      allGames: "全ゲーム一覧",
      ranking: "殿堂入り",
      wiki: "Wiki",
      rightsReserved: "All rights reserved.",
    },
    home: {
      heroEyebrow: "インストール不要ですぐプレイ",
      heroTitle: "退屈する暇なし、ゲームを一か所に",
      heroSubtitle: "軽量なWebミニゲームを集めて楽しみ、友達と記録を競いましょう。",
      browseGames: "ゲームを見る",
      lineupTitle: "ミニゲームラインナップ",
    },
    language: { label: "言語", ko: "한국어", en: "English", ja: "日本語", zh: "简体中文" },
  },
  "zh-CN": {
    common: {
      loading: "加载中...",
      error: "出现问题。",
      retry: "重试",
      empty: "暂无内容。",
      save: "保存",
      cancel: "取消",
    },
    nav: {
      searchPlaceholder: "按游戏名称、标签或分类搜索...",
      favorites: "收藏",
      login: "登录",
      logout: "退出登录",
      myProfile: "我的资料和记录",
      ranking: "名人堂",
      wiki: "Wiki",
    },
    footer: {
      tagline: "无需安装，一秒畅玩的小游戏",
      githubRepo: "GitHub 仓库",
      allGames: "全部游戏",
      ranking: "名人堂",
      wiki: "Wiki",
      rightsReserved: "All rights reserved.",
    },
    home: {
      heroEyebrow: "无需安装，即刻畅玩",
      heroTitle: "告别无聊，好玩游戏尽在一处",
      heroSubtitle: "畅玩轻量网页小游戏，与好友一较高下。",
      browseGames: "浏览游戏",
      lineupTitle: "小游戏阵容",
    },
    language: { label: "语言", ko: "한국어", en: "English", ja: "日本語", zh: "简体中文" },
  },
};
