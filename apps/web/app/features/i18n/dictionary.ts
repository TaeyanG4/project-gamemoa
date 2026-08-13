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
  loginModal: {
    title: string;
    subtitle: string;
    close: string;
    googleButton: string;
    googleLoading: string;
    googleUnconfigured: string;
    discordButton: string;
    discordLoading: string;
    discordUnconfigured: string;
  };
  games: {
    eyebrow: string;
    title: string;
    countSuffix: string;
    searchPlaceholder: string;
    emptyFavorites: string;
    emptySearch: string;
  };
  ranking: {
    eyebrow: string;
    title: string;
    subtitle: string;
    gameTab: string;
    xpTab: string;
    creatorTab: string;
    allCategories: string;
    allPlatforms: string;
    scoreMode: string;
    xpMode: string;
    rankHeader: string;
    playerHeader: string;
    streamerHeader: string;
    categoryHeader: string;
    recordHeader: string;
    dateHeader: string;
    levelHeader: string;
    totalXpHeader: string;
    recordOrCategory: string;
    activityLevel: string;
    badgeHeader: string;
    platformHeader: string;
    emptyGames: string;
    emptyXp: string;
    emptyCreatorTitle: string;
    emptyCreatorBody: string;
    retryButton: string;
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
    loginModal: {
      title: "GAMEMOA 소셜 로그인",
      subtitle: "원하는 소셜 계정을 클릭하면 안전하게 로그인됩니다.",
      close: "닫기",
      googleButton: "Google 계정으로 로그인",
      googleLoading: "Google 로그인 중...",
      googleUnconfigured: "Google 로그인이 아직 설정되지 않았습니다.",
      discordButton: "Discord 계정으로 로그인",
      discordLoading: "Discord 로그인 중...",
      discordUnconfigured: "Discord 로그인이 아직 설정되지 않았습니다.",
    },
    games: {
      eyebrow: "Game Collection",
      title: "전체 미니게임",
      countSuffix: "개의 가벼운 미니게임이 준비되어 있습니다.",
      searchPlaceholder: "게임 검색...",
      emptyFavorites: "아직 즐겨찾기한 게임이 없습니다.",
      emptySearch: "검색 결과와 일치하는 게임이 없습니다.",
    },
    ranking: {
      eyebrow: "Leaderboard & Community Hall of Fame",
      title: "명예의 전당",
      subtitle: "최고 기록, 유저 활동 레벨, 그리고 검증된 스트리머 랭킹입니다.",
      gameTab: "게임 랭킹",
      xpTab: "경험치 랭킹",
      creatorTab: "스트리머 랭킹",
      allCategories: "전체 종목",
      allPlatforms: "전체 플랫폼",
      scoreMode: "게임 점수",
      xpMode: "경험치 (XP)",
      rankHeader: "순위",
      playerHeader: "플레이어",
      streamerHeader: "스트리머",
      categoryHeader: "종목",
      recordHeader: "기록",
      dateHeader: "달성일",
      levelHeader: "레벨",
      totalXpHeader: "총 경험치",
      recordOrCategory: "기록 / 종목",
      activityLevel: "활동 레벨 (XP)",
      badgeHeader: "뱃지",
      platformHeader: "플랫폼",
      emptyGames: "아직 등록된 기록이 없습니다. 첫 기록의 주인공이 되어보세요.",
      emptyXp: "아직 활동 내역이 있는 유저가 없습니다.",
      emptyCreatorTitle: "아직 검증된 스트리머 기록이 없습니다",
      emptyCreatorBody:
        "GAMEMOA 크리에이터 채널 소유권 인증 서비스가 준비 중입니다. 인증된 크리에이터의 게임 최고 기록과 활동 XP가 여기에 게시됩니다.",
      retryButton: "다시 시도",
    },
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
    loginModal: {
      title: "Sign in to GAMEMOA",
      subtitle: "Pick a social account to sign in securely.",
      close: "Close",
      googleButton: "Continue with Google",
      googleLoading: "Signing in with Google...",
      googleUnconfigured: "Google sign-in isn't configured yet.",
      discordButton: "Continue with Discord",
      discordLoading: "Signing in with Discord...",
      discordUnconfigured: "Discord sign-in isn't configured yet.",
    },
    games: {
      eyebrow: "Game Collection",
      title: "All Mini-Games",
      countSuffix: "lightweight mini-games ready to play.",
      searchPlaceholder: "Search games...",
      emptyFavorites: "You haven't favorited any games yet.",
      emptySearch: "No games match your search.",
    },
    ranking: {
      eyebrow: "Leaderboard & Community Hall of Fame",
      title: "Hall of Fame",
      subtitle: "Top records, player activity levels, and verified streamer rankings.",
      gameTab: "Game Ranking",
      xpTab: "XP Ranking",
      creatorTab: "Streamer Ranking",
      allCategories: "All Games",
      allPlatforms: "All Platforms",
      scoreMode: "Game Score",
      xpMode: "Experience (XP)",
      rankHeader: "Rank",
      playerHeader: "Player",
      streamerHeader: "Streamer",
      categoryHeader: "Game",
      recordHeader: "Record",
      dateHeader: "Date",
      levelHeader: "Level",
      totalXpHeader: "Total XP",
      recordOrCategory: "Record / Game",
      activityLevel: "Activity Level (XP)",
      badgeHeader: "Badge",
      platformHeader: "Platform",
      emptyGames: "No records yet. Be the first to set one.",
      emptyXp: "No users with activity yet.",
      emptyCreatorTitle: "No verified streamers yet",
      emptyCreatorBody:
        "GAMEMOA's creator channel ownership verification is being rolled out. Verified creators' best game records and activity XP will appear here.",
      retryButton: "Retry",
    },
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
    loginModal: {
      title: "GAMEMOA にログイン",
      subtitle: "ソーシャルアカウントを選ぶと安全にログインできます。",
      close: "閉じる",
      googleButton: "Googleアカウントでログイン",
      googleLoading: "Googleでログイン中...",
      googleUnconfigured: "Googleログインはまだ設定されていません。",
      discordButton: "Discordアカウントでログイン",
      discordLoading: "Discordでログイン中...",
      discordUnconfigured: "Discordログインはまだ設定されていません。",
    },
    games: {
      eyebrow: "Game Collection",
      title: "全ミニゲーム",
      countSuffix: "個の軽量ミニゲームが用意されています。",
      searchPlaceholder: "ゲームを検索...",
      emptyFavorites: "まだお気に入りのゲームがありません。",
      emptySearch: "検索結果に一致するゲームがありません。",
    },
    ranking: {
      eyebrow: "Leaderboard & Community Hall of Fame",
      title: "殿堂入り",
      subtitle: "最高記録、ユーザー活動レベル、認証済みストリーマーランキングです。",
      gameTab: "ゲームランキング",
      xpTab: "経験値ランキング",
      creatorTab: "ストリーマーランキング",
      allCategories: "全種目",
      allPlatforms: "全プラットフォーム",
      scoreMode: "ゲームスコア",
      xpMode: "経験値 (XP)",
      rankHeader: "順位",
      playerHeader: "プレイヤー",
      streamerHeader: "ストリーマー",
      categoryHeader: "種目",
      recordHeader: "記録",
      dateHeader: "達成日",
      levelHeader: "レベル",
      totalXpHeader: "総経験値",
      recordOrCategory: "記録 / 種目",
      activityLevel: "活動レベル (XP)",
      badgeHeader: "バッジ",
      platformHeader: "プラットフォーム",
      emptyGames: "まだ登録された記録がありません。最初の記録に挑戦しましょう。",
      emptyXp: "まだ活動履歴のあるユーザーがいません。",
      emptyCreatorTitle: "まだ認証済みストリーマーがいません",
      emptyCreatorBody:
        "GAMEMOAクリエイターチャンネル所有権認証サービスを準備中です。認証済みクリエイターのゲーム最高記録と活動XPがここに表示されます。",
      retryButton: "再試行",
    },
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
    loginModal: {
      title: "登录 GAMEMOA",
      subtitle: "选择一个社交账号即可安全登录。",
      close: "关闭",
      googleButton: "使用 Google 账号登录",
      googleLoading: "正在使用 Google 登录...",
      googleUnconfigured: "Google 登录尚未配置。",
      discordButton: "使用 Discord 账号登录",
      discordLoading: "正在使用 Discord 登录...",
      discordUnconfigured: "Discord 登录尚未配置。",
    },
    games: {
      eyebrow: "Game Collection",
      title: "全部小游戏",
      countSuffix: "款轻量小游戏已就绪。",
      searchPlaceholder: "搜索游戏...",
      emptyFavorites: "还没有收藏的游戏。",
      emptySearch: "没有匹配的游戏。",
    },
    ranking: {
      eyebrow: "Leaderboard & Community Hall of Fame",
      title: "名人堂",
      subtitle: "最高记录、用户活动等级，以及认证主播排行榜。",
      gameTab: "游戏排行",
      xpTab: "经验排行",
      creatorTab: "主播排行",
      allCategories: "全部项目",
      allPlatforms: "全部平台",
      scoreMode: "游戏分数",
      xpMode: "经验值 (XP)",
      rankHeader: "排名",
      playerHeader: "玩家",
      streamerHeader: "主播",
      categoryHeader: "项目",
      recordHeader: "记录",
      dateHeader: "达成日期",
      levelHeader: "等级",
      totalXpHeader: "总经验值",
      recordOrCategory: "记录 / 项目",
      activityLevel: "活动等级 (XP)",
      badgeHeader: "徽章",
      platformHeader: "平台",
      emptyGames: "暂无记录，成为第一个创造记录的人吧。",
      emptyXp: "暂无活跃用户。",
      emptyCreatorTitle: "暂无认证主播",
      emptyCreatorBody:
        "GAMEMOA 创作者频道所有权认证服务正在筹备中。认证创作者的游戏最高记录和活动 XP 将显示在这里。",
      retryButton: "重试",
    },
  },
};
