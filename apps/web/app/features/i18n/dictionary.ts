import type { SupportedLocale } from "@owogg/contracts";

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
    platformChzzk: string;
    platformSoop: string;
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
    rank1: string;
    rank2: string;
    rank3: string;
  };
  profile: {
    myProfileTab: string;
    recordsTab: string;
    joinedLabel: string;
    logout: string;
    favoritesTitle: string;
    emptyFavorites: string;
    recentPlaysTitle: string;
    achievementsTitle: string;
    emptyAchievements: string;
    noRecordLabel: string;
    deviceRecordLabel: string;
    noRecordYetHint: string;
    justNow: string;
    minutesAgoSuffix: string;
    hoursAgoSuffix: string;
    daysAgoSuffix: string;
    linkSuccess: string;
    alreadyLinkedAccount: string;
    linkError: string;
    creatorVerifySuccess: string;
    creatorVerifyConflict: string;
    creatorVerifyUnconfigured: string;
    creatorVerifyUnauthorized: string;
    creatorVerifyError: string;
    googleScriptNotReady: string;
    googleLinkSuccess: string;
    googleAccountInUse: string;
    googleAlreadyLinked: string;
    googleLinkFailed: string;
    unlinkSuccessSuffix: string;
    lastAuthProviderError: string;
    unlinkFailed: string;
    mergeCompleted: string;
    nicknameUpdated: string;
    nicknameCooldownPrefix: string;
    nicknameCooldownSuffix: string;
    nicknameUpdateFailed: string;
    countryUpdated: string;
    countryCooldownPrefix: string;
    countryCooldownSuffix: string;
    countryUpdateFailed: string;
    loginRequiredTitle: string;
    loginRequiredBody: string;
    loginRequiredCta: string;
    backButton: string;
    levelLabel: string;
    globalXpRankPrefix: string;
    totalXpPrefix: string;
    settingsTitle: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    changeButton: string;
    countryLabel: string;
    countryHint: string;
    countryNotSet: string;
    itemsCountSuffix: string;
    emptyRecentPlays: string;
    connectedAccountsTitle: string;
    linkedStatus: string;
    notLinkedStatus: string;
    unlinkButton: string;
    linkButton: string;
    creatorVerificationTitle: string;
    creatorVerificationSubtitle: string;
    ownershipVerified: string;
    unverified: string;
    verifiedConfirmedText: string;
    audienceCountLabel: string;
    audienceUnit: string;
    metricsSyncedPrefix: string;
    verifyChannelCta: string;
    verifyUnavailable: string;
    featuredReviewStatusTitle: string;
    featuredCreatorLabel: string;
    featuredSelectedSuffix: string;
    featuredHint: string;
    achievedSuffix: string;
    myGameRecordsTitle: string;
    challengeSuffix: string;
    viewFullRankingArrow: string;
    reviewNotStarted: string;
    autoReviewPending: string;
    nextReviewPrefix: string;
    notEligible: string;
    manualReviewNeeded: string;
    autoReviewFailed: string;
    nextRetryPrefix: string;
  };
  discord: {
    heroTitle1: string;
    heroTitle2: string;
    heroSubtitle: string;
    installCta: string;
    setupCta: string;
    searchCta: string;
    registerCta: string;
    guideCta: string;
    managedServersTitle: string;
    exploreAll: string;
    loadingServers: string;
    noManagedServers: string;
    loginRequired: string;
    registerPrompt: string;
    registerStart: string;
    publicPage: string;
    manageServer: string;
    registeredLabel: string;
    weeklyRankingTitle: string;
    loadingRanking: string;
    emptyWeeklyRanking: string;
    guideTitle: string;
    guideStep1: string;
    guideStep2: string;
    guideStep3: string;
    accountLinkTitle: string;
    accountLinkBody: string;
    accountLinkCta: string;
    usageGuideCta: string;
  };
  discordSetup: {
    eyebrow: string;
    title: string;
    subtitle: string;
    step1Title: string;
    step1Description: string;
    checkingInstallLink: string;
    installLinkUnavailable: string;
    installNote: string;
    step2Title: string;
    step2Description: string;
    checking: string;
    owoggLoginCta: string;
    linkedNote1: string;
    linkedNote2: string;
    linkAccountCta: string;
    step3Title: string;
    step3Description: string;
    loginFirst: string;
    alreadyRegisteredPrefix: string;
    alreadyRegisteredSuffix: string;
    registerStartCta: string;
    viewServerDirectory: string;
    step4Title: string;
    step4Description: string;
    notShowingUp: string;
    troubleshootingGuide: string;
    checkSuffix: string;
    step5Title: string;
    step5Description: string;
    viewFullGuide: string;
    footerNote1: string;
    discordWikiLink: string;
    footerNote2: string;
    badgeDone: string;
    badgeTodo: string;
    badgeUnknown: string;
  };
  discordGuide: {
    eyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    installCta: string;
    installLinkHint: string;
    serverDirectoryCta: string;
    stepsAriaLabel: string;
    step1Title: string;
    step1Text: string;
    step2Title: string;
    step2Text: string;
    step3Title: string;
    step3Text: string;
    installGuideTitle: string;
    installGuideP1: string;
    installGuideP2: string;
    installGuideP3: string;
    accountGuideTitle: string;
    accountStep1Prefix: string;
    accountStep1Suffix: string;
    accountStep2: string;
    accountStep3: string;
    openLinkPageCta: string;
    registerTitle: string;
    registerSubtitle: string;
    registerStep1: string;
    registerStep2: string;
    registerStep3: string;
    registerStep4: string;
    registerDirectoryCta: string;
    xpTitle: string;
    xpSubtitle: string;
    xpGlobalTitle: string;
    xpGlobalText: string;
    xpGuildATitle: string;
    xpGuildAText: string;
    xpGuildBTitle: string;
    xpGuildBText: string;
    antiAbuseLabel: string;
    antiAbuseText: string;
    commandsTitle: string;
    commandGamesDesc: string;
    commandLinkDesc: string;
    commandProfileDesc: string;
    commandPlayDesc: string;
    commandRankDesc: string;
    commandLeaderboardDesc: string;
    commandServerDesc: string;
    rankingGuideTitle: string;
    rankingGuideP1: string;
    rankingGuideP2: string;
    viewFullRankingCta: string;
    helpGuideTitle: string;
    helpP1: string;
    helpP2: string;
    helpP3: string;
    faqTitle: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
    faq4Q: string;
    faq4A: string;
    footerNote: string;
    footerHubCta: string;
  };
  discordServers: {
    pageTitle: string;
    pageSubtitle: string;
    registerCta: string;
    searchPlaceholder: string;
    searchButton: string;
    statusNoGuilds: string;
    statusUnauthorized: string;
    statusError: string;
    candidateLoadError: string;
    guildListFetchError: string;
    registerFailError: string;
    modalTitle: string;
    successTitle: string;
    viewPublicPage: string;
    manageServer: string;
    step1Label: string;
    step2Label: string;
    slugPlaceholder: string;
    step3Label: string;
    cancelButton: string;
    submittingButton: string;
    submitButton: string;
    totalCountPrefix: string;
    totalCountSuffix: string;
    searchTermLabel: string;
    loadingList: string;
    emptyResultsTitle: string;
    emptyResultsHint: string;
    owoggServerLabel: string;
    viewPageArrow: string;
  };
  discordServerSlug: {
    loadFailedGeneric: string;
    loadingServer: string;
    privateServerTitle: string;
    notFoundTitle: string;
    privateServerMessage: string;
    backToDirectory: string;
    manageServerCta: string;
    participantsLabel: string;
    participantsUnit: string;
    participantsHint: string;
    totalXpLabel: string;
    totalXpHint: string;
    weeklyXpLabel: string;
    weeklyXpHint: string;
    leaderboardTitle: string;
    tabAlltime: string;
    tabWeekly: string;
    tabGames: string;
    emptyAlltimeTitle: string;
    emptyAlltimeHintPrefix: string;
    emptyAlltimeHintSuffix: string;
    emptyWeeklyTitle: string;
    emptyWeeklyHint: string;
    loadingGame: string;
    emptyGameScoreSuffix: string;
    emptyGameHintPrefix: string;
    emptyGameHintSuffix: string;
    infoCardTitle: string;
    statusLabel: string;
    visibilityLabel: string;
  };
  discordServerManage: {
    noPermissionError: string;
    saveFailedError: string;
    unregisterFailedError: string;
    loadingManageInfo: string;
    accessDeniedTitle: string;
    backToDirectory: string;
    manageTitleSuffix: string;
    manageSubtitle: string;
    publicPageArrow: string;
    saveSuccessMessage: string;
    slugLabel: string;
    slugHintPrefix: string;
    slugHintSuffix: string;
    visibilityLabel: string;
    visibilityPublicDesc: string;
    visibilityUnlistedDesc: string;
    visibilityPrivateDesc: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    savingButton: string;
    saveButton: string;
    dangerZoneTitle: string;
    dangerZoneText: string;
    unregisterButton: string;
    unregisterConfirmTitle: string;
    unregisterConfirmBodySuffix: string;
    cancelButton: string;
    unregisteringButton: string;
    confirmUnregisterButton: string;
  };
  discordLink: {
    checkingLinkInfo: string;
    invalidTitle: string;
    invalidBodyPrefix: string;
    invalidBodySuffix: string;
    linkingInProgress: string;
    errorTitle: string;
    genericErrorMessage: string;
    alreadyLinkedTitle: string;
    linkedTitle: string;
    successBodyPrefix: string;
    successBodySuffix: string;
    goToProfileCta: string;
    linkAccountTitle: string;
    confirmPromptPrefix: string;
    confirmPromptSuffix: string;
    loginRequiredHint: string;
    loginCta: string;
    linkCta: string;
  };
  wiki: {
    navGettingStarted: string;
    navDiscordOverview: string;
    navDiscordInstall: string;
    navDiscordAccountLink: string;
    navDiscordServerRegistration: string;
    navDiscordCommands: string;
    navDiscordXp: string;
    navDiscordTroubleshooting: string;
    navAccount: string;
    navAccountOverview: string;
    navAccountMerge: string;
    navGamesRanking: string;
    navGamesOverview: string;
    navRanking: string;
    navGamesXp: string;
    navCreatorOverview: string;
    navCreatorVerification: string;
    navCreatorFeatured: string;
    tocAriaLabel: string;
    homeTitle: string;
    homeSubtitle: string;
    homeInstallPrompt: string;
    homeInstallGuideLink: string;
    homeInstallGuideSuffix: string;
    catDiscordDesc: string;
    catGettingStartedDesc: string;
    catAccountDesc: string;
    catGamesDesc: string;
    catCreatorDesc: string;
  };
  /** Wiki article bodies. Split from `wiki` (which holds the shell: nav, home, category cards)
   * so each article's prose stays grouped by page. Sentences that wrap an inline <b>/<Link>
   * are split into ...Prefix/...Strong/...Suffix parts rather than embedding markup in the
   * string — same approach `wiki.homeInstallPrompt`/`homeInstallGuideLink` already uses. */
  wikiBody: {
    creator: {
      title: string;
      description: string;
      intro: string;
      cardVerification: string;
      cardVerificationDesc: string;
      cardFeatured: string;
      cardFeaturedDesc: string;
      profileHint: string;
      profileLink: string;
    };
    creatorVerification: {
      title: string;
      description: string;
      platformsHeading: string;
      conditionsHeading: string;
      condOnePrefix: string;
      condOneStrong: string;
      condOneSuffix: string;
      condNoMinimum: string;
      condOauthOnly: string;
      condOneChannelOneAccount: string;
      methodHeading: string;
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      calloutLoginStrong: string;
      calloutLoginBody: string;
      calloutDuplicate: string;
      footerPrefix: string;
      footerStrong: string;
      footerMid: string;
      footerLink: string;
      footerSuffix: string;
    };
    creatorFeatured: {
      title: string;
      description: string;
      conceptHeading: string;
      conceptCreatorTerm: string;
      conceptCreatorDesc: string;
      conceptFeaturedTerm: string;
      conceptFeaturedDesc: string;
      reviewHeading: string;
      reviewBody: string;
      calloutNoRankImpactStrong: string;
      calloutNoRankImpactBody: string;
      calloutTestingPhase: string;
      footerNote: string;
    };
    account: {
      title: string;
      description: string;
      loginHeading: string;
      loginBody: string;
      profileHeading: string;
      profileBody: string;
      profileLink: string;
      calloutPrefix: string;
      calloutLink: string;
      calloutSuffix: string;
    };
    accountMerge: {
      title: string;
      description: string;
      howHeading: string;
      howBodyPrefix: string;
      howBodyPrimary: string;
      howBodySuffix: string;
      stepsHeading: string;
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      step5: string;
      calloutNoMergeStrong: string;
      calloutNoMergeBody: string;
      calloutAdminStrong: string;
      calloutAdminBody: string;
      footerPrefix: string;
      footerLink: string;
      footerSuffix: string;
    };
    games: {
      title: string;
      description: string;
      intro: string;
      cardRanking: string;
      cardRankingDesc: string;
      cardXp: string;
      cardXpDesc: string;
      footerPrefix: string;
      footerLink: string;
      footerSuffix: string;
    };
    gamesRanking: {
      title: string;
      description: string;
      gameHeading: string;
      gameBody: string;
      xpHeading: string;
      xpBodyPrefix: string;
      xpBodyLink: string;
      xpBodySuffix: string;
      streamerHeading: string;
      streamerBodyPrefix: string;
      streamerBodyStrong: string;
      streamerBodySuffix: string;
      streamerLinkPrefix: string;
      streamerLink: string;
      streamerLinkSuffix: string;
      calloutFeatured: string;
      footerPrefix: string;
      footerLink: string;
      footerSuffix: string;
    };
    gamesXp: {
      title: string;
      description: string;
      grantHeading: string;
      grantPerPlay: string;
      grantDailyCap: string;
      grantAfterCap: string;
      formulaHeading: string;
      formulaPrefix: string;
      formulaSuffix: string;
      calloutPrefix: string;
      calloutLink: string;
      calloutSuffix: string;
      footerPrefix: string;
      footerProfileLink: string;
      footerMid: string;
      footerRankingLink: string;
      footerSuffix: string;
    };
    gettingStarted: {
      title: string;
      description: string;
      flowHeading: string;
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      step5: string;
      calloutGuest: string;
      cardCatalog: string;
      cardCatalogDesc: string;
      cardRanking: string;
      cardRankingDesc: string;
      footerPrefix: string;
      footerDiscordLink: string;
      footerMid: string;
      footerAccountLink: string;
      footerSuffix: string;
    };
  };
  platformIcon: {
    chzzkLabel: string;
    soopLabel: string;
    channelSuffix: string;
    verifiedPlatforms: string;
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
      title: "OwOGG 소셜 로그인",
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
      platformChzzk: "치지직 (CHZZK)",
      platformSoop: "SOOP (아프리카)",
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
        "OwOGG 크리에이터 채널 소유권 인증 서비스가 준비 중입니다. 인증된 크리에이터의 게임 최고 기록과 활동 XP가 여기에 게시됩니다.",
      retryButton: "다시 시도",
      rank1: "1위",
      rank2: "2위",
      rank3: "3위",
    },
    profile: {
      myProfileTab: "내 프로필",
      recordsTab: "기록",
      joinedLabel: "가입일",
      logout: "로그아웃",
      favoritesTitle: "즐겨찾기",
      emptyFavorites:
        "아직 즐겨찾기한 게임이 없습니다. 게임 카드의 북마크 아이콘을 눌러 추가해보세요.",
      recentPlaysTitle: "최근 플레이",
      achievementsTitle: "도전과제",
      emptyAchievements:
        "아직 달성한 도전과제가 없습니다. 게임을 플레이하고 즐겨찾기를 추가해보세요!",
      noRecordLabel: "계정 기록 없음",
      deviceRecordLabel: "기기 기록",
      noRecordYetHint: "아직 기록이 없어요 — 지금 도전해보세요!",
      justNow: "방금 전",
      minutesAgoSuffix: "분 전",
      hoursAgoSuffix: "시간 전",
      daysAgoSuffix: "일 전",
      linkSuccess: "로그인 수단이 연결되었습니다.",
      alreadyLinkedAccount: "이미 연결된 계정입니다.",
      linkError: "로그인 수단 연결 중 오류가 발생했습니다.",
      creatorVerifySuccess: "크리에이터 채널 소유권 인증이 완료되었습니다.",
      creatorVerifyConflict: "이 채널은 이미 다른 OwOGG 크리에이터 계정에 연동되어 있습니다.",
      creatorVerifyUnconfigured: "현재 해당 플랫폼 인증을 사용할 수 없습니다.",
      creatorVerifyUnauthorized: "로그인이 만료되었습니다. 다시 로그인 해주세요.",
      creatorVerifyError: "크리에이터 채널 인증 중 오류가 발생했습니다.",
      googleScriptNotReady: "Google 로그인 스크립트가 준비되지 않았습니다.",
      googleLinkSuccess: "Google 로그인이 연결되었습니다.",
      googleAccountInUse: "이 Google 계정은 이미 다른 OwOGG 계정으로 사용 중입니다.",
      googleAlreadyLinked: "이 계정에는 이미 Google 로그인이 연결되어 있습니다.",
      googleLinkFailed: "Google 연결에 실패했습니다.",
      unlinkSuccessSuffix: "연결이 해제되었습니다.",
      lastAuthProviderError: "마지막 로그인 수단은 해제할 수 없습니다.",
      unlinkFailed: "연결 해제에 실패했습니다.",
      mergeCompleted: "계정 통합이 완료되었습니다.",
      nicknameUpdated: "닉네임이 변경되었습니다.",
      nicknameCooldownPrefix: "닉네임은",
      nicknameCooldownSuffix: "이후 다시 변경할 수 있습니다.",
      nicknameUpdateFailed: "닉네임 변경에 실패했습니다.",
      countryUpdated: "국가/지역이 변경되었습니다.",
      countryCooldownPrefix: "국가/지역은",
      countryCooldownSuffix: "이후 다시 변경할 수 있습니다.",
      countryUpdateFailed: "국가/지역 변경에 실패했습니다.",
      loginRequiredTitle: "로그인이 필요한 페이지입니다",
      loginRequiredBody: "구글 또는 디스코드 계정으로 로그인하고 내 게임 기록을 관리하세요.",
      loginRequiredCta: "로그인하기",
      backButton: "이전으로 돌아가기",
      levelLabel: "레벨",
      globalXpRankPrefix: "전체 XP 랭킹 #",
      totalXpPrefix: "총 ",
      settingsTitle: "프로필 설정",
      nicknameLabel: "닉네임",
      nicknamePlaceholder: "닉네임을 입력하세요",
      changeButton: "변경",
      countryLabel: "국가/지역",
      countryHint: "(선택, 자기 신고 정보이며 국적 인증이 아닙니다)",
      countryNotSet: "설정 안 함",
      itemsCountSuffix: "개",
      emptyRecentPlays: "아직 플레이 기록이 없습니다. 게임을 플레이하면 여기에 표시돼요.",
      connectedAccountsTitle: "연결된 로그인 계정",
      linkedStatus: "연결됨",
      notLinkedStatus: "연결 안 됨",
      unlinkButton: "연결 해제",
      linkButton: "연결",
      creatorVerificationTitle: "크리에이터 채널 소유권 인증",
      creatorVerificationSubtitle:
        "공식 OAuth / API를 통해 해당 채널을 직접 소유하고 있음을 검증합니다. (셀프 텍스트 입력 및 웹 스크래핑 금지)",
      ownershipVerified: "소유권 인증됨",
      unverified: "미인증",
      verifiedConfirmedText: "✓ OwOGG가 해당 사용자의 채널 소유권을 공식 API로 확인했습니다.",
      audienceCountLabel: "구독자/팔로워",
      audienceUnit: "명",
      metricsSyncedPrefix: "· 지표 동기화",
      verifyChannelCta: "채널 소유권 인증",
      verifyUnavailable: "현재 인증을 사용할 수 없습니다",
      featuredReviewStatusTitle: "Featured 심사 상태",
      featuredCreatorLabel: "★ Featured Creator",
      featuredSelectedSuffix: "선정",
      featuredHint:
        "Featured는 공식 채널 지표 기반 자격(구독자/팔로워 12,000+ · 채널 120일+)이며 게임 점수·XP·랭킹 순위에는 영향을 주지 않습니다.",
      achievedSuffix: "달성",
      myGameRecordsTitle: "내 게임별 최고 기록",
      challengeSuffix: "도전",
      viewFullRankingArrow: "전체 랭킹 보기 →",
      reviewNotStarted: "채널 소유권 인증 완료 후 자동 심사가 시작됩니다. (약 6시간 후 첫 심사)",
      autoReviewPending: "자동 심사 대기 중",
      nextReviewPrefix: "(다음 심사",
      notEligible: "현재 기준 미달",
      manualReviewNeeded: "추가 확인 필요",
      autoReviewFailed: "자동 심사 일시 실패 (재시도 대기)",
      nextRetryPrefix: "— 다음 재시도",
    },
    discord: {
      heroTitle1: "친구들과 게임 기록을",
      heroTitle2: "경쟁하고 소통하세요",
      heroSubtitle:
        "OwOGG Discord Bot을 내 서버에 등록하고 커뮤니티 전용 리더보드와 서버 전용 페이지를 구축하세요.",
      installCta: "Discord에 OwOGG 추가",
      setupCta: "🧭 설치 가이드 (5단계)",
      searchCta: "🔍 서버 검색",
      registerCta: "⚡ 내 서버 등록 (관리자 권한)",
      guideCta: "📖 Discord 이용 가이드",
      managedServersTitle: "🛡️ 내가 관리하는 등록 서버",
      exploreAll: "전체 탐색 →",
      loadingServers: "서버 목록 불러오는 중...",
      noManagedServers: "관리 중인 등록 서버가 없습니다",
      loginRequired: "로그인이 필요합니다",
      registerPrompt: "Discord 관리자 권한이 있는 서버를 OwOGG에 등록하여 커뮤니티를 시작해보세요.",
      registerStart: "서버 등록 시작하기",
      publicPage: "공개 페이지",
      manageServer: "서버 관리",
      registeredLabel: "등록일",
      weeklyRankingTitle: "이번 주 서버 활동 랭킹",
      loadingRanking: "랭킹 불러오는 중...",
      emptyWeeklyRanking: "이번 주 등록된 서버 활동이 없습니다",
      guideTitle: "📌 이용 안내",
      guideStep1: "서버 등록은 Discord 관리자(MANAGE_GUILD) 권한을 가진 유저만 가능합니다.",
      guideStep2: "공개(PUBLIC) 등록 시 OwOGG 디렉토리 및 검색에 노출됩니다.",
      guideStep3: "/owogg play로 게임을 플레이하면 이 서버에 XP가 기여되며 주간 랭킹에 집계됩니다.",
      accountLinkTitle: "🔗 Discord 계정 연동",
      accountLinkBody:
        "OwOGG 계정과 Discord 계정을 연동하면 봇 커맨드(/owogg profile)에서 본인 정보를 확인할 수 있습니다.",
      accountLinkCta: "계정 연동 페이지 이동",
      usageGuideCta: "Discord 사용 방법 보기",
    },
    discordSetup: {
      eyebrow: "OwOGG × Discord",
      title: "Discord 설치 가이드",
      subtitle:
        "아래 5단계만 따라 하면 서버에서 바로 OwOGG를 사용할 수 있습니다. Bot Token, Application ID 같은 값은 필요 없습니다 — 그런 값은 OwOGG 운영진만 다룹니다.",
      step1Title: "Discord에 OwOGG 추가",
      step1Description: "서버 관리자 권한이 있는 계정으로 Discord 앱을 서버에 설치합니다.",
      checkingInstallLink: "설치 링크 확인 중...",
      installLinkUnavailable:
        "설치 링크가 아직 준비되지 않았습니다. 서버 관리자에게 공식 설치 링크를 문의하세요.",
      installNote:
        "Discord 앱 설치는 OwOGG 서버 등록(3단계)과 다릅니다 — 설치만으로 서버가 자동 등록되지 않습니다.",
      step2Title: "Discord 계정 연결",
      step2Description:
        "Discord 봇 명령어에서 본인 OwOGG 정보를 사용할 수 있도록 계정을 연결합니다.",
      checking: "확인 중...",
      owoggLoginCta: "OwOGG 로그인",
      linkedNote1: "연결되었습니다. Discord에서",
      linkedNote2: "을 사용할 수 있습니다.",
      linkAccountCta: "계정 연결 페이지 이동",
      step3Title: "서버 등록",
      step3Description:
        "Discord 서버 관리(MANAGE_GUILD) 권한이 있는 서버를 OwOGG 커뮤니티로 등록합니다.",
      loginFirst: "먼저 OwOGG에 로그인해주세요.",
      alreadyRegisteredPrefix: "이미 ",
      alreadyRegisteredSuffix: "개 서버를 등록/관리하고 있습니다.",
      registerStartCta: "서버 등록 시작",
      viewServerDirectory: "서버 디렉토리 보기",
      step4Title: "/owogg games 테스트",
      step4Description: "Discord 채널에서 슬래시 명령어가 정상적으로 자동완성되는지 확인합니다.",
      notShowingUp: "자동완성에 나오지 않으면",
      troubleshootingGuide: "문제 해결 가이드",
      checkSuffix: "를 확인하세요.",
      step5Title: "/owogg play로 시작",
      step5Description: "이 서버에 귀속되는 플레이 링크를 발급받아 서버 XP를 쌓기 시작합니다.",
      viewFullGuide: "전체 이용 가이드 보기",
      footerNote1:
        "일반 사용자는 Bot Token, Application ID, Public Key를 입력할 필요가 없습니다. 더 자세한 설명은",
      discordWikiLink: "Discord Wiki",
      footerNote2: "에서 확인하세요.",
      badgeDone: "완료",
      badgeTodo: "진행 필요",
      badgeUnknown: "직접 확인",
    },
    discordGuide: {
      eyebrow: "OwOGG × Discord",
      heroTitle: "Discord에서 OwOGG 사용하기",
      heroSubtitle:
        "서버에서 게임을 시작하고, 나의 활동을 서버 XP와 리더보드로 확인하세요. OwOGG는 상시 Gateway 봇이 아니라 서명된 HTTP Interactions로 동작합니다.",
      installCta: "Discord에 추가",
      installLinkHint: "설치 링크는 서버 관리자 안내를 확인하세요",
      serverDirectoryCta: "서버 디렉토리",
      stepsAriaLabel: "Discord 이용 핵심 단계",
      step1Title: "서버에 설치",
      step1Text: "Discord 앱 설치는 서버 사용 준비 단계입니다.",
      step2Title: "서버를 등록",
      step2Text: "관리 가능한 길드를 확인한 뒤 공개 여부를 직접 선택합니다.",
      step3Title: "게임을 시작",
      step3Text: "/owogg play 링크로 유효한 활동을 서버에 귀속합니다.",
      installGuideTitle: "서버에 설치하기",
      installGuideP1:
        "Discord Developer Portal에서 앱의 Installation 설정을 확인한 뒤 실제 설치 링크로 서버에 추가합니다.",
      installGuideP2:
        "설치 링크가 화면에 없으면 저장소가 권한이나 애플리케이션 설정을 확인할 수 없는 상태입니다. 임의 URL을 사용하지 말고 서버 운영자에게 공식 설치 링크를 요청하세요.",
      installGuideP3: "앱 설치만으로 OwOGG 공개 디렉토리에 서버가 게시되지 않습니다.",
      accountGuideTitle: "계정 연결하기",
      accountStep1Prefix: "Discord에서",
      accountStep1Suffix: "실행",
      accountStep2: "응답의 1회용 링크 열기",
      accountStep3: "OwOGG 로그인 후 연결 확인",
      openLinkPageCta: "연결 페이지 열기",
      registerTitle: "서버 등록하기",
      registerSubtitle: "관리자는 다음 순서로 OwOGG 서버 공간을 만듭니다.",
      registerStep1: "OwOGG 로그인",
      registerStep2: "공식 Discord 권한 확인",
      registerStep3: "길드 선택과 slug 설정",
      registerStep4: "PUBLIC / UNLISTED / PRIVATE 선택",
      registerDirectoryCta: "서버 디렉토리에서 시작",
      xpTitle: "서버 XP가 계산되는 방식",
      xpSubtitle: "글로벌 XP와 서버 XP는 같은 숫자를 복사하는 구조가 아닙니다.",
      xpGlobalTitle: "글로벌 XP",
      xpGlobalText: "OwOGG 전체 진행도",
      xpGuildATitle: "Guild A 사용자 XP",
      xpGuildAText: "A에서 만든 유효한 기여",
      xpGuildBTitle: "Guild B",
      xpGuildBText: "기존 XP가 자동 복사되지 않음",
      antiAbuseLabel: "어뷰징 방지:",
      antiAbuseText:
        "사용자×게임×UTC 하루 기준 글로벌 XP 지급은 최대 10회입니다. 상한에 도달하면 게임 완료는 가능하지만 추가 XP는 지급되지 않습니다.",
      commandsTitle: "명령어",
      commandGamesDesc: "플레이 가능한 게임 목록을 확인합니다.",
      commandLinkDesc: "Discord 계정과 OwOGG 계정을 연결합니다.",
      commandProfileDesc: "연결된 계정의 프로필, 레벨, 글로벌 XP를 확인합니다.",
      commandPlayDesc: "서버에 귀속되는 1회용 게임 플레이 링크를 만듭니다.",
      commandRankDesc: "현재 서버에서 나의 XP와 순위를 확인합니다.",
      commandLeaderboardDesc: "현재 서버 XP Top 10을 확인합니다.",
      commandServerDesc: "서버 전체 XP와 주간 활동을 확인합니다.",
      rankingGuideTitle: "서버 랭킹 보기",
      rankingGuideP1:
        "서버 페이지에서 서버 XP, 주간 서버 XP, 게임별 서버 참여자 기록을 확인할 수 있습니다.",
      rankingGuideP2:
        "공개 전역 서버 활동 랭킹에는 `PUBLIC` 활성 서버만 표시됩니다. 참여자 수는 OwOGG 활동을 만든 사용자 기준이며 Discord 전체 멤버 수가 아닙니다.",
      viewFullRankingCta: "OwOGG 전체 랭킹 보기",
      helpGuideTitle: "문제 해결",
      helpP1:
        "서버가 등록되지 않았다는 메시지가 나오면 관리자가 서버 등록을 완료했는지 확인하세요.",
      helpP2:
        "계정 연결 오류는 `/owogg link`를 새로 실행하고 만료되지 않은 링크로 다시 확인합니다.",
      helpP3: "Play 링크가 만료되었거나 이미 사용되었으면 새 링크를 발급해야 합니다.",
      faqTitle: "자주 묻는 질문",
      faq1Q: "앱을 설치하면 서버가 자동으로 공개되나요?",
      faq1A:
        "아니요. 앱 설치와 OwOGG 서버 등록은 별개입니다. 관리자가 웹에서 길드를 확인하고 가시성을 직접 선택해야 합니다.",
      faq2Q: "OwOGG가 Discord 서버의 모든 멤버를 가져오나요?",
      faq2A:
        "아니요. 공식 OAuth로 관리 가능한 길드를 확인하고, XP 랭킹에는 OwOGG 활동을 만든 참여자만 사용합니다.",
      faq3Q: "기존 글로벌 XP를 서버에 한 번에 가져올 수 있나요?",
      faq3A:
        "아니요. 새 Guild는 0에서 시작하며 `/owogg play`로 만든 유효한 완료만 서버에 귀속됩니다.",
      faq4Q: "상시 봇 프로세스를 실행해야 하나요?",
      faq4A:
        "v1에서는 필요하지 않습니다. Discord HTTP Interactions endpoint와 Cloudflare Worker가 요청을 처리합니다.",
      footerNote: "더 자세한 운영 절차는 Discord Bot 운영 가이드에서 확인하세요.",
      footerHubCta: "Discord Hub로 이동",
    },
    discordServers: {
      pageTitle: "🔍 Discord 서버 디렉토리",
      pageSubtitle: "OwOGG에 등록된 Discord 커뮤니티 서버를 탐색하거나 내 서버를 새로 등록하세요.",
      registerCta: "🏰 내 서버 등록하기",
      searchPlaceholder: "서버 이름 또는 vanity slug 검색...",
      searchButton: "검색",
      statusNoGuilds: "관리자(MANAGE_GUILD) 권한을 가진 Discord 서버를 찾을 수 없습니다.",
      statusUnauthorized: "서버 등록을 위해 로그인이 필요합니다.",
      statusError: "Discord 인증 중 오류가 발생했습니다. 다시 시도해 주세요.",
      candidateLoadError:
        "등록 가능한 서버 목록을 불러올 수 없습니다. 만료되었거나 이미 사용된 토큰입니다.",
      guildListFetchError: "서버 목록 조회 실패",
      registerFailError: "서버 등록 실패",
      modalTitle: "🏰 Discord 서버 등록",
      successTitle: "서버가 성공적으로 등록되었습니다!",
      viewPublicPage: "공개 페이지 보기",
      manageServer: "서버 관리하기",
      step1Label: "1. 등록할 서버 선택 (관리 중인 길드)",
      step2Label: "2. Vanity Slug 주소 설정 (옵션)",
      slugPlaceholder: "자동 생성 (영문 소문자, 숫자, -)",
      step3Label: "3. 가시성 선택",
      cancelButton: "취소",
      submittingButton: "등록 중...",
      submitButton: "서버 등록 완료",
      totalCountPrefix: "총 ",
      totalCountSuffix: "개의 공개 서버가 등록되어 있습니다.",
      searchTermLabel: "검색어:",
      loadingList: "서버 목록을 불러오는 중...",
      emptyResultsTitle: "검색 조건에 맞는 공개 서버가 없습니다.",
      emptyResultsHint: "다른 검색어로 찾아보거나 새로운 서버를 등록해보세요.",
      owoggServerLabel: "OwOGG 서버",
      viewPageArrow: "페이지 보기 →",
    },
    discordServerSlug: {
      loadFailedGeneric: "서버 정보를 불러올 수 없습니다.",
      loadingServer: "서버 정보를 불러오는 중...",
      privateServerTitle: "비공개(PRIVATE) 서버",
      notFoundTitle: "서버를 찾을 수 없습니다",
      privateServerMessage:
        "이 서버는 PRIVATE 가시성으로 설정되어 있으며, 권한을 가진 관리자만 접근할 수 있습니다.",
      backToDirectory: "← 디렉토리로 돌아가기",
      manageServerCta: "⚙️ 서버 관리",
      participantsLabel: "OwOGG 참여 멤버",
      participantsUnit: "명",
      participantsHint: "기여한 실적 유저 수",
      totalXpLabel: "서버 총 누적 XP",
      totalXpHint: "모든 게임 활동 합산",
      weeklyXpLabel: "이번 주 서버 XP",
      weeklyXpHint: "월요일 00:00 KST 기준",
      leaderboardTitle: "서버 리더보드",
      tabAlltime: "⚡ 서버 XP",
      tabWeekly: "📅 주간 XP",
      tabGames: "🎮 게임별 기록",
      emptyAlltimeTitle: "아직 이 서버에 누적된 XP가 없습니다",
      emptyAlltimeHintPrefix: "Discord 채널에서",
      emptyAlltimeHintSuffix: "명령어를 실행하여 게임에 기여해보세요!",
      emptyWeeklyTitle: "이번 주 이 서버에 누적된 XP가 없습니다",
      emptyWeeklyHint: "월요일 00:00 KST 이후 첫 플레이를 시작하여 주간 랭크를 차지해보세요!",
      loadingGame: "게임을 불러오는 중...",
      emptyGameScoreSuffix: "에 기록된 서버 멤버 스코어가 없습니다",
      emptyGameHintPrefix: "Discord 채널에서",
      emptyGameHintSuffix: "명령어로 도전해보세요!",
      infoCardTitle: "OwOGG 서버 정보",
      statusLabel: "상태",
      visibilityLabel: "가시성",
    },
    discordServerManage: {
      noPermissionError:
        "이 서버를 관리할 권한이 없습니다. Discord 관리자 계정으로 로그인되어 있는지 확인하세요.",
      saveFailedError: "설정 저장 실패",
      unregisterFailedError: "서버 해제 실패",
      loadingManageInfo: "서버 관리 정보를 불러오는 중...",
      accessDeniedTitle: "접근 권한 없음",
      backToDirectory: "← 디렉토리로 이동",
      manageTitleSuffix: "서버 관리",
      manageSubtitle:
        "공개/비공개 가시성, 커스텀 Vanity Slug 주소 및 설명 문구를 설정할 수 있습니다.",
      publicPageArrow: "공개 페이지 →",
      saveSuccessMessage: "설정이 성공적으로 저장되었습니다.",
      slugLabel: "Vanity Slug 주소 (영문 소문자, 숫자, -)",
      slugHintPrefix: "변경하더라도 Discord Guild ID(",
      slugHintSuffix: ") 자체는 변경되지 않습니다.",
      visibilityLabel: "서버 가시성 (Visibility)",
      visibilityPublicDesc: "검색 노출 및 공개 페이지 접속 가능",
      visibilityUnlistedDesc: "검색 미노출, 직링크 페이지 접속 가능",
      visibilityPrivateDesc: "검색 미노출, 관리자만 접근 가능",
      descriptionLabel: "서버 설명 문구",
      descriptionPlaceholder: "서버의 특징이나 커뮤니티 소개글을 입력하세요...",
      savingButton: "저장 중...",
      saveButton: "설정 저장",
      dangerZoneTitle: "위험 구역 (Danger Zone)",
      dangerZoneText:
        "서버 등록을 해제하면 OwOGG 디렉토리에서 제외되고 `DISABLED` 상태로 변경됩니다. (Discord 서버 자체에는 영향이 없습니다)",
      unregisterButton: "서버 등록 해제",
      unregisterConfirmTitle: "서버 등록을 해제하시겠습니까?",
      unregisterConfirmBodySuffix: "서버가 OwOGG 디렉토리 및 검색에서 제외됩니다.",
      cancelButton: "취소",
      unregisteringButton: "해제 중...",
      confirmUnregisterButton: "확인 (해제)",
    },
    discordLink: {
      checkingLinkInfo: "연동 정보를 확인하는 중...",
      invalidTitle: "유효하지 않은 연동 링크입니다",
      invalidBodyPrefix: "링크가 만료되었거나 이미 사용되었습니다. Discord 서버에서",
      invalidBodySuffix: "를 다시 실행해주세요.",
      linkingInProgress: "Discord 계정을 연동하는 중...",
      errorTitle: "연동에 실패했습니다",
      genericErrorMessage: "연동 중 오류가 발생했습니다.",
      alreadyLinkedTitle: "이미 연동되어 있습니다",
      linkedTitle: "Discord 계정이 연동되었습니다",
      successBodyPrefix: "이제 Discord에서",
      successBodySuffix: "명령어로 OwOGG 계정 정보를 확인할 수 있습니다.",
      goToProfileCta: "내 프로필로 이동",
      linkAccountTitle: "Discord 계정 연동",
      confirmPromptPrefix: "Discord 계정",
      confirmPromptSuffix: "을 현재 로그인한 OwOGG 계정과 연동하시겠습니까?",
      loginRequiredHint: "연동하려면 먼저 OwOGG에 로그인해주세요.",
      loginCta: "로그인하기",
      linkCta: "연동하기",
    },
    wiki: {
      navGettingStarted: "시작하기",
      navDiscordOverview: "Discord 개요",
      navDiscordInstall: "설치하기",
      navDiscordAccountLink: "계정 연결",
      navDiscordServerRegistration: "서버 등록",
      navDiscordCommands: "명령어",
      navDiscordXp: "서버 XP",
      navDiscordTroubleshooting: "문제 해결",
      navAccount: "계정",
      navAccountOverview: "계정 개요",
      navAccountMerge: "계정 통합",
      navGamesRanking: "게임과 랭킹",
      navGamesOverview: "게임 개요",
      navRanking: "랭킹",
      navGamesXp: "XP와 레벨",
      navCreatorOverview: "Creator 개요",
      navCreatorVerification: "채널 소유권 인증",
      navCreatorFeatured: "Featured Creator",
      tocAriaLabel: "Wiki 목차",
      homeTitle: "궁금한 걸 빠르게 찾아보세요",
      homeSubtitle:
        "Discord 설치부터 랭킹 계산 방식까지, OwOGG를 사용하는 데 필요한 모든 설명을 한곳에 모았습니다.",
      homeInstallPrompt: "더 빠른 Discord 설치가 필요하신가요?",
      homeInstallGuideLink: "5단계 설치 가이드",
      homeInstallGuideSuffix: "로 바로 이동하세요.",
      catDiscordDesc: "서버 설치, 계정 연결, 서버 등록, 명령어, 서버 XP, 문제 해결.",
      catGettingStartedDesc: "OwOGG 계정 만들기부터 첫 게임까지, 가장 빠른 시작 경로.",
      catAccountDesc: "로그인 방식, 프로필 설정, 여러 계정을 하나로 합치는 계정 통합.",
      catGamesDesc: "게임 카탈로그, 순위 계산 방식, 경험치(XP)와 레벨.",
      catCreatorDesc: "채널 소유권 인증, 스트리머 랭킹 자격, Featured Creator 기준.",
    },
    wikiBody: {
      creator: {
        title: "Creator 개요",
        description:
          "공식 OAuth/API로 채널 소유권을 검증한 스트리머/유튜버를 OwOGG Creator로 인정합니다.",
        intro:
          "Creator 인증은 게임 점수나 XP에 어떤 가산점도 주지 않습니다. 대신 명예의 전당의 스트리머 랭킹 탭 노출, 내 프로필의 검증 배지와 공식 채널 링크 표시라는 혜택을 제공합니다.",
        cardVerification: "채널 소유권 인증 →",
        cardVerificationDesc: "지원 플랫폼과 인증 방법",
        cardFeatured: "Featured Creator →",
        cardFeaturedDesc: "Featured 자격 기준",
        profileHint: "인증은 내 프로필 페이지에서 시작할 수 있습니다.",
        profileLink: "내 프로필로 이동",
      },
      creatorVerification: {
        title: "채널 소유권 인증",
        description:
          "공식 OAuth와 API만으로 소유권을 검증합니다. 텍스트 입력이나 스크래핑은 절대 사용하지 않습니다.",
        platformsHeading: "지원 플랫폼",
        conditionsHeading: "인증 조건",
        condOnePrefix: "위 4개 플랫폼(YouTube · CHZZK · SOOP · Twitch) 중 ",
        condOneStrong: "단 하나만",
        condOneSuffix:
          " 인증에 성공하면 OwOGG Creator로 인정되며, 4개를 모두 인증할 필요는 없습니다.",
        condNoMinimum:
          "현재 구독자/팔로워 수나 채널 개설 기간에 대한 최소 기준은 요구하지 않습니다. 채널 소유권만 공식 OAuth로 확인되면 됩니다.",
        condOauthOnly:
          "소유권 인증은 항상 각 플랫폼의 공식 OAuth 로그인 화면을 통해서만 이루어지며, 채널 URL이나 닉네임을 직접 입력하는 방식은 지원하지 않습니다.",
        condOneChannelOneAccount:
          "하나의 외부 채널은 한 OwOGG 계정에만 연동할 수 있습니다(1채널 = 1계정).",
        methodHeading: "인증 방법",
        step1: "내 프로필 페이지의 [크리에이터 채널 소유권 인증] 섹션으로 이동합니다.",
        step2: "인증하려는 플랫폼의 [채널 소유권 인증] 버튼을 클릭합니다.",
        step3: "해당 플랫폼의 공식 로그인 화면에서 본인 계정으로 로그인·승인합니다.",
        step4: "OwOGG로 돌아오면 채널 정보가 자동으로 확인되어 표시됩니다.",
        calloutLoginStrong: "OwOGG 로그인과 채널 인증은 별개입니다.",
        calloutLoginBody:
          " Google로 로그인했다고 해서 자동으로 YouTube 채널이 연동되지 않습니다 — 명시적인 인증 절차를 거쳐야 합니다.",
        calloutDuplicate:
          "하나의 외부 채널은 한 OwOGG 계정에만 연동될 수 있습니다. 이미 다른 사용자가 인증한 채널은 다시 인증할 수 없습니다.",
        footerPrefix: "스트리머 랭킹에 노출되려면 위 4개 플랫폼 중 ",
        footerStrong: "하나만",
        footerMid: " 인증하면 충분합니다. 자세한 자격 조건은 ",
        footerLink: "랭킹 문서",
        footerSuffix: "를 참고하세요.",
      },
      creatorFeatured: {
        title: "Featured Creator",
        description: "Featured는 OwOGG 기준 공개 채널 지표로 심사하는 표시·필터링 전용 배지입니다.",
        conceptHeading: "개념 구분",
        conceptCreatorTerm: "Creator",
        conceptCreatorDesc: " — 공식 OAuth/API로 채널 소유권이 검증된 상태.",
        conceptFeaturedTerm: "Featured Creator",
        conceptFeaturedDesc:
          " — Creator 중에서 OwOGG 기준(구독자/팔로워, 채널 개설 기간 등 공개 지표)을 충족해 자동/수동 심사를 통과한 상태.",
        reviewHeading: "심사 방식",
        reviewBody:
          "채널 소유권 인증 직후에는 Featured가 즉시 부여되지 않습니다. 일정 시간 뒤 신선한 공식 지표로 자동 재심사가 이루어지며, 지표가 모호하거나 플랫폼이 공식 API로 지표를 제공하지 않으면 운영진 수동 심사로 안전하게 넘어갑니다. Featured로 인정된 이후에도 주기적으로 재검증합니다.",
        calloutNoRankImpactStrong: "Featured는 점수·XP·랭킹 순위에 영향을 주지 않습니다.",
        calloutNoRankImpactBody:
          " 표시 전용 배지이며, Featured 여부와 무관하게 스트리머 랭킹은 채널 소유권 인증만으로 노출됩니다.",
        calloutTestingPhase:
          "현재는 서비스 검증 단계라 Featured가 자동으로 부여되지 않고, 채널 소유권이 인증된 모든 Creator가 운영진 수동 심사 대기 상태를 거칩니다. 스트리머 랭킹에는 Featured 여부와 무관하게 동일하게 노출되며, Featured 배지도 아직 공개적으로 표시하지 않습니다.",
        footerNote:
          "운영진의 심사 기준과 절차는 내부 운영 문서로 별도 관리되며, 특정 수치를 공개하지 않습니다 — 심사는 항상 공식 API로 확인 가능한 지표만 사용합니다.",
      },
      account: {
        title: "계정 개요",
        description:
          "OwOGG는 Google과 Discord 로그인을 지원하며, 두 방식은 기본적으로 별도 계정입니다.",
        loginHeading: "로그인 방식",
        loginBody:
          "Google 또는 Discord로 로그인할 수 있습니다. 같은 사람이더라도 Google로 만든 계정과 Discord로 만든 계정은 기본적으로 서로 다른 OwOGG 계정입니다 — 자동으로 합쳐지지 않습니다.",
        profileHeading: "프로필 설정",
        profileBody:
          "내 프로필 페이지에서 닉네임과 국가/지역을 설정할 수 있고, 레벨·XP·업적·즐겨찾기·최근 플레이 기록을 확인할 수 있습니다.",
        profileLink: "내 프로필로 이동 →",
        calloutPrefix: "Google과 Discord 계정을 따로 만들었다면 ",
        calloutLink: "계정 통합",
        calloutSuffix: " 기능으로 하나로 합칠 수 있습니다.",
      },
      accountMerge: {
        title: "계정 통합",
        description: "Primary Account Wins 방식 — 남길 계정(Primary)을 먼저 선택하고 진행합니다.",
        howHeading: "통합 방식: Primary Account Wins",
        howBodyPrefix: "두 계정 중 계속 사용할 계정을 ",
        howBodyPrimary: "Primary",
        howBodySuffix:
          "로 지정합니다. 통합이 완료되면 Primary의 게임 기록·XP·개인화 설정이 그대로 유지되고, Secondary의 해당 데이터는 합쳐지지 않고 정리됩니다. Secondary에 연결되어 있던 Google/Discord 로그인 수단만 Primary로 옮겨져, 이후에는 어느 수단으로 로그인해도 같은 Primary 계정으로 들어오게 됩니다.",
        stepsHeading: "진행 순서",
        step1: "계속 사용할 계정(Primary)으로 로그인합니다.",
        step2: "계정 통합을 시작하고, 합칠 대상 계정(Secondary)으로 본인 확인을 진행합니다.",
        step3: "통합 내용을 확인합니다 — Secondary의 게임/개인화 데이터는 유지되지 않습니다.",
        step4: "확인 후 통합을 확정합니다.",
        step5: "이후 Secondary였던 로그인 수단으로도 Primary 계정에 로그인됩니다.",
        calloutNoMergeStrong: "기록은 합쳐지지 않습니다.",
        calloutNoMergeBody:
          " Primary의 점수/XP/진행도만 유지되며, Secondary의 기록은 통합 후 사라집니다 — 반드시 남기고 싶은 계정을 Primary로 선택하세요.",
        calloutAdminStrong: "Secondary 계정이 관리자 계정이면 통합이 차단됩니다.",
        calloutAdminBody:
          " 관리자 권한이 있는 계정을 Secondary로 통합하면 그 권한이 어디로도 옮겨지지 않고 사라질 수 있어, OwOGG는 안전을 위해 이 경우 통합 자체를 막고 운영진의 별도 처리를 요구합니다.",
        footerPrefix: "플랫폼 소유권 인증(Creator)이 되어 있는 계정을 통합하는 경우의 규칙은 ",
        footerLink: "Creator 채널 소유권 인증",
        footerSuffix: " 문서를 참고하세요.",
      },
      games: {
        title: "게임과 랭킹 개요",
        description:
          "OwOGG는 반응속도, 순서 기억력, 에임, 타자 속도 등 미니게임 카탈로그를 제공합니다.",
        intro:
          "각 게임은 독립적인 규칙과 점수 방식을 가지며, 유효한 기록은 자동으로 랭킹에 반영됩니다. 플레이와 별개로 활동 자체는 경험치(XP)로도 누적됩니다.",
        cardRanking: "랭킹 →",
        cardRankingDesc: "게임별/스트리머 랭킹 계산 방식",
        cardXp: "XP와 레벨 →",
        cardXpDesc: "경험치 지급 방식과 레벨 공식",
        footerPrefix: "지금 바로 ",
        footerLink: "게임 카탈로그",
        footerSuffix: "에서 플레이해보세요.",
      },
      gamesRanking: {
        title: "랭킹",
        description:
          "명예의 전당(/ranking)은 게임 랭킹, 경험치 랭킹, 스트리머 랭킹 세 가지 탭으로 구성됩니다.",
        gameHeading: "게임 랭킹",
        gameBody:
          "게임별 최고 기록(Personal Best) 기준으로 정렬됩니다. 한 사용자가 같은 게임을 여러 번 플레이해도 랭킹에는 가장 좋은 기록 1개만 반영됩니다.",
        xpHeading: "경험치(XP) 랭킹",
        xpBodyPrefix: "누적 글로벌 XP 기준으로 정렬됩니다. 자세한 지급 방식은 ",
        xpBodyLink: "XP와 레벨 문서",
        xpBodySuffix: "를 참고하세요.",
        streamerHeading: "스트리머 랭킹",
        streamerBodyPrefix: "YouTube / CHZZK / SOOP / Twitch 중 ",
        streamerBodyStrong: "하나 이상",
        streamerBodySuffix:
          "의 플랫폼에서 공식 채널 소유권 인증을 완료한 사용자만 노출됩니다. 순위 값은 일반 게임 랭킹/XP 랭킹과 동일한 계산식을 사용하며, 인증한 플랫폼 수는 순위에 영향을 주지 않습니다 — 오른쪽 끝의 플랫폼 아이콘은 필터링·표시 전용입니다.",
        streamerLinkPrefix: "자세한 인증 방법은 ",
        streamerLink: "Creator 채널 소유권 인증",
        streamerLinkSuffix: " 문서를 참고하세요.",
        calloutFeatured:
          "Featured Creator 표시는 랭킹 순위나 XP 계산에 어떠한 영향도 주지 않는 표시 전용 배지입니다.",
        footerPrefix: "Discord 서버 단위 랭킹은 ",
        footerLink: "Discord 서버 XP 문서",
        footerSuffix: "를 참고하세요.",
      },
      gamesXp: {
        title: "XP와 레벨",
        description:
          "게임을 유효하게 완료할 때마다 경험치가 쌓이고, 누적 경험치에 따라 레벨이 오릅니다.",
        grantHeading: "XP 지급",
        grantPerPlay: "인정되는 게임 완료 1회당 10 XP가 지급됩니다.",
        grantDailyCap: "같은 게임은 하루(UTC 기준) 최대 10회까지만 XP가 지급됩니다.",
        grantAfterCap:
          "상한에 도달해도 게임 플레이 자체는 계속 가능합니다 — 추가 XP만 지급되지 않습니다.",
        formulaHeading: "레벨 공식",
        formulaPrefix: "레벨 L에 도달하기 위한 누적 XP는 ",
        formulaSuffix: "입니다. 레벨이 오를수록 다음 레벨까지 필요한 XP가 점점 늘어납니다.",
        calloutPrefix: "Discord 서버에서 만든 XP와 글로벌 XP의 관계가 궁금하다면 ",
        calloutLink: "Discord 서버 XP 문서",
        calloutSuffix: "를 확인하세요.",
        footerPrefix: "내 레벨과 XP는 ",
        footerProfileLink: "내 프로필",
        footerMid: "에서, 전체 순위는 ",
        footerRankingLink: "명예의 전당",
        footerSuffix: "에서 확인할 수 있습니다.",
      },
      gettingStarted: {
        title: "시작하기",
        description: "가장 빠르게 첫 게임을 플레이하고 기록을 남기는 방법입니다.",
        flowHeading: "기본 흐름",
        step1: "OwOGG 계정으로 로그인합니다 (Google 또는 Discord).",
        step2: "게임 카탈로그에서 원하는 미니게임을 선택합니다.",
        step3: "게임을 플레이하고 결과를 확인합니다 — 유효한 기록은 자동으로 저장됩니다.",
        step4: "명예의 전당(랭킹)에서 나의 순위와 XP를 확인합니다.",
        step5: "필요하다면 Discord를 연결해 서버 친구들과 경쟁합니다.",
        calloutGuest:
          "게스트로도 게임을 플레이할 수 있습니다. 다만 기록이 계정에 저장되고 랭킹/XP에 반영되려면 로그인이 필요합니다.",
        cardCatalog: "게임 카탈로그 →",
        cardCatalogDesc: "지금 플레이할 게임 고르기",
        cardRanking: "명예의 전당 →",
        cardRankingDesc: "게임/XP/스트리머 랭킹 확인",
        footerPrefix: "Discord 서버에서 친구들과 함께 하고 싶다면 ",
        footerDiscordLink: "Discord 문서",
        footerMid: "를, 계정 설정은 ",
        footerAccountLink: "계정 문서",
        footerSuffix: "를 확인하세요.",
      },
    },
    platformIcon: {
      chzzkLabel: "CHZZK (치지직)",
      soopLabel: "SOOP (아프리카)",
      channelSuffix: "채널",
      verifiedPlatforms: "검증된 플랫폼",
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
      title: "Sign in to OwOGG",
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
      platformChzzk: "CHZZK",
      platformSoop: "SOOP",
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
        "OwOGG's creator channel ownership verification is being rolled out. Verified creators' best game records and activity XP will appear here.",
      retryButton: "Retry",
      rank1: "1st",
      rank2: "2nd",
      rank3: "3rd",
    },
    profile: {
      myProfileTab: "My Profile",
      recordsTab: "Records",
      joinedLabel: "Joined",
      logout: "Log out",
      favoritesTitle: "Favorites",
      emptyFavorites: "No favorite games yet. Tap the bookmark icon on a game card to add one.",
      recentPlaysTitle: "Recently Played",
      achievementsTitle: "Achievements",
      emptyAchievements: "No achievements yet. Play games and add favorites to unlock some!",
      noRecordLabel: "No record on this account",
      deviceRecordLabel: "Device record",
      noRecordYetHint: "No record yet — give it a try now!",
      justNow: "just now",
      minutesAgoSuffix: "m ago",
      hoursAgoSuffix: "h ago",
      daysAgoSuffix: "d ago",
      linkSuccess: "Your login method has been linked.",
      alreadyLinkedAccount: "This account is already linked.",
      linkError: "An error occurred while linking your login method.",
      creatorVerifySuccess: "Creator channel ownership verification is complete.",
      creatorVerifyConflict: "This channel is already linked to a different OwOGG creator account.",
      creatorVerifyUnconfigured: "Verification for this platform isn't available right now.",
      creatorVerifyUnauthorized: "Your login has expired. Please log in again.",
      creatorVerifyError: "An error occurred while verifying your creator channel.",
      googleScriptNotReady: "The Google login script isn't ready yet.",
      googleLinkSuccess: "Your Google login has been linked.",
      googleAccountInUse: "This Google account is already in use by a different OwOGG account.",
      googleAlreadyLinked: "This account already has Google login linked.",
      googleLinkFailed: "Failed to link your Google account.",
      unlinkSuccessSuffix: "has been unlinked.",
      lastAuthProviderError: "You can't unlink your last remaining login method.",
      unlinkFailed: "Failed to unlink.",
      mergeCompleted: "Account merge is complete.",
      nicknameUpdated: "Your nickname has been changed.",
      nicknameCooldownPrefix: "You can change your nickname again after",
      nicknameCooldownSuffix: ".",
      nicknameUpdateFailed: "Failed to change your nickname.",
      countryUpdated: "Your country/region has been changed.",
      countryCooldownPrefix: "You can change your country/region again after",
      countryCooldownSuffix: ".",
      countryUpdateFailed: "Failed to change your country/region.",
      loginRequiredTitle: "You need to log in to view this page",
      loginRequiredBody: "Log in with Google or Discord to manage your game records.",
      loginRequiredCta: "Log in",
      backButton: "Go back",
      levelLabel: "Level",
      globalXpRankPrefix: "Global XP rank #",
      totalXpPrefix: "Total ",
      settingsTitle: "Profile Settings",
      nicknameLabel: "Nickname",
      nicknamePlaceholder: "Enter a nickname",
      changeButton: "Change",
      countryLabel: "Country/Region",
      countryHint: "(optional, self-reported — not identity verification)",
      countryNotSet: "Not set",
      itemsCountSuffix: "",
      emptyRecentPlays: "No plays recorded yet. They'll show up here once you play a game.",
      connectedAccountsTitle: "Connected Login Accounts",
      linkedStatus: "Linked",
      notLinkedStatus: "Not linked",
      unlinkButton: "Unlink",
      linkButton: "Link",
      creatorVerificationTitle: "Creator Channel Ownership Verification",
      creatorVerificationSubtitle:
        "Verified directly via official OAuth/API that you own the channel. (No self-reported text entry or web scraping.)",
      ownershipVerified: "Ownership verified",
      unverified: "Unverified",
      verifiedConfirmedText:
        "✓ OwOGG confirmed this user's channel ownership via the official API.",
      audienceCountLabel: "Subscribers/Followers",
      audienceUnit: "",
      metricsSyncedPrefix: "· Metrics synced",
      verifyChannelCta: "Verify channel ownership",
      verifyUnavailable: "Verification isn't available right now",
      featuredReviewStatusTitle: "Featured Review Status",
      featuredCreatorLabel: "★ Featured Creator",
      featuredSelectedSuffix: "selected",
      featuredHint:
        "Featured status is based on official channel metrics (12,000+ subscribers/followers · channel 120+ days old) and has no effect on game scores, XP, or ranking.",
      achievedSuffix: "unlocked",
      myGameRecordsTitle: "My Best Records by Game",
      challengeSuffix: "attempted",
      viewFullRankingArrow: "View full ranking →",
      reviewNotStarted:
        "Automatic review begins once channel ownership verification is complete. (First review in about 6 hours)",
      autoReviewPending: "Automatic review pending",
      nextReviewPrefix: "(next review",
      notEligible: "Not currently eligible",
      manualReviewNeeded: "Manual review needed",
      autoReviewFailed: "Automatic review temporarily failed (waiting to retry)",
      nextRetryPrefix: "— next retry",
    },
    discord: {
      heroTitle1: "Compete and connect with",
      heroTitle2: "friends through your game records",
      heroSubtitle:
        "Add the OwOGG Discord Bot to your server to build a community-only leaderboard and a dedicated server page.",
      installCta: "Add OwOGG to Discord",
      setupCta: "🧭 Setup Guide (5 steps)",
      searchCta: "🔍 Search Servers",
      registerCta: "⚡ Register My Server (admin required)",
      guideCta: "📖 Discord Usage Guide",
      managedServersTitle: "🛡️ Servers I Manage",
      exploreAll: "Explore all →",
      loadingServers: "Loading server list...",
      noManagedServers: "You don't manage any registered servers",
      loginRequired: "Login required",
      registerPrompt:
        "Register a server where you have Discord admin permissions to start your community.",
      registerStart: "Start server registration",
      publicPage: "Public page",
      manageServer: "Manage server",
      registeredLabel: "Registered",
      weeklyRankingTitle: "This Week's Server Activity Ranking",
      loadingRanking: "Loading ranking...",
      emptyWeeklyRanking: "No server activity registered this week",
      guideTitle: "📌 Usage Guide",
      guideStep1: "Only users with Discord admin (MANAGE_GUILD) permission can register a server.",
      guideStep2: "Public registration exposes your server in the OwOGG directory and search.",
      guideStep3:
        "Playing games via /owogg play contributes XP to this server and counts toward the weekly ranking.",
      accountLinkTitle: "🔗 Link Discord Account",
      accountLinkBody:
        "Linking your OwOGG account with your Discord account lets you check your info via bot commands (/owogg profile).",
      accountLinkCta: "Go to account linking page",
      usageGuideCta: "View Discord usage guide",
    },
    discordSetup: {
      eyebrow: "OwOGG × Discord",
      title: "Discord Setup Guide",
      subtitle:
        "Just follow these 5 steps to start using OwOGG right in your server. You won't need a Bot Token or Application ID — only the OwOGG team handles those.",
      step1Title: "Add OwOGG to Discord",
      step1Description:
        "Install the Discord app to your server using an account with server admin permission.",
      checkingInstallLink: "Checking install link...",
      installLinkUnavailable:
        "The install link isn't ready yet. Ask your server admin for the official install link.",
      installNote:
        "Installing the Discord app is different from registering your server on OwOGG (step 3) — installation alone doesn't auto-register your server.",
      step2Title: "Link Your Discord Account",
      step2Description: "Link your account so bot commands can look up your own OwOGG info.",
      checking: "Checking...",
      owoggLoginCta: "Log in to OwOGG",
      linkedNote1: "Linked. You can use",
      linkedNote2: "on Discord.",
      linkAccountCta: "Go to account linking page",
      step3Title: "Register a Server",
      step3Description:
        "Register a server where you have Discord admin (MANAGE_GUILD) permission as a OwOGG community.",
      loginFirst: "Please log in to OwOGG first.",
      alreadyRegisteredPrefix: "You already manage/register ",
      alreadyRegisteredSuffix: " server(s).",
      registerStartCta: "Start server registration",
      viewServerDirectory: "View server directory",
      step4Title: "Test /owogg games",
      step4Description:
        "Check that the slash command autocompletes correctly in your Discord channel.",
      notShowingUp: "If it doesn't show up in autocomplete, check the",
      troubleshootingGuide: "troubleshooting guide",
      checkSuffix: ".",
      step5Title: "Start with /owogg play",
      step5Description: "Get a play link tied to this server and start earning server XP.",
      viewFullGuide: "View full usage guide",
      footerNote1:
        "Regular users never need to enter a Bot Token, Application ID, or Public Key. For more details, see the",
      discordWikiLink: "Discord Wiki",
      footerNote2: ".",
      badgeDone: "Done",
      badgeTodo: "Action needed",
      badgeUnknown: "Check yourself",
    },
    discordGuide: {
      eyebrow: "OwOGG × Discord",
      heroTitle: "Using OwOGG on Discord",
      heroSubtitle:
        "Start games from your server and check your activity via server XP and the leaderboard. OwOGG runs on signed HTTP Interactions, not an always-on Gateway bot.",
      installCta: "Add to Discord",
      installLinkHint: "Check with your server admin for the install link",
      serverDirectoryCta: "Server directory",
      stepsAriaLabel: "Key steps for using Discord",
      step1Title: "Install to a server",
      step1Text: "Installing the Discord app is the setup step for using it on a server.",
      step2Title: "Register the server",
      step2Text: "Check the guilds you can manage, then choose visibility yourself.",
      step3Title: "Start playing",
      step3Text: "Use the /owogg play link to attribute valid activity to the server.",
      installGuideTitle: "Installing to a server",
      installGuideP1:
        "Check the app's Installation settings in the Discord Developer Portal, then add it to your server with the real install link.",
      installGuideP2:
        "If the install link isn't shown, the app can't verify permissions or configuration. Don't use an arbitrary URL — ask your server operator for the official install link.",
      installGuideP3:
        "Installing the app alone does not publish your server to the public OwOGG directory.",
      accountGuideTitle: "Linking your account",
      accountStep1Prefix: "Run",
      accountStep1Suffix: "on Discord",
      accountStep2: "Open the one-time link in the response",
      accountStep3: "Confirm the link after logging in to OwOGG",
      openLinkPageCta: "Open the linking page",
      registerTitle: "Registering a server",
      registerSubtitle: "Admins create a OwOGG server space in the following order.",
      registerStep1: "Log in to OwOGG",
      registerStep2: "Confirm official Discord permissions",
      registerStep3: "Choose a guild and set a slug",
      registerStep4: "Choose PUBLIC / UNLISTED / PRIVATE",
      registerDirectoryCta: "Start from the server directory",
      xpTitle: "How server XP is calculated",
      xpSubtitle: "Global XP and server XP are not the same number copied around.",
      xpGlobalTitle: "Global XP",
      xpGlobalText: "Your overall OwOGG progress",
      xpGuildATitle: "Guild A user XP",
      xpGuildAText: "Valid contributions made in A",
      xpGuildBTitle: "Guild B",
      xpGuildBText: "Existing XP isn't auto-copied",
      antiAbuseLabel: "Anti-abuse:",
      antiAbuseText:
        "Global XP is capped at 10 grants per user × game × UTC day. Once the cap is reached you can still complete games, but no additional XP is granted.",
      commandsTitle: "Commands",
      commandGamesDesc: "See the list of games you can play.",
      commandLinkDesc: "Link your Discord account with your OwOGG account.",
      commandProfileDesc: "Check your linked account's profile, level, and global XP.",
      commandPlayDesc: "Create a one-time game play link tied to the server.",
      commandRankDesc: "Check your XP and rank in the current server.",
      commandLeaderboardDesc: "See the current server's XP Top 10.",
      commandServerDesc: "Check the server's total XP and weekly activity.",
      rankingGuideTitle: "Viewing server rankings",
      rankingGuideP1:
        "The server page shows server XP, weekly server XP, and per-game server participant records.",
      rankingGuideP2:
        "Only active `PUBLIC` servers appear in the public global server activity ranking. Participant counts are based on users who created OwOGG activity, not total Discord member counts.",
      viewFullRankingCta: "View the full OwOGG ranking",
      helpGuideTitle: "Troubleshooting",
      helpP1:
        "If you see a message that the server isn't registered, check whether an admin has completed server registration.",
      helpP2:
        "For account linking errors, run `/owogg link` again and re-verify with an unexpired link.",
      helpP3: "If your play link has expired or been used already, you'll need to issue a new one.",
      faqTitle: "Frequently Asked Questions",
      faq1Q: "Does installing the app automatically make my server public?",
      faq1A:
        "No. Installing the app and registering on OwOGG are separate steps. An admin must confirm the guild on the web and choose visibility themselves.",
      faq2Q: "Does OwOGG pull in all members of my Discord server?",
      faq2A:
        "No. It checks manageable guilds via official OAuth, and only participants who created OwOGG activity are used for XP rankings.",
      faq3Q: "Can I import my existing global XP into a server all at once?",
      faq3A:
        "No. A new guild starts at 0, and only valid completions made via `/owogg play` are attributed to it.",
      faq4Q: "Do I need to run an always-on bot process?",
      faq4A:
        "Not in v1. The Discord HTTP Interactions endpoint and a Cloudflare Worker handle requests.",
      footerNote: "For more detailed operating procedures, see the Discord Bot operations guide.",
      footerHubCta: "Go to Discord Hub",
    },
    discordServers: {
      pageTitle: "🔍 Discord Server Directory",
      pageSubtitle: "Browse Discord communities registered on OwOGG, or register your own server.",
      registerCta: "🏰 Register my server",
      searchPlaceholder: "Search by server name or vanity slug...",
      searchButton: "Search",
      statusNoGuilds:
        "Couldn't find any Discord server where you have admin (MANAGE_GUILD) permission.",
      statusUnauthorized: "You need to log in to register a server.",
      statusError: "An error occurred during Discord authentication. Please try again.",
      candidateLoadError:
        "Couldn't load the list of servers you can register. The token may be expired or already used.",
      guildListFetchError: "Failed to fetch server list",
      registerFailError: "Failed to register server",
      modalTitle: "🏰 Register Discord Server",
      successTitle: "Server registered successfully!",
      viewPublicPage: "View public page",
      manageServer: "Manage server",
      step1Label: "1. Choose a server to register (guilds you manage)",
      step2Label: "2. Set a vanity slug (optional)",
      slugPlaceholder: "Auto-generated (lowercase letters, numbers, -)",
      step3Label: "3. Choose visibility",
      cancelButton: "Cancel",
      submittingButton: "Registering...",
      submitButton: "Complete server registration",
      totalCountPrefix: "A total of ",
      totalCountSuffix: " public servers are registered.",
      searchTermLabel: "Search term:",
      loadingList: "Loading server list...",
      emptyResultsTitle: "No public servers match your search.",
      emptyResultsHint: "Try a different search term, or register a new server.",
      owoggServerLabel: "OwOGG server",
      viewPageArrow: "View page →",
    },
    discordServerSlug: {
      loadFailedGeneric: "Couldn't load server info.",
      loadingServer: "Loading server info...",
      privateServerTitle: "Private server",
      notFoundTitle: "Server not found",
      privateServerMessage:
        "This server is set to PRIVATE visibility — only authorized admins can access it.",
      backToDirectory: "← Back to directory",
      manageServerCta: "⚙️ Manage server",
      participantsLabel: "OwOGG participants",
      participantsUnit: "",
      participantsHint: "Users who have contributed activity",
      totalXpLabel: "Total server XP",
      totalXpHint: "Sum of all game activity",
      weeklyXpLabel: "This week's server XP",
      weeklyXpHint: "As of Monday 00:00 KST",
      leaderboardTitle: "Server leaderboard",
      tabAlltime: "⚡ Server XP",
      tabWeekly: "📅 Weekly XP",
      tabGames: "🎮 Per-game records",
      emptyAlltimeTitle: "No XP has accumulated on this server yet",
      emptyAlltimeHintPrefix: "Run",
      emptyAlltimeHintSuffix: "in a Discord channel to contribute to a game!",
      emptyWeeklyTitle: "No XP has accumulated on this server this week",
      emptyWeeklyHint: "Start your first play after Monday 00:00 KST to claim the weekly rank!",
      loadingGame: "Loading game...",
      emptyGameScoreSuffix: "has no recorded server member scores",
      emptyGameHintPrefix: "Try the",
      emptyGameHintSuffix: "command in a Discord channel!",
      infoCardTitle: "OwOGG server info",
      statusLabel: "Status",
      visibilityLabel: "Visibility",
    },
    discordServerManage: {
      noPermissionError:
        "You don't have permission to manage this server. Check that you're logged in with a Discord admin account.",
      saveFailedError: "Failed to save settings",
      unregisterFailedError: "Failed to unregister server",
      loadingManageInfo: "Loading server management info...",
      accessDeniedTitle: "Access denied",
      backToDirectory: "← Go to directory",
      manageTitleSuffix: "server management",
      manageSubtitle: "Set public/private visibility, a custom vanity slug, and a description.",
      publicPageArrow: "Public page →",
      saveSuccessMessage: "Settings saved successfully.",
      slugLabel: "Vanity slug (lowercase letters, numbers, -)",
      slugHintPrefix: "Changing this does not change the Discord Guild ID (",
      slugHintSuffix: ") itself.",
      visibilityLabel: "Server visibility",
      visibilityPublicDesc: "Shown in search and accessible via the public page",
      visibilityUnlistedDesc: "Hidden from search, accessible via direct link",
      visibilityPrivateDesc: "Hidden from search, admin access only",
      descriptionLabel: "Server description",
      descriptionPlaceholder: "Enter a description of your server or community...",
      savingButton: "Saving...",
      saveButton: "Save settings",
      dangerZoneTitle: "Danger Zone",
      dangerZoneText:
        "Unregistering removes the server from the OwOGG directory and sets it to `DISABLED`. (The Discord server itself is unaffected.)",
      unregisterButton: "Unregister server",
      unregisterConfirmTitle: "Unregister this server?",
      unregisterConfirmBodySuffix: "will be removed from the OwOGG directory and search.",
      cancelButton: "Cancel",
      unregisteringButton: "Unregistering...",
      confirmUnregisterButton: "Confirm (unregister)",
    },
    discordLink: {
      checkingLinkInfo: "Checking link info...",
      invalidTitle: "Invalid link",
      invalidBodyPrefix: "This link has expired or was already used. Run",
      invalidBodySuffix: "again on your Discord server.",
      linkingInProgress: "Linking your Discord account...",
      errorTitle: "Linking failed",
      genericErrorMessage: "An error occurred while linking.",
      alreadyLinkedTitle: "Already linked",
      linkedTitle: "Your Discord account has been linked",
      successBodyPrefix: "You can now check your OwOGG account info on Discord with the",
      successBodySuffix: "command.",
      goToProfileCta: "Go to my profile",
      linkAccountTitle: "Link Discord Account",
      confirmPromptPrefix: "Link the Discord account",
      confirmPromptSuffix: "with your currently logged-in OwOGG account?",
      loginRequiredHint: "Please log in to OwOGG first to link your account.",
      loginCta: "Log in",
      linkCta: "Link account",
    },
    wiki: {
      navGettingStarted: "Getting Started",
      navDiscordOverview: "Discord Overview",
      navDiscordInstall: "Installation",
      navDiscordAccountLink: "Account Linking",
      navDiscordServerRegistration: "Server Registration",
      navDiscordCommands: "Commands",
      navDiscordXp: "Server XP",
      navDiscordTroubleshooting: "Troubleshooting",
      navAccount: "Account",
      navAccountOverview: "Account Overview",
      navAccountMerge: "Account Merge",
      navGamesRanking: "Games & Ranking",
      navGamesOverview: "Games Overview",
      navRanking: "Ranking",
      navGamesXp: "XP & Levels",
      navCreatorOverview: "Creator Overview",
      navCreatorVerification: "Channel Ownership Verification",
      navCreatorFeatured: "Featured Creator",
      tocAriaLabel: "Wiki table of contents",
      homeTitle: "Find what you need, fast",
      homeSubtitle:
        "From Discord install to how rankings are calculated — everything you need to use OwOGG, all in one place.",
      homeInstallPrompt: "Need a quicker Discord install? Jump straight to",
      homeInstallGuideLink: "the 5-step install guide",
      homeInstallGuideSuffix: ".",
      catDiscordDesc:
        "Server install, account linking, server registration, commands, server XP, troubleshooting.",
      catGettingStartedDesc: "The fastest path from creating a OwOGG account to your first game.",
      catAccountDesc: "Login methods, profile settings, and merging multiple accounts into one.",
      catGamesDesc: "The game catalog, how rankings are calculated, and XP & levels.",
      catCreatorDesc:
        "Channel ownership verification, streamer ranking eligibility, and Featured Creator criteria.",
    },
    wikiBody: {
      creator: {
        title: "Creator Overview",
        description:
          "Streamers and YouTubers whose channel ownership is verified through official OAuth/APIs are recognized as OwOGG Creators.",
        intro:
          "Creator verification gives no bonus whatsoever to game scores or XP. Instead it unlocks visibility in the Hall of Fame's streamer ranking tab, plus a verified badge and official channel links on your profile.",
        cardVerification: "Channel Ownership Verification →",
        cardVerificationDesc: "Supported platforms and how to verify",
        cardFeatured: "Featured Creator →",
        cardFeaturedDesc: "Featured eligibility criteria",
        profileHint: "You can start verification from your profile page.",
        profileLink: "Go to my profile",
      },
      creatorVerification: {
        title: "Channel Ownership Verification",
        description:
          "Ownership is verified using official OAuth and APIs only. Text entry and scraping are never used.",
        platformsHeading: "Supported platforms",
        conditionsHeading: "Requirements",
        condOnePrefix: "Verifying ",
        condOneStrong: "just one",
        condOneSuffix:
          " of the four platforms above (YouTube · CHZZK · SOOP · Twitch) is enough to be recognized as an OwOGG Creator — you do not need to verify all four.",
        condNoMinimum:
          "There is currently no minimum subscriber/follower count or channel age requirement. Ownership simply needs to be confirmed via official OAuth.",
        condOauthOnly:
          "Verification always happens through each platform's official OAuth login screen. Entering a channel URL or nickname by hand is not supported.",
        condOneChannelOneAccount:
          "An external channel can be linked to only one OwOGG account (1 channel = 1 account).",
        methodHeading: "How to verify",
        step1: "Go to the [Creator Channel Ownership Verification] section on your profile page.",
        step2: "Click the [Verify Channel Ownership] button for the platform you want to verify.",
        step3:
          "Sign in and approve with your own account on that platform's official login screen.",
        step4:
          "When you return to OwOGG, your channel details are confirmed and shown automatically.",
        calloutLoginStrong: "Signing in to OwOGG and verifying a channel are separate things.",
        calloutLoginBody:
          " Signing in with Google does not automatically link your YouTube channel — you must go through the explicit verification flow.",
        calloutDuplicate:
          "An external channel can be linked to only one OwOGG account. A channel already verified by another user cannot be verified again.",
        footerPrefix: "To appear in the streamer ranking, verifying ",
        footerStrong: "just one",
        footerMid: " of the four platforms above is enough. For full eligibility details, see the ",
        footerLink: "ranking article",
        footerSuffix: ".",
      },
      creatorFeatured: {
        title: "Featured Creator",
        description:
          "Featured is a display/filtering-only badge, reviewed against public channel metrics by OwOGG's criteria.",
        conceptHeading: "Terminology",
        conceptCreatorTerm: "Creator",
        conceptCreatorDesc: " — channel ownership verified through official OAuth/APIs.",
        conceptFeaturedTerm: "Featured Creator",
        conceptFeaturedDesc:
          " — a Creator that also passed automatic/manual review against OwOGG's criteria (public metrics such as subscribers/followers and channel age).",
        reviewHeading: "How review works",
        reviewBody:
          "Featured is not granted immediately after ownership verification. After some time an automatic re-review runs against fresh official metrics; if the metrics are ambiguous, or the platform does not expose them via an official API, the job is safely routed to manual staff review. Featured accounts are also periodically re-validated afterwards.",
        calloutNoRankImpactStrong: "Featured never affects scores, XP, or ranking position.",
        calloutNoRankImpactBody:
          " It is a display-only badge — the streamer ranking is driven purely by channel ownership verification, regardless of Featured status.",
        calloutTestingPhase:
          "We are currently in a service validation phase, so Featured is not granted automatically: every Creator with verified channel ownership goes through a staff manual-review queue. Streamer ranking visibility is identical regardless of Featured status, and the Featured badge is not publicly displayed yet.",
        footerNote:
          "Staff review criteria and procedures are maintained separately as internal operations documents, and specific figures are not published — review always uses only metrics verifiable through official APIs.",
      },
      account: {
        title: "Account Overview",
        description:
          "OwOGG supports Google and Discord sign-in, and by default the two are separate accounts.",
        loginHeading: "Sign-in methods",
        loginBody:
          "You can sign in with Google or Discord. Even for the same person, an account created via Google and one created via Discord are different OwOGG accounts by default — they are never merged automatically.",
        profileHeading: "Profile settings",
        profileBody:
          "On your profile page you can set your nickname and country/region, and review your level, XP, achievements, favorites, and recent play history.",
        profileLink: "Go to my profile →",
        calloutPrefix:
          "If you created separate Google and Discord accounts, you can combine them into one with ",
        calloutLink: "account merge",
        calloutSuffix: ".",
      },
      accountMerge: {
        title: "Account Merge",
        description:
          "Primary Account Wins — pick the account you want to keep (the Primary) first, then proceed.",
        howHeading: "How it works: Primary Account Wins",
        howBodyPrefix: "Designate the account you want to keep using as the ",
        howBodyPrimary: "Primary",
        howBodySuffix:
          ". Once the merge completes, the Primary's game records, XP, and personalization settings are kept as-is, while the Secondary's equivalent data is discarded rather than combined. Only the Google/Discord sign-in methods attached to the Secondary move over to the Primary, so afterwards either method signs you into the same Primary account.",
        stepsHeading: "Steps",
        step1: "Sign in with the account you want to keep (the Primary).",
        step2:
          "Start the account merge and verify ownership of the account to be merged (the Secondary).",
        step3: "Review the summary — the Secondary's game/personalization data will not be kept.",
        step4: "Confirm to finalize the merge.",
        step5:
          "From then on, the former Secondary sign-in method also signs you into the Primary account.",
        calloutNoMergeStrong: "Records are not combined.",
        calloutNoMergeBody:
          " Only the Primary's scores/XP/progress are kept; the Secondary's records are gone after the merge — be sure to choose the account you want to keep as the Primary.",
        calloutAdminStrong: "The merge is blocked if the Secondary is an administrator account.",
        calloutAdminBody:
          " Merging an account that holds admin privileges as the Secondary could make those privileges vanish without transferring anywhere, so for safety OwOGG blocks the merge outright and requires separate handling by staff.",
        footerPrefix:
          "For the rules that apply when merging an account with Creator channel ownership verification, see the ",
        footerLink: "Creator channel ownership verification",
        footerSuffix: " article.",
      },
      games: {
        title: "Games & Ranking Overview",
        description:
          "OwOGG offers a catalog of mini-games including reaction time, sequence memory, aim, and typing speed.",
        intro:
          "Each game has its own rules and scoring, and valid records are reflected in the rankings automatically. Separately from scores, the act of playing also accumulates XP.",
        cardRanking: "Ranking →",
        cardRankingDesc: "How per-game and streamer rankings are calculated",
        cardXp: "XP & Levels →",
        cardXpDesc: "How XP is granted and the level formula",
        footerPrefix: "Jump right into the ",
        footerLink: "game catalog",
        footerSuffix: " and start playing.",
      },
      gamesRanking: {
        title: "Ranking",
        description:
          "The Hall of Fame (/ranking) is organized into three tabs: game ranking, XP ranking, and streamer ranking.",
        gameHeading: "Game ranking",
        gameBody:
          "Sorted by each player's personal best per game. No matter how many times someone plays the same game, only their single best record counts toward the ranking.",
        xpHeading: "XP ranking",
        xpBodyPrefix: "Sorted by cumulative global XP. For how XP is granted, see the ",
        xpBodyLink: "XP & levels article",
        xpBodySuffix: ".",
        streamerHeading: "Streamer ranking",
        streamerBodyPrefix: "Only users who completed official channel ownership verification on ",
        streamerBodyStrong: "at least one",
        streamerBodySuffix:
          " of YouTube / CHZZK / SOOP / Twitch appear here. Ranking values use the exact same formula as the regular game/XP rankings, and the number of verified platforms has no effect on position — the platform icons at the right edge are for filtering and display only.",
        streamerLinkPrefix: "For how to verify, see the ",
        streamerLink: "Creator channel ownership verification",
        streamerLinkSuffix: " article.",
        calloutFeatured:
          "The Featured Creator mark is a display-only badge that has no effect whatsoever on ranking position or XP calculation.",
        footerPrefix: "For per-Discord-server rankings, see the ",
        footerLink: "Discord server XP article",
        footerSuffix: ".",
      },
      gamesXp: {
        title: "XP & Levels",
        description:
          "Every valid game completion accumulates XP, and your level rises with cumulative XP.",
        grantHeading: "How XP is granted",
        grantPerPlay: "10 XP is granted per accepted game completion.",
        grantDailyCap: "XP is granted for at most 10 completions of the same game per day (UTC).",
        grantAfterCap:
          "You can keep playing after hitting the cap — only the additional XP stops being granted.",
        formulaHeading: "Level formula",
        formulaPrefix: "The cumulative XP required to reach level L is ",
        formulaSuffix: ". The higher your level, the more XP the next level takes.",
        calloutPrefix: "Curious how XP earned in a Discord server relates to global XP? See the ",
        calloutLink: "Discord server XP article",
        calloutSuffix: ".",
        footerPrefix: "You can check your level and XP on ",
        footerProfileLink: "your profile",
        footerMid: ", and the overall standings in the ",
        footerRankingLink: "Hall of Fame",
        footerSuffix: ".",
      },
      gettingStarted: {
        title: "Getting Started",
        description:
          "The fastest path to playing your first game and putting a record on the board.",
        flowHeading: "Basic flow",
        step1: "Sign in with an OwOGG account (Google or Discord).",
        step2: "Pick a mini-game from the game catalog.",
        step3: "Play and check your result — valid records are saved automatically.",
        step4: "Check your position and XP in the Hall of Fame (ranking).",
        step5: "Optionally connect Discord to compete with friends in your server.",
        calloutGuest:
          "You can play as a guest. However, signing in is required for records to be saved to an account and counted toward rankings/XP.",
        cardCatalog: "Game catalog →",
        cardCatalogDesc: "Pick something to play right now",
        cardRanking: "Hall of Fame →",
        cardRankingDesc: "Check game/XP/streamer rankings",
        footerPrefix: "To play with friends in a Discord server, see the ",
        footerDiscordLink: "Discord article",
        footerMid: "; for account settings, see the ",
        footerAccountLink: "account article",
        footerSuffix: ".",
      },
    },
    platformIcon: {
      chzzkLabel: "CHZZK",
      soopLabel: "SOOP",
      channelSuffix: "channel",
      verifiedPlatforms: "Verified platforms",
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
      title: "OwOGG にログイン",
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
      platformChzzk: "CHZZK",
      platformSoop: "SOOP",
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
        "OwOGGクリエイターチャンネル所有権認証サービスを準備中です。認証済みクリエイターのゲーム最高記録と活動XPがここに表示されます。",
      retryButton: "再試行",
      rank1: "1位",
      rank2: "2位",
      rank3: "3位",
    },
    profile: {
      myProfileTab: "マイプロフィール",
      recordsTab: "記録",
      joinedLabel: "登録日",
      logout: "ログアウト",
      favoritesTitle: "お気に入り",
      emptyFavorites:
        "まだお気に入りのゲームがありません。ゲームカードのブックマークアイコンを押して追加しましょう。",
      recentPlaysTitle: "最近プレイしたゲーム",
      achievementsTitle: "実績",
      emptyAchievements:
        "まだ達成した実績がありません。ゲームをプレイしてお気に入りを追加してみましょう！",
      noRecordLabel: "アカウント記録なし",
      deviceRecordLabel: "端末記録",
      noRecordYetHint: "まだ記録がありません — 今すぐ挑戦してみましょう！",
      justNow: "たった今",
      minutesAgoSuffix: "分前",
      hoursAgoSuffix: "時間前",
      daysAgoSuffix: "日前",
      linkSuccess: "ログイン方法が連携されました。",
      alreadyLinkedAccount: "すでに連携済みのアカウントです。",
      linkError: "ログイン方法の連携中にエラーが発生しました。",
      creatorVerifySuccess: "クリエイターチャンネルの所有権認証が完了しました。",
      creatorVerifyConflict:
        "このチャンネルはすでに別のOwOGGクリエイターアカウントに連携されています。",
      creatorVerifyUnconfigured: "現在このプラットフォームの認証は利用できません。",
      creatorVerifyUnauthorized: "ログインの有効期限が切れました。再度ログインしてください。",
      creatorVerifyError: "クリエイターチャンネル認証中にエラーが発生しました。",
      googleScriptNotReady: "Googleログインスクリプトの準備ができていません。",
      googleLinkSuccess: "Googleログインが連携されました。",
      googleAccountInUse: "このGoogleアカウントはすでに別のOwOGGアカウントで使用されています。",
      googleAlreadyLinked: "このアカウントにはすでにGoogleログインが連携されています。",
      googleLinkFailed: "Google連携に失敗しました。",
      unlinkSuccessSuffix: "の連携が解除されました。",
      lastAuthProviderError: "最後のログイン方法は解除できません。",
      unlinkFailed: "連携解除に失敗しました。",
      mergeCompleted: "アカウント統合が完了しました。",
      nicknameUpdated: "ニックネームが変更されました。",
      nicknameCooldownPrefix: "ニックネームは",
      nicknameCooldownSuffix: "以降に再度変更できます。",
      nicknameUpdateFailed: "ニックネームの変更に失敗しました。",
      countryUpdated: "国/地域が変更されました。",
      countryCooldownPrefix: "国/地域は",
      countryCooldownSuffix: "以降に再度変更できます。",
      countryUpdateFailed: "国/地域の変更に失敗しました。",
      loginRequiredTitle: "ログインが必要なページです",
      loginRequiredBody: "GoogleまたはDiscordアカウントでログインしてゲーム記録を管理しましょう。",
      loginRequiredCta: "ログインする",
      backButton: "前のページに戻る",
      levelLabel: "レベル",
      globalXpRankPrefix: "全体XPランキング #",
      totalXpPrefix: "合計 ",
      settingsTitle: "プロフィール設定",
      nicknameLabel: "ニックネーム",
      nicknamePlaceholder: "ニックネームを入力してください",
      changeButton: "変更",
      countryLabel: "国/地域",
      countryHint: "（任意、自己申告情報であり国籍認証ではありません）",
      countryNotSet: "設定しない",
      itemsCountSuffix: "件",
      emptyRecentPlays: "まだプレイ記録がありません。ゲームをプレイするとここに表示されます。",
      connectedAccountsTitle: "連携中のログインアカウント",
      linkedStatus: "連携済み",
      notLinkedStatus: "未連携",
      unlinkButton: "連携解除",
      linkButton: "連携する",
      creatorVerificationTitle: "クリエイターチャンネル所有権認証",
      creatorVerificationSubtitle:
        "公式OAuth/APIを通じて、当該チャンネルを直接所有していることを検証します。（自己申告のテキスト入力やWebスクレイピングは禁止）",
      ownershipVerified: "所有権認証済み",
      unverified: "未認証",
      verifiedConfirmedText:
        "✓ OwOGGが公式APIを通じてこのユーザーのチャンネル所有権を確認しました。",
      audienceCountLabel: "登録者/フォロワー",
      audienceUnit: "人",
      metricsSyncedPrefix: "・指標同期",
      verifyChannelCta: "チャンネル所有権認証",
      verifyUnavailable: "現在認証を利用できません",
      featuredReviewStatusTitle: "Featured審査状況",
      featuredCreatorLabel: "★ Featured Creator",
      featuredSelectedSuffix: "選定",
      featuredHint:
        "Featuredは公式チャンネル指標に基づく資格（登録者/フォロワー12,000人以上・チャンネル開設120日以上）であり、ゲームスコア・XP・ランキング順位には影響しません。",
      achievedSuffix: "達成",
      myGameRecordsTitle: "自分のゲーム別最高記録",
      challengeSuffix: "挑戦",
      viewFullRankingArrow: "全体ランキングを見る →",
      reviewNotStarted:
        "チャンネル所有権認証完了後、自動審査が開始されます。（約6時間後に初回審査）",
      autoReviewPending: "自動審査待機中",
      nextReviewPrefix: "（次回審査",
      notEligible: "現在基準未達",
      manualReviewNeeded: "追加確認が必要",
      autoReviewFailed: "自動審査が一時的に失敗しました（再試行待ち）",
      nextRetryPrefix: "— 次回再試行",
    },
    discord: {
      heroTitle1: "友達とゲーム記録を",
      heroTitle2: "競い合い、交流しよう",
      heroSubtitle:
        "OwOGG Discord Botを自分のサーバーに登録して、コミュニティ専用のリーダーボードとサーバー専用ページを構築しましょう。",
      installCta: "DiscordにOwOGGを追加",
      setupCta: "🧭 セットアップガイド（5ステップ）",
      searchCta: "🔍 サーバー検索",
      registerCta: "⚡ サーバー登録（管理者権限が必要）",
      guideCta: "📖 Discord利用ガイド",
      managedServersTitle: "🛡️ 管理中の登録サーバー",
      exploreAll: "すべて見る →",
      loadingServers: "サーバーリストを読み込み中...",
      noManagedServers: "管理中の登録サーバーがありません",
      loginRequired: "ログインが必要です",
      registerPrompt:
        "Discordの管理者権限があるサーバーをOwOGGに登録してコミュニティを始めましょう。",
      registerStart: "サーバー登録を始める",
      publicPage: "公開ページ",
      manageServer: "サーバー管理",
      registeredLabel: "登録日",
      weeklyRankingTitle: "今週のサーバー活動ランキング",
      loadingRanking: "ランキングを読み込み中...",
      emptyWeeklyRanking: "今週登録されたサーバー活動がありません",
      guideTitle: "📌 利用案内",
      guideStep1: "サーバー登録はDiscord管理者（MANAGE_GUILD）権限を持つユーザーのみ可能です。",
      guideStep2: "公開（PUBLIC）登録時はOwOGGディレクトリと検索に表示されます。",
      guideStep3:
        "/owogg playでゲームをプレイすると、このサーバーにXPが貢献され週間ランキングに集計されます。",
      accountLinkTitle: "🔗 Discordアカウント連携",
      accountLinkBody:
        "OwOGGアカウントとDiscordアカウントを連携すると、ボットコマンド（/owogg profile）で自分の情報を確認できます。",
      accountLinkCta: "アカウント連携ページへ",
      usageGuideCta: "Discordの使い方を見る",
    },
    discordSetup: {
      eyebrow: "OwOGG × Discord",
      title: "Discordセットアップガイド",
      subtitle:
        "以下の5ステップに従うだけで、サーバーですぐにOwOGGを使えます。Bot TokenやApplication IDのような値は不要です — それらはOwOGG運営のみが扱います。",
      step1Title: "DiscordにOwOGGを追加",
      step1Description:
        "サーバー管理者権限のあるアカウントでDiscordアプリをサーバーにインストールします。",
      checkingInstallLink: "インストールリンクを確認中...",
      installLinkUnavailable:
        "インストールリンクがまだ準備できていません。サーバー管理者に公式インストールリンクを確認してください。",
      installNote:
        "Discordアプリのインストールと、OwOGGサーバー登録（3ステップ目）は異なります — インストールだけではサーバーが自動登録されません。",
      step2Title: "Discordアカウント連携",
      step2Description:
        "Discordのボットコマンドで自分のOwOGG情報を使えるようアカウントを連携します。",
      checking: "確認中...",
      owoggLoginCta: "OwOGGにログイン",
      linkedNote1: "連携済みです。Discordで",
      linkedNote2: "を使用できます。",
      linkAccountCta: "アカウント連携ページへ",
      step3Title: "サーバー登録",
      step3Description:
        "Discordサーバー管理（MANAGE_GUILD）権限があるサーバーをOwOGGコミュニティとして登録します。",
      loginFirst: "まずOwOGGにログインしてください。",
      alreadyRegisteredPrefix: "すでに",
      alreadyRegisteredSuffix: "個のサーバーを登録・管理しています。",
      registerStartCta: "サーバー登録を開始",
      viewServerDirectory: "サーバーディレクトリを見る",
      step4Title: "/owogg games をテスト",
      step4Description: "Discordチャンネルでスラッシュコマンドが正しく自動補完されるか確認します。",
      notShowingUp: "自動補完に表示されない場合は",
      troubleshootingGuide: "トラブルシューティングガイド",
      checkSuffix: "をご確認ください。",
      step5Title: "/owogg play で開始",
      step5Description: "このサーバーに紐づくプレイリンクを発行し、サーバーXPを貯め始めます。",
      viewFullGuide: "利用ガイド全体を見る",
      footerNote1:
        "一般ユーザーはBot Token、Application ID、Public Keyを入力する必要はありません。詳しくは",
      discordWikiLink: "Discord Wiki",
      footerNote2: "をご確認ください。",
      badgeDone: "完了",
      badgeTodo: "対応が必要",
      badgeUnknown: "自分で確認",
    },
    discordGuide: {
      eyebrow: "OwOGG × Discord",
      heroTitle: "DiscordでOwOGGを使う",
      heroSubtitle:
        "サーバーでゲームを開始し、自分の活動をサーバーXPとリーダーボードで確認しましょう。OwOGGは常駐Gatewayボットではなく、署名付きHTTP Interactionsで動作します。",
      installCta: "Discordに追加",
      installLinkHint: "インストールリンクはサーバー管理者の案内を確認してください",
      serverDirectoryCta: "サーバーディレクトリ",
      stepsAriaLabel: "Discord利用の主要ステップ",
      step1Title: "サーバーにインストール",
      step1Text: "Discordアプリのインストールはサーバー利用の準備段階です。",
      step2Title: "サーバーを登録",
      step2Text: "管理可能なギルドを確認したうえで、公開設定を自分で選びます。",
      step3Title: "ゲームを開始",
      step3Text: "/owogg play のリンクで有効な活動をサーバーに紐づけます。",
      installGuideTitle: "サーバーにインストールする",
      installGuideP1:
        "Discord Developer Portalでアプリのインストール設定を確認したうえで、実際のインストールリンクからサーバーに追加します。",
      installGuideP2:
        "画面にインストールリンクが表示されない場合、権限やアプリケーション設定を確認できない状態です。任意のURLは使わず、サーバー運営者に公式インストールリンクを問い合わせてください。",
      installGuideP3:
        "アプリのインストールだけではOwOGG公開ディレクトリにサーバーは掲載されません。",
      accountGuideTitle: "アカウントを連携する",
      accountStep1Prefix: "Discordで",
      accountStep1Suffix: "を実行",
      accountStep2: "返信された1回限りのリンクを開く",
      accountStep3: "OwOGGにログインして連携を確認",
      openLinkPageCta: "連携ページを開く",
      registerTitle: "サーバーを登録する",
      registerSubtitle: "管理者は次の順序でOwOGGサーバー空間を作成します。",
      registerStep1: "OwOGGにログイン",
      registerStep2: "公式Discord権限を確認",
      registerStep3: "ギルドの選択とslugの設定",
      registerStep4: "PUBLIC / UNLISTED / PRIVATEの選択",
      registerDirectoryCta: "サーバーディレクトリから始める",
      xpTitle: "サーバーXPの計算方法",
      xpSubtitle: "グローバルXPとサーバーXPは同じ数値をコピーする仕組みではありません。",
      xpGlobalTitle: "グローバルXP",
      xpGlobalText: "OwOGG全体の進行度",
      xpGuildATitle: "Guild Aユーザー XP",
      xpGuildAText: "Aで作られた有効な貢献",
      xpGuildBTitle: "Guild B",
      xpGuildBText: "既存のXPは自動コピーされない",
      antiAbuseLabel: "不正防止：",
      antiAbuseText:
        "ユーザー×ゲーム×UTC1日単位でグローバルXPの付与は最大10回までです。上限に達してもゲームの完了は可能ですが、追加のXPは付与されません。",
      commandsTitle: "コマンド",
      commandGamesDesc: "プレイ可能なゲーム一覧を確認します。",
      commandLinkDesc: "DiscordアカウントとOwOGGアカウントを連携します。",
      commandProfileDesc: "連携したアカウントのプロフィール、レベル、グローバルXPを確認します。",
      commandPlayDesc: "サーバーに紐づく1回限りのゲームプレイリンクを作成します。",
      commandRankDesc: "現在のサーバーでの自分のXPと順位を確認します。",
      commandLeaderboardDesc: "現在のサーバーXP Top 10を確認します。",
      commandServerDesc: "サーバー全体のXPと週間活動を確認します。",
      rankingGuideTitle: "サーバーランキングを見る",
      rankingGuideP1:
        "サーバーページでサーバーXP、週間サーバーXP、ゲーム別サーバー参加者記録を確認できます。",
      rankingGuideP2:
        "公開のグローバルサーバー活動ランキングには`PUBLIC`のアクティブなサーバーのみが表示されます。参加者数はOwOGGの活動を作成したユーザー基準であり、Discordの全メンバー数ではありません。",
      viewFullRankingCta: "OwOGG全体ランキングを見る",
      helpGuideTitle: "トラブルシューティング",
      helpP1:
        "サーバーが登録されていないというメッセージが出る場合、管理者がサーバー登録を完了しているか確認してください。",
      helpP2:
        "アカウント連携エラーの場合は`/owogg link`を再実行し、期限切れでないリンクで再確認してください。",
      helpP3:
        "プレイリンクが期限切れ、またはすでに使用済みの場合は新しいリンクを発行する必要があります。",
      faqTitle: "よくある質問",
      faq1Q: "アプリをインストールするとサーバーは自動的に公開されますか？",
      faq1A:
        "いいえ。アプリのインストールとOwOGGサーバー登録は別のものです。管理者がWeb上でギルドを確認し、公開設定を自分で選ぶ必要があります。",
      faq2Q: "OwOGGはDiscordサーバーの全メンバーを取得しますか？",
      faq2A:
        "いいえ。公式OAuthで管理可能なギルドを確認し、XPランキングにはOwOGGの活動を作成した参加者のみを使用します。",
      faq3Q: "既存のグローバルXPを一括でサーバーに取り込めますか？",
      faq3A:
        "いいえ。新しいGuildは0から始まり、`/owogg play`で作られた有効な完了のみがサーバーに紐づきます。",
      faq4Q: "常駐のボットプロセスを実行する必要はありますか？",
      faq4A:
        "v1では不要です。Discord HTTP InteractionsエンドポイントとCloudflare Workerがリクエストを処理します。",
      footerNote: "より詳しい運用手順はDiscord Bot運用ガイドをご確認ください。",
      footerHubCta: "Discord Hubへ移動",
    },
    discordServers: {
      pageTitle: "🔍 Discordサーバーディレクトリ",
      pageSubtitle:
        "OwOGGに登録されたDiscordコミュニティサーバーを探すか、自分のサーバーを新しく登録しましょう。",
      registerCta: "🏰 自分のサーバーを登録する",
      searchPlaceholder: "サーバー名またはvanity slugで検索...",
      searchButton: "検索",
      statusNoGuilds: "管理者（MANAGE_GUILD）権限のあるDiscordサーバーが見つかりません。",
      statusUnauthorized: "サーバー登録にはログインが必要です。",
      statusError: "Discord認証中にエラーが発生しました。もう一度お試しください。",
      candidateLoadError:
        "登録可能なサーバー一覧を読み込めません。トークンが期限切れか、すでに使用されています。",
      guildListFetchError: "サーバー一覧の取得に失敗しました",
      registerFailError: "サーバー登録に失敗しました",
      modalTitle: "🏰 Discordサーバー登録",
      successTitle: "サーバーの登録が完了しました！",
      viewPublicPage: "公開ページを見る",
      manageServer: "サーバーを管理する",
      step1Label: "1. 登録するサーバーを選択（管理中のギルド）",
      step2Label: "2. Vanity Slugアドレスの設定（任意）",
      slugPlaceholder: "自動生成（英小文字、数字、-）",
      step3Label: "3. 公開範囲を選択",
      cancelButton: "キャンセル",
      submittingButton: "登録中...",
      submitButton: "サーバー登録を完了",
      totalCountPrefix: "合計",
      totalCountSuffix: "件の公開サーバーが登録されています。",
      searchTermLabel: "検索キーワード：",
      loadingList: "サーバー一覧を読み込み中...",
      emptyResultsTitle: "検索条件に合う公開サーバーがありません。",
      emptyResultsHint: "別のキーワードで検索するか、新しいサーバーを登録してみてください。",
      owoggServerLabel: "OwOGGサーバー",
      viewPageArrow: "ページを見る →",
    },
    discordServerSlug: {
      loadFailedGeneric: "サーバー情報を読み込めません。",
      loadingServer: "サーバー情報を読み込み中...",
      privateServerTitle: "非公開（PRIVATE）サーバー",
      notFoundTitle: "サーバーが見つかりません",
      privateServerMessage:
        "このサーバーはPRIVATEに設定されており、権限のある管理者のみアクセスできます。",
      backToDirectory: "← ディレクトリに戻る",
      manageServerCta: "⚙️ サーバー管理",
      participantsLabel: "OwOGG参加メンバー",
      participantsUnit: "人",
      participantsHint: "貢献した実績ユーザー数",
      totalXpLabel: "サーバー累計XP",
      totalXpHint: "全ゲーム活動の合計",
      weeklyXpLabel: "今週のサーバーXP",
      weeklyXpHint: "月曜日00:00 KST基準",
      leaderboardTitle: "サーバーリーダーボード",
      tabAlltime: "⚡ サーバーXP",
      tabWeekly: "📅 週間XP",
      tabGames: "🎮 ゲーム別記録",
      emptyAlltimeTitle: "このサーバーにはまだ累計XPがありません",
      emptyAlltimeHintPrefix: "Discordチャンネルで",
      emptyAlltimeHintSuffix: "コマンドを実行してゲームに貢献してみましょう！",
      emptyWeeklyTitle: "今週このサーバーに累計されたXPがありません",
      emptyWeeklyHint: "月曜日00:00 KST以降に最初のプレイを始めて週間ランクを獲得しましょう！",
      loadingGame: "ゲームを読み込み中...",
      emptyGameScoreSuffix: "に記録されたサーバーメンバーのスコアがありません",
      emptyGameHintPrefix: "Discordチャンネルで",
      emptyGameHintSuffix: "コマンドで挑戦してみましょう！",
      infoCardTitle: "OwOGGサーバー情報",
      statusLabel: "ステータス",
      visibilityLabel: "公開範囲",
    },
    discordServerManage: {
      noPermissionError:
        "このサーバーを管理する権限がありません。Discord管理者アカウントでログインしているか確認してください。",
      saveFailedError: "設定の保存に失敗しました",
      unregisterFailedError: "サーバー解除に失敗しました",
      loadingManageInfo: "サーバー管理情報を読み込み中...",
      accessDeniedTitle: "アクセス権限がありません",
      backToDirectory: "← ディレクトリへ移動",
      manageTitleSuffix: "サーバー管理",
      manageSubtitle: "公開/非公開の公開範囲、カスタムVanity Slugアドレス、説明文を設定できます。",
      publicPageArrow: "公開ページ →",
      saveSuccessMessage: "設定が正常に保存されました。",
      slugLabel: "Vanity Slugアドレス（英小文字、数字、-）",
      slugHintPrefix: "変更してもDiscord Guild ID（",
      slugHintSuffix: ")自体は変更されません。",
      visibilityLabel: "サーバー公開範囲（Visibility）",
      visibilityPublicDesc: "検索に表示され、公開ページにアクセス可能",
      visibilityUnlistedDesc: "検索には表示されず、直接リンクでアクセス可能",
      visibilityPrivateDesc: "検索に表示されず、管理者のみアクセス可能",
      descriptionLabel: "サーバー説明文",
      descriptionPlaceholder: "サーバーの特徴やコミュニティ紹介文を入力してください...",
      savingButton: "保存中...",
      saveButton: "設定を保存",
      dangerZoneTitle: "危険区域（Danger Zone）",
      dangerZoneText:
        "サーバー登録を解除すると、OwOGGディレクトリから除外され`DISABLED`状態になります。（Discordサーバー自体には影響しません）",
      unregisterButton: "サーバー登録解除",
      unregisterConfirmTitle: "サーバー登録を解除しますか？",
      unregisterConfirmBodySuffix: "サーバーがOwOGGディレクトリと検索から除外されます。",
      cancelButton: "キャンセル",
      unregisteringButton: "解除中...",
      confirmUnregisterButton: "確認（解除する）",
    },
    discordLink: {
      checkingLinkInfo: "連携情報を確認中...",
      invalidTitle: "無効な連携リンクです",
      invalidBodyPrefix: "リンクが期限切れか、すでに使用されています。Discordサーバーで",
      invalidBodySuffix: "を再度実行してください。",
      linkingInProgress: "Discordアカウントを連携中...",
      errorTitle: "連携に失敗しました",
      genericErrorMessage: "連携中にエラーが発生しました。",
      alreadyLinkedTitle: "すでに連携済みです",
      linkedTitle: "Discordアカウントが連携されました",
      successBodyPrefix: "これでDiscordで",
      successBodySuffix: "コマンドを使ってOwOGGアカウント情報を確認できます。",
      goToProfileCta: "マイプロフィールへ移動",
      linkAccountTitle: "Discordアカウント連携",
      confirmPromptPrefix: "Discordアカウント",
      confirmPromptSuffix: "を現在ログイン中のOwOGGアカウントと連携しますか？",
      loginRequiredHint: "連携するには、まずOwOGGにログインしてください。",
      loginCta: "ログインする",
      linkCta: "連携する",
    },
    wiki: {
      navGettingStarted: "はじめに",
      navDiscordOverview: "Discord概要",
      navDiscordInstall: "インストール",
      navDiscordAccountLink: "アカウント連携",
      navDiscordServerRegistration: "サーバー登録",
      navDiscordCommands: "コマンド",
      navDiscordXp: "サーバーXP",
      navDiscordTroubleshooting: "トラブルシューティング",
      navAccount: "アカウント",
      navAccountOverview: "アカウント概要",
      navAccountMerge: "アカウント統合",
      navGamesRanking: "ゲームとランキング",
      navGamesOverview: "ゲーム概要",
      navRanking: "ランキング",
      navGamesXp: "XPとレベル",
      navCreatorOverview: "Creator概要",
      navCreatorVerification: "チャンネル所有権認証",
      navCreatorFeatured: "Featured Creator",
      tocAriaLabel: "Wiki目次",
      homeTitle: "知りたいことをすぐに見つけよう",
      homeSubtitle:
        "Discordのインストールからランキングの計算方法まで、OwOGGを使うために必要な説明を一箇所にまとめました。",
      homeInstallPrompt: "もっと早くDiscordをインストールしたいですか？",
      homeInstallGuideLink: "5ステップのインストールガイド",
      homeInstallGuideSuffix: "へ直接移動しましょう。",
      catDiscordDesc:
        "サーバーへのインストール、アカウント連携、サーバー登録、コマンド、サーバーXP、トラブルシューティング。",
      catGettingStartedDesc: "OwOGGアカウントの作成から最初のゲームまで、最短ルート。",
      catAccountDesc:
        "ログイン方法、プロフィール設定、複数アカウントを1つに統合するアカウント統合。",
      catGamesDesc: "ゲームカタログ、順位の計算方法、経験値（XP）とレベル。",
      catCreatorDesc: "チャンネル所有権認証、ストリーマーランキング資格、Featured Creator基準。",
    },
    wikiBody: {
      creator: {
        title: "Creator 概要",
        description:
          "公式OAuth/APIでチャンネル所有権を検証したストリーマー・YouTuberをOwOGG Creatorとして認定します。",
        intro:
          "Creator認証はゲームスコアやXPに一切の加点を与えません。代わりに、殿堂のストリーマーランキングタブへの掲載、プロフィールの認証バッジと公式チャンネルリンクの表示という特典があります。",
        cardVerification: "チャンネル所有権認証 →",
        cardVerificationDesc: "対応プラットフォームと認証方法",
        cardFeatured: "Featured Creator →",
        cardFeaturedDesc: "Featured 資格基準",
        profileHint: "認証はプロフィールページから開始できます。",
        profileLink: "プロフィールへ移動",
      },
      creatorVerification: {
        title: "チャンネル所有権認証",
        description:
          "公式OAuthとAPIのみで所有権を検証します。テキスト入力やスクレイピングは一切使用しません。",
        platformsHeading: "対応プラットフォーム",
        conditionsHeading: "認証条件",
        condOnePrefix: "上記4つのプラットフォーム（YouTube · CHZZK · SOOP · Twitch）のうち",
        condOneStrong: "1つだけ",
        condOneSuffix:
          "認証に成功すればOwOGG Creatorとして認定され、4つすべてを認証する必要はありません。",
        condNoMinimum:
          "現在、登録者・フォロワー数やチャンネル開設期間の最低基準は設けていません。チャンネル所有権が公式OAuthで確認できれば十分です。",
        condOauthOnly:
          "所有権認証は常に各プラットフォームの公式OAuthログイン画面を通じてのみ行われ、チャンネルURLやニックネームを直接入力する方式には対応していません。",
        condOneChannelOneAccount:
          "1つの外部チャンネルは1つのOwOGGアカウントにのみ連携できます（1チャンネル = 1アカウント）。",
        methodHeading: "認証方法",
        step1: "プロフィールページの［クリエイターチャンネル所有権認証］セクションへ移動します。",
        step2: "認証したいプラットフォームの［チャンネル所有権認証］ボタンをクリックします。",
        step3: "該当プラットフォームの公式ログイン画面でご本人のアカウントでログイン・承認します。",
        step4: "OwOGGに戻ると、チャンネル情報が自動的に確認され表示されます。",
        calloutLoginStrong: "OwOGGへのログインとチャンネル認証は別物です。",
        calloutLoginBody:
          " Googleでログインしたからといって自動的にYouTubeチャンネルが連携されるわけではありません — 明示的な認証手続きが必要です。",
        calloutDuplicate:
          "1つの外部チャンネルは1つのOwOGGアカウントにのみ連携できます。すでに他のユーザーが認証したチャンネルを再度認証することはできません。",
        footerPrefix: "ストリーマーランキングに掲載されるには、上記4つのうち",
        footerStrong: "1つだけ",
        footerMid: "認証すれば十分です。詳しい資格条件は",
        footerLink: "ランキングのドキュメント",
        footerSuffix: "をご覧ください。",
      },
      creatorFeatured: {
        title: "Featured Creator",
        description:
          "FeaturedはOwOGG基準の公開チャンネル指標で審査する、表示・フィルタリング専用のバッジです。",
        conceptHeading: "概念の区別",
        conceptCreatorTerm: "Creator",
        conceptCreatorDesc: " — 公式OAuth/APIでチャンネル所有権が検証された状態。",
        conceptFeaturedTerm: "Featured Creator",
        conceptFeaturedDesc:
          " — Creatorのうち、OwOGG基準（登録者・フォロワー数、チャンネル開設期間などの公開指標）を満たし自動・手動審査を通過した状態。",
        reviewHeading: "審査方式",
        reviewBody:
          "チャンネル所有権の認証直後にFeaturedが即時付与されることはありません。一定時間後に新しい公式指標で自動再審査が行われ、指標が曖昧な場合やプラットフォームが公式APIで指標を提供していない場合は、運営による手動審査へ安全に回されます。Featured認定後も定期的に再検証します。",
        calloutNoRankImpactStrong: "Featuredはスコア・XP・ランキング順位に影響しません。",
        calloutNoRankImpactBody:
          " 表示専用のバッジであり、Featuredの有無に関わらずストリーマーランキングはチャンネル所有権の認証のみで掲載されます。",
        calloutTestingPhase:
          "現在はサービス検証段階のためFeaturedは自動付与されず、チャンネル所有権が認証されたすべてのCreatorが運営の手動審査待ち状態を経ます。ストリーマーランキングにはFeaturedの有無に関わらず同様に掲載され、Featuredバッジもまだ公開表示していません。",
        footerNote:
          "運営の審査基準と手順は内部運用ドキュメントとして別途管理され、具体的な数値は公開していません — 審査には常に公式APIで確認可能な指標のみを使用します。",
      },
      account: {
        title: "アカウント概要",
        description:
          "OwOGGはGoogleとDiscordのログインに対応しており、2つは基本的に別々のアカウントです。",
        loginHeading: "ログイン方法",
        loginBody:
          "GoogleまたはDiscordでログインできます。同じ方であっても、Googleで作成したアカウントとDiscordで作成したアカウントは基本的に別のOwOGGアカウントです — 自動的に統合されることはありません。",
        profileHeading: "プロフィール設定",
        profileBody:
          "プロフィールページでニックネームと国・地域を設定でき、レベル・XP・実績・お気に入り・最近プレイした記録を確認できます。",
        profileLink: "プロフィールへ移動 →",
        calloutPrefix: "GoogleとDiscordのアカウントを別々に作成した場合は、",
        calloutLink: "アカウント統合",
        calloutSuffix: "機能で1つにまとめられます。",
      },
      accountMerge: {
        title: "アカウント統合",
        description:
          "Primary Account Wins方式 — 残すアカウント（Primary）を先に選んでから進めます。",
        howHeading: "統合方式: Primary Account Wins",
        howBodyPrefix: "2つのアカウントのうち、使い続ける方を",
        howBodyPrimary: "Primary",
        howBodySuffix:
          "に指定します。統合が完了すると、Primaryのゲーム記録・XP・パーソナライズ設定はそのまま維持され、Secondaryの該当データは統合されずに整理されます。Secondaryに紐づいていたGoogle/Discordのログイン手段のみがPrimaryへ移り、以降はどちらの手段でログインしても同じPrimaryアカウントに入ります。",
        stepsHeading: "手順",
        step1: "使い続けるアカウント（Primary）でログインします。",
        step2: "アカウント統合を開始し、統合対象のアカウント（Secondary）で本人確認を行います。",
        step3: "統合内容を確認します — Secondaryのゲーム・パーソナライズデータは維持されません。",
        step4: "確認後、統合を確定します。",
        step5: "以降はSecondaryだったログイン手段でもPrimaryアカウントにログインできます。",
        calloutNoMergeStrong: "記録は統合されません。",
        calloutNoMergeBody:
          " Primaryのスコア・XP・進行度のみが維持され、Secondaryの記録は統合後に失われます — 必ず残したいアカウントをPrimaryとして選択してください。",
        calloutAdminStrong: "Secondaryが管理者アカウントの場合、統合はブロックされます。",
        calloutAdminBody:
          " 管理者権限を持つアカウントをSecondaryとして統合すると、その権限がどこにも移らずに失われる可能性があるため、OwOGGは安全のためこの場合の統合自体を防ぎ、運営による個別対応を必要とします。",
        footerPrefix:
          "プラットフォーム所有権認証（Creator）済みのアカウントを統合する場合のルールは、",
        footerLink: "Creatorチャンネル所有権認証",
        footerSuffix: "のドキュメントをご覧ください。",
      },
      games: {
        title: "ゲームとランキングの概要",
        description:
          "OwOGGは反応速度、順序記憶、エイム、タイピング速度などのミニゲームカタログを提供します。",
        intro:
          "各ゲームは独立したルールとスコア方式を持ち、有効な記録は自動的にランキングへ反映されます。プレイとは別に、活動そのものも経験値（XP）として蓄積されます。",
        cardRanking: "ランキング →",
        cardRankingDesc: "ゲーム別・ストリーマーランキングの計算方式",
        cardXp: "XPとレベル →",
        cardXpDesc: "経験値の付与方式とレベル計算式",
        footerPrefix: "今すぐ",
        footerLink: "ゲームカタログ",
        footerSuffix: "からプレイしてみましょう。",
      },
      gamesRanking: {
        title: "ランキング",
        description:
          "殿堂（/ranking）はゲームランキング、経験値ランキング、ストリーマーランキングの3つのタブで構成されています。",
        gameHeading: "ゲームランキング",
        gameBody:
          "ゲームごとの自己ベスト（Personal Best）を基準に並びます。同じゲームを何度プレイしても、ランキングに反映されるのは最も良い記録1件のみです。",
        xpHeading: "経験値（XP）ランキング",
        xpBodyPrefix: "累計グローバルXPを基準に並びます。詳しい付与方式は",
        xpBodyLink: "XPとレベルのドキュメント",
        xpBodySuffix: "をご覧ください。",
        streamerHeading: "ストリーマーランキング",
        streamerBodyPrefix: "YouTube / CHZZK / SOOP / Twitch のうち",
        streamerBodyStrong: "1つ以上",
        streamerBodySuffix:
          "のプラットフォームで公式チャンネル所有権認証を完了したユーザーのみが表示されます。順位の値は通常のゲームランキング・XPランキングと同じ計算式を使用し、認証したプラットフォームの数は順位に影響しません — 右端のプラットフォームアイコンはフィルタリング・表示専用です。",
        streamerLinkPrefix: "詳しい認証方法は",
        streamerLink: "Creatorチャンネル所有権認証",
        streamerLinkSuffix: "のドキュメントをご覧ください。",
        calloutFeatured:
          "Featured Creatorの表示は、ランキング順位やXP計算に一切影響しない表示専用のバッジです。",
        footerPrefix: "Discordサーバー単位のランキングは",
        footerLink: "DiscordサーバーXPのドキュメント",
        footerSuffix: "をご覧ください。",
      },
      gamesXp: {
        title: "XPとレベル",
        description:
          "ゲームを有効に完了するたびに経験値が貯まり、累計経験値に応じてレベルが上がります。",
        grantHeading: "XPの付与",
        grantPerPlay: "認められたゲーム完了1回につき10 XPが付与されます。",
        grantDailyCap: "同じゲームは1日（UTC基準）最大10回までXPが付与されます。",
        grantAfterCap:
          "上限に達してもゲームのプレイ自体は続けられます — 追加のXPが付与されなくなるだけです。",
        formulaHeading: "レベル計算式",
        formulaPrefix: "レベルLに到達するために必要な累計XPは",
        formulaSuffix: "です。レベルが上がるほど、次のレベルまでに必要なXPは増えていきます。",
        calloutPrefix: "DiscordサーバーでのXPとグローバルXPの関係が気になる方は",
        calloutLink: "DiscordサーバーXPのドキュメント",
        calloutSuffix: "をご確認ください。",
        footerPrefix: "自分のレベルとXPは",
        footerProfileLink: "プロフィール",
        footerMid: "で、全体の順位は",
        footerRankingLink: "殿堂",
        footerSuffix: "で確認できます。",
      },
      gettingStarted: {
        title: "はじめる",
        description: "最速で最初のゲームをプレイし、記録を残すための手順です。",
        flowHeading: "基本の流れ",
        step1: "OwOGGアカウントでログインします（GoogleまたはDiscord）。",
        step2: "ゲームカタログから好きなミニゲームを選びます。",
        step3: "ゲームをプレイして結果を確認します — 有効な記録は自動的に保存されます。",
        step4: "殿堂（ランキング）で自分の順位とXPを確認します。",
        step5: "必要であればDiscordを連携し、サーバーの友達と競い合います。",
        calloutGuest:
          "ゲストのままでもゲームをプレイできます。ただし記録がアカウントに保存され、ランキング・XPに反映されるにはログインが必要です。",
        cardCatalog: "ゲームカタログ →",
        cardCatalogDesc: "今すぐプレイするゲームを選ぶ",
        cardRanking: "殿堂 →",
        cardRankingDesc: "ゲーム・XP・ストリーマーランキングを確認",
        footerPrefix: "Discordサーバーで友達と一緒に遊びたい場合は",
        footerDiscordLink: "Discordのドキュメント",
        footerMid: "を、アカウント設定は",
        footerAccountLink: "アカウントのドキュメント",
        footerSuffix: "をご確認ください。",
      },
    },
    platformIcon: {
      chzzkLabel: "CHZZK",
      soopLabel: "SOOP",
      channelSuffix: "チャンネル",
      verifiedPlatforms: "認証済みプラットフォーム",
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
      title: "登录 OwOGG",
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
      platformChzzk: "CHZZK",
      platformSoop: "SOOP",
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
        "OwOGG 创作者频道所有权认证服务正在筹备中。认证创作者的游戏最高记录和活动 XP 将显示在这里。",
      retryButton: "重试",
      rank1: "第1名",
      rank2: "第2名",
      rank3: "第3名",
    },
    profile: {
      myProfileTab: "我的资料",
      recordsTab: "记录",
      joinedLabel: "加入日期",
      logout: "退出登录",
      favoritesTitle: "收藏",
      emptyFavorites: "还没有收藏的游戏。点击游戏卡片上的收藏图标即可添加。",
      recentPlaysTitle: "最近玩过",
      achievementsTitle: "成就",
      emptyAchievements: "还没有解锁的成就。快去玩游戏并添加收藏吧！",
      noRecordLabel: "该账户暂无记录",
      deviceRecordLabel: "设备记录",
      noRecordYetHint: "还没有记录 — 现在就去挑战吧！",
      justNow: "刚刚",
      minutesAgoSuffix: "分钟前",
      hoursAgoSuffix: "小时前",
      daysAgoSuffix: "天前",
      linkSuccess: "登录方式已关联。",
      alreadyLinkedAccount: "该账户已经关联。",
      linkError: "关联登录方式时发生错误。",
      creatorVerifySuccess: "创作者频道所有权认证已完成。",
      creatorVerifyConflict: "该频道已关联到另一个 OwOGG 创作者账户。",
      creatorVerifyUnconfigured: "当前该平台的认证暂不可用。",
      creatorVerifyUnauthorized: "登录已过期，请重新登录。",
      creatorVerifyError: "创作者频道认证过程中发生错误。",
      googleScriptNotReady: "Google 登录脚本尚未准备就绪。",
      googleLinkSuccess: "Google 登录已关联。",
      googleAccountInUse: "该 Google 账户已被另一个 OwOGG 账户使用。",
      googleAlreadyLinked: "该账户已经关联了 Google 登录。",
      googleLinkFailed: "关联 Google 账户失败。",
      unlinkSuccessSuffix: "的关联已解除。",
      lastAuthProviderError: "无法解除最后一个登录方式的关联。",
      unlinkFailed: "解除关联失败。",
      mergeCompleted: "账户合并已完成。",
      nicknameUpdated: "昵称已修改。",
      nicknameCooldownPrefix: "昵称需在",
      nicknameCooldownSuffix: "之后才能再次修改。",
      nicknameUpdateFailed: "修改昵称失败。",
      countryUpdated: "国家/地区已修改。",
      countryCooldownPrefix: "国家/地区需在",
      countryCooldownSuffix: "之后才能再次修改。",
      countryUpdateFailed: "修改国家/地区失败。",
      loginRequiredTitle: "此页面需要登录",
      loginRequiredBody: "使用 Google 或 Discord 账户登录，管理你的游戏记录。",
      loginRequiredCta: "去登录",
      backButton: "返回上一页",
      levelLabel: "等级",
      globalXpRankPrefix: "全局 XP 排名 #",
      totalXpPrefix: "共 ",
      settingsTitle: "个人资料设置",
      nicknameLabel: "昵称",
      nicknamePlaceholder: "请输入昵称",
      changeButton: "修改",
      countryLabel: "国家/地区",
      countryHint: "（可选，为自行填写信息，并非国籍认证）",
      countryNotSet: "未设置",
      itemsCountSuffix: " 个",
      emptyRecentPlays: "暂无游玩记录。游玩游戏后会显示在这里。",
      connectedAccountsTitle: "已关联的登录账户",
      linkedStatus: "已关联",
      notLinkedStatus: "未关联",
      unlinkButton: "解除关联",
      linkButton: "关联",
      creatorVerificationTitle: "创作者频道所有权认证",
      creatorVerificationSubtitle:
        "通过官方 OAuth / API 验证你直接拥有该频道。（禁止自行填写文本或网页抓取）",
      ownershipVerified: "已认证所有权",
      unverified: "未认证",
      verifiedConfirmedText: "✓ OwOGG 已通过官方 API 确认该用户的频道所有权。",
      audienceCountLabel: "订阅者/关注者",
      audienceUnit: " 人",
      metricsSyncedPrefix: "· 数据同步于",
      verifyChannelCta: "认证频道所有权",
      verifyUnavailable: "当前无法使用认证功能",
      featuredReviewStatusTitle: "Featured 审核状态",
      featuredCreatorLabel: "★ Featured Creator",
      featuredSelectedSuffix: "入选",
      featuredHint:
        "Featured 基于官方频道数据资格（订阅者/关注者 12,000+ · 频道运营 120 天以上），不会影响游戏分数、XP 或排行榜排名。",
      achievedSuffix: "已达成",
      myGameRecordsTitle: "我的各游戏最高记录",
      challengeSuffix: "已挑战",
      viewFullRankingArrow: "查看完整排行榜 →",
      reviewNotStarted: "频道所有权认证完成后将开始自动审核。（约 6 小时后进行首次审核）",
      autoReviewPending: "自动审核等待中",
      nextReviewPrefix: "（下次审核",
      notEligible: "当前未达标准",
      manualReviewNeeded: "需要进一步确认",
      autoReviewFailed: "自动审核暂时失败（等待重试）",
      nextRetryPrefix: "— 下次重试",
    },
    discord: {
      heroTitle1: "与朋友一起",
      heroTitle2: "比拼游戏记录、畅快交流",
      heroSubtitle: "将 OwOGG Discord Bot 添加到你的服务器，打造专属社区排行榜和服务器专属页面。",
      installCta: "将 OwOGG 添加到 Discord",
      setupCta: "🧭 安装指南（5 步）",
      searchCta: "🔍 搜索服务器",
      registerCta: "⚡ 注册我的服务器（需管理员权限）",
      guideCta: "📖 Discord 使用指南",
      managedServersTitle: "🛡️ 我管理的注册服务器",
      exploreAll: "查看全部 →",
      loadingServers: "正在加载服务器列表...",
      noManagedServers: "暂无你管理的注册服务器",
      loginRequired: "需要登录",
      registerPrompt: "注册一个你拥有 Discord 管理员权限的服务器，开启你的社区。",
      registerStart: "开始注册服务器",
      publicPage: "公开页面",
      manageServer: "管理服务器",
      registeredLabel: "注册日期",
      weeklyRankingTitle: "本周服务器活跃排行榜",
      loadingRanking: "正在加载排行榜...",
      emptyWeeklyRanking: "本周暂无服务器活跃记录",
      guideTitle: "📌 使用说明",
      guideStep1: "只有拥有 Discord 管理员（MANAGE_GUILD）权限的用户才能注册服务器。",
      guideStep2: "公开（PUBLIC）注册后，将出现在 OwOGG 目录和搜索结果中。",
      guideStep3: "通过 /owogg play 游玩游戏会为该服务器贡献 XP，并计入每周排行榜。",
      accountLinkTitle: "🔗 关联 Discord 账户",
      accountLinkBody:
        "将 OwOGG 账户与 Discord 账户关联后，可通过机器人命令（/owogg profile）查看你的信息。",
      accountLinkCta: "前往账户关联页面",
      usageGuideCta: "查看 Discord 使用方法",
    },
    discordSetup: {
      eyebrow: "OwOGG × Discord",
      title: "Discord 安装指南",
      subtitle:
        "只需按照以下 5 个步骤，即可在服务器中直接使用 OwOGG。你不需要 Bot Token、Application ID 之类的值——这些仅由 OwOGG 运营团队负责处理。",
      step1Title: "将 OwOGG 添加到 Discord",
      step1Description: "使用拥有服务器管理员权限的账户将 Discord 应用安装到服务器。",
      checkingInstallLink: "正在确认安装链接...",
      installLinkUnavailable: "安装链接尚未准备好，请向服务器管理员咨询官方安装链接。",
      installNote:
        "安装 Discord 应用与注册 OwOGG 服务器（第 3 步）不同——仅安装并不会自动注册服务器。",
      step2Title: "关联 Discord 账户",
      step2Description: "关联账户后即可在 Discord 机器人命令中使用你的 OwOGG 信息。",
      checking: "正在确认...",
      owoggLoginCta: "登录 OwOGG",
      linkedNote1: "已关联。你可以在 Discord 中使用",
      linkedNote2: "。",
      linkAccountCta: "前往账户关联页面",
      step3Title: "注册服务器",
      step3Description:
        "将你拥有 Discord 服务器管理（MANAGE_GUILD）权限的服务器注册为 OwOGG 社区。",
      loginFirst: "请先登录 OwOGG。",
      alreadyRegisteredPrefix: "你已经注册/管理了 ",
      alreadyRegisteredSuffix: " 个服务器。",
      registerStartCta: "开始注册服务器",
      viewServerDirectory: "查看服务器目录",
      step4Title: "测试 /owogg games",
      step4Description: "确认斜杠命令在 Discord 频道中能正常自动补全。",
      notShowingUp: "如果自动补全中没有显示，请查看",
      troubleshootingGuide: "故障排查指南",
      checkSuffix: "。",
      step5Title: "使用 /owogg play 开始",
      step5Description: "获取绑定该服务器的游玩链接，开始积累服务器 XP。",
      viewFullGuide: "查看完整使用指南",
      footerNote1: "普通用户无需输入 Bot Token、Application ID 或 Public Key。详情请查看",
      discordWikiLink: "Discord Wiki",
      footerNote2: "。",
      badgeDone: "已完成",
      badgeTodo: "待处理",
      badgeUnknown: "请自行确认",
    },
    discordGuide: {
      eyebrow: "OwOGG × Discord",
      heroTitle: "在 Discord 中使用 OwOGG",
      heroSubtitle:
        "在服务器中开始游戏，并通过服务器 XP 和排行榜查看你的活动。OwOGG 并非常驻 Gateway 机器人，而是通过签名的 HTTP Interactions 运行。",
      installCta: "添加到 Discord",
      installLinkHint: "请向服务器管理员咨询安装链接",
      serverDirectoryCta: "服务器目录",
      stepsAriaLabel: "使用 Discord 的核心步骤",
      step1Title: "安装到服务器",
      step1Text: "安装 Discord 应用是使用服务器功能的准备步骤。",
      step2Title: "注册服务器",
      step2Text: "确认可管理的服务器后，自行选择是否公开。",
      step3Title: "开始游戏",
      step3Text: "通过 /owogg play 链接将有效活动归属到服务器。",
      installGuideTitle: "安装到服务器",
      installGuideP1:
        "在 Discord 开发者门户确认应用的 Installation 设置后，通过真实的安装链接添加到服务器。",
      installGuideP2:
        "如果画面上没有安装链接，说明应用无法确认权限或应用配置。请勿使用随意的 URL，应向服务器运营者索取官方安装链接。",
      installGuideP3: "仅安装应用不会使服务器出现在 OwOGG 公开目录中。",
      accountGuideTitle: "关联账户",
      accountStep1Prefix: "在 Discord 中执行",
      accountStep1Suffix: "",
      accountStep2: "打开回复中的一次性链接",
      accountStep3: "登录 OwOGG 后确认关联",
      openLinkPageCta: "打开关联页面",
      registerTitle: "注册服务器",
      registerSubtitle: "管理员按以下顺序创建 OwOGG 服务器空间。",
      registerStep1: "登录 OwOGG",
      registerStep2: "确认官方 Discord 权限",
      registerStep3: "选择服务器并设置 slug",
      registerStep4: "选择 PUBLIC / UNLISTED / PRIVATE",
      registerDirectoryCta: "从服务器目录开始",
      xpTitle: "服务器 XP 的计算方式",
      xpSubtitle: "全局 XP 与服务器 XP 并非复制同一数值。",
      xpGlobalTitle: "全局 XP",
      xpGlobalText: "OwOGG 整体进度",
      xpGuildATitle: "Guild A 用户 XP",
      xpGuildAText: "在 A 中产生的有效贡献",
      xpGuildBTitle: "Guild B",
      xpGuildBText: "已有 XP 不会自动复制",
      antiAbuseLabel: "防刷机制：",
      antiAbuseText:
        "按用户 × 游戏 × UTC 每日计算，全局 XP 最多发放 10 次。达到上限后仍可完成游戏，但不再发放额外 XP。",
      commandsTitle: "命令",
      commandGamesDesc: "查看可游玩的游戏列表。",
      commandLinkDesc: "关联 Discord 账户与 OwOGG 账户。",
      commandProfileDesc: "查看已关联账户的资料、等级和全局 XP。",
      commandPlayDesc: "创建绑定该服务器的一次性游玩链接。",
      commandRankDesc: "查看你在当前服务器的 XP 和排名。",
      commandLeaderboardDesc: "查看当前服务器 XP 前 10 名。",
      commandServerDesc: "查看服务器总 XP 和每周活动情况。",
      rankingGuideTitle: "查看服务器排行榜",
      rankingGuideP1: "在服务器页面可查看服务器 XP、每周服务器 XP 以及各游戏的服务器参与者记录。",
      rankingGuideP2:
        "公开的全局服务器活动排行榜仅显示状态为 `PUBLIC` 的活跃服务器。参与人数按创建过 OwOGG 活动的用户计算，而非 Discord 成员总数。",
      viewFullRankingCta: "查看 OwOGG 完整排行榜",
      helpGuideTitle: "故障排查",
      helpP1: "如果提示服务器未注册，请确认管理员是否已完成服务器注册。",
      helpP2: "账户关联出错时，请重新执行 `/owogg link` 并使用未过期的链接重新确认。",
      helpP3: "如果游玩链接已过期或已被使用，需要重新发放新链接。",
      faqTitle: "常见问题",
      faq1Q: "安装应用后服务器会自动公开吗？",
      faq1A:
        "不会。安装应用与在 OwOGG 注册服务器是分开的步骤。管理员需要在网页上确认服务器并自行选择可见性。",
      faq2Q: "OwOGG 会获取 Discord 服务器的所有成员吗？",
      faq2A:
        "不会。系统通过官方 OAuth 确认可管理的服务器，XP 排行榜仅统计创建过 OwOGG 活动的参与者。",
      faq3Q: "可以将已有的全局 XP 一次性导入服务器吗？",
      faq3A:
        "不可以。新的服务器从 0 开始，仅通过 `/owogg play` 产生的有效完成记录才会归属到该服务器。",
      faq4Q: "需要运行常驻的机器人进程吗？",
      faq4A: "v1 中不需要。Discord HTTP Interactions 端点与 Cloudflare Worker 负责处理请求。",
      footerNote: "更详细的运营流程请参阅 Discord Bot 运营指南。",
      footerHubCta: "前往 Discord Hub",
    },
    discordServers: {
      pageTitle: "🔍 Discord 服务器目录",
      pageSubtitle: "浏览已在 OwOGG 注册的 Discord 社区服务器，或注册你自己的服务器。",
      registerCta: "🏰 注册我的服务器",
      searchPlaceholder: "按服务器名称或专属 slug 搜索...",
      searchButton: "搜索",
      statusNoGuilds: "未找到你拥有管理员（MANAGE_GUILD）权限的 Discord 服务器。",
      statusUnauthorized: "注册服务器需要先登录。",
      statusError: "Discord 认证过程中发生错误，请重试。",
      candidateLoadError: "无法加载可注册的服务器列表。令牌可能已过期或已被使用。",
      guildListFetchError: "获取服务器列表失败",
      registerFailError: "服务器注册失败",
      modalTitle: "🏰 注册 Discord 服务器",
      successTitle: "服务器注册成功！",
      viewPublicPage: "查看公开页面",
      manageServer: "管理服务器",
      step1Label: "1. 选择要注册的服务器（你管理的服务器）",
      step2Label: "2. 设置专属 Slug 地址（可选）",
      slugPlaceholder: "自动生成（小写字母、数字、-）",
      step3Label: "3. 选择可见性",
      cancelButton: "取消",
      submittingButton: "正在注册...",
      submitButton: "完成服务器注册",
      totalCountPrefix: "共有 ",
      totalCountSuffix: " 个公开服务器已注册。",
      searchTermLabel: "搜索关键词：",
      loadingList: "正在加载服务器列表...",
      emptyResultsTitle: "没有符合搜索条件的公开服务器。",
      emptyResultsHint: "请尝试其他关键词，或注册一个新服务器。",
      owoggServerLabel: "OwOGG 服务器",
      viewPageArrow: "查看页面 →",
    },
    discordServerSlug: {
      loadFailedGeneric: "无法加载服务器信息。",
      loadingServer: "正在加载服务器信息...",
      privateServerTitle: "私密（PRIVATE）服务器",
      notFoundTitle: "未找到服务器",
      privateServerMessage: "该服务器设置为 PRIVATE 可见性，仅拥有权限的管理员可以访问。",
      backToDirectory: "← 返回目录",
      manageServerCta: "⚙️ 服务器管理",
      participantsLabel: "OwOGG 参与成员",
      participantsUnit: " 人",
      participantsHint: "产生贡献的实际用户数",
      totalXpLabel: "服务器累计 XP",
      totalXpHint: "所有游戏活动的总和",
      weeklyXpLabel: "本周服务器 XP",
      weeklyXpHint: "以周一 00:00 KST 为准",
      leaderboardTitle: "服务器排行榜",
      tabAlltime: "⚡ 服务器 XP",
      tabWeekly: "📅 每周 XP",
      tabGames: "🎮 按游戏记录",
      emptyAlltimeTitle: "该服务器暂无累计 XP",
      emptyAlltimeHintPrefix: "在 Discord 频道中执行",
      emptyAlltimeHintSuffix: "命令，为游戏贡献一份力量吧！",
      emptyWeeklyTitle: "本周该服务器暂无累计 XP",
      emptyWeeklyHint: "在周一 00:00 KST 之后开始首次游玩，占据本周排名吧！",
      loadingGame: "正在加载游戏...",
      emptyGameScoreSuffix: "暂无服务器成员的记录分数",
      emptyGameHintPrefix: "在 Discord 频道中使用",
      emptyGameHintSuffix: "命令来挑战吧！",
      infoCardTitle: "OwOGG 服务器信息",
      statusLabel: "状态",
      visibilityLabel: "可见性",
    },
    discordServerManage: {
      noPermissionError: "你没有管理该服务器的权限。请确认已使用 Discord 管理员账户登录。",
      saveFailedError: "保存设置失败",
      unregisterFailedError: "取消注册服务器失败",
      loadingManageInfo: "正在加载服务器管理信息...",
      accessDeniedTitle: "无访问权限",
      backToDirectory: "← 前往目录",
      manageTitleSuffix: "服务器管理",
      manageSubtitle: "可设置公开/私密可见性、自定义专属 Slug 地址以及描述文字。",
      publicPageArrow: "公开页面 →",
      saveSuccessMessage: "设置已成功保存。",
      slugLabel: "专属 Slug 地址（小写字母、数字、-）",
      slugHintPrefix: "更改后 Discord Guild ID（",
      slugHintSuffix: "）本身不会改变。",
      visibilityLabel: "服务器可见性（Visibility）",
      visibilityPublicDesc: "可被搜索到并可访问公开页面",
      visibilityUnlistedDesc: "不会出现在搜索中，可通过直接链接访问",
      visibilityPrivateDesc: "不会出现在搜索中，仅管理员可访问",
      descriptionLabel: "服务器描述文字",
      descriptionPlaceholder: "请输入服务器特色或社区介绍...",
      savingButton: "正在保存...",
      saveButton: "保存设置",
      dangerZoneTitle: "危险区域（Danger Zone）",
      dangerZoneText:
        "取消注册后，服务器将从 OwOGG 目录中移除并变为 `DISABLED` 状态。（不会影响 Discord 服务器本身）",
      unregisterButton: "取消注册服务器",
      unregisterConfirmTitle: "确定要取消注册该服务器吗？",
      unregisterConfirmBodySuffix: "服务器将从 OwOGG 目录和搜索中移除。",
      cancelButton: "取消",
      unregisteringButton: "正在取消注册...",
      confirmUnregisterButton: "确认（取消注册）",
    },
    discordLink: {
      checkingLinkInfo: "正在确认关联信息...",
      invalidTitle: "无效的关联链接",
      invalidBodyPrefix: "链接已过期或已被使用。请在 Discord 服务器中重新执行",
      invalidBodySuffix: "。",
      linkingInProgress: "正在关联 Discord 账户...",
      errorTitle: "关联失败",
      genericErrorMessage: "关联过程中发生错误。",
      alreadyLinkedTitle: "已经关联",
      linkedTitle: "Discord 账户已关联",
      successBodyPrefix: "现在可以在 Discord 中使用",
      successBodySuffix: "命令查看你的 OwOGG 账户信息。",
      goToProfileCta: "前往我的资料",
      linkAccountTitle: "关联 Discord 账户",
      confirmPromptPrefix: "确定要将 Discord 账户",
      confirmPromptSuffix: "与当前登录的 OwOGG 账户关联吗？",
      loginRequiredHint: "关联前请先登录 OwOGG。",
      loginCta: "去登录",
      linkCta: "关联账户",
    },
    wiki: {
      navGettingStarted: "新手指南",
      navDiscordOverview: "Discord 概览",
      navDiscordInstall: "安装",
      navDiscordAccountLink: "账户关联",
      navDiscordServerRegistration: "服务器注册",
      navDiscordCommands: "命令",
      navDiscordXp: "服务器 XP",
      navDiscordTroubleshooting: "故障排查",
      navAccount: "账户",
      navAccountOverview: "账户概览",
      navAccountMerge: "账户合并",
      navGamesRanking: "游戏与排行榜",
      navGamesOverview: "游戏概览",
      navRanking: "排行榜",
      navGamesXp: "XP 与等级",
      navCreatorOverview: "Creator 概览",
      navCreatorVerification: "频道所有权认证",
      navCreatorFeatured: "Featured Creator",
      tocAriaLabel: "Wiki 目录",
      homeTitle: "快速找到你想了解的内容",
      homeSubtitle: "从 Discord 安装到排行榜计算方式，使用 OwOGG 所需的一切说明都汇总在这里。",
      homeInstallPrompt: "想要更快安装 Discord？",
      homeInstallGuideLink: "5 步安装指南",
      homeInstallGuideSuffix: "，立即前往。",
      catDiscordDesc: "服务器安装、账户关联、服务器注册、命令、服务器 XP、故障排查。",
      catGettingStartedDesc: "从创建 OwOGG 账户到第一局游戏的最快路径。",
      catAccountDesc: "登录方式、个人资料设置，以及将多个账户合并为一个的账户合并功能。",
      catGamesDesc: "游戏目录、排名计算方式、经验值（XP）与等级。",
      catCreatorDesc: "频道所有权认证、主播排行榜资格、Featured Creator 标准。",
    },
    wikiBody: {
      creator: {
        title: "Creator 概览",
        description:
          "通过官方 OAuth/API 验证频道所有权的主播和 YouTuber 将被认定为 OwOGG Creator。",
        intro:
          "Creator 认证不会为游戏分数或 XP 提供任何加成。作为替代，它带来的权益是：在名人堂的主播排行榜标签页中展示，以及在个人资料页显示认证徽章和官方频道链接。",
        cardVerification: "频道所有权认证 →",
        cardVerificationDesc: "支持的平台与认证方法",
        cardFeatured: "Featured Creator →",
        cardFeaturedDesc: "Featured 资格标准",
        profileHint: "可以从我的个人资料页面开始认证。",
        profileLink: "前往我的个人资料",
      },
      creatorVerification: {
        title: "频道所有权认证",
        description: "仅通过官方 OAuth 和 API 验证所有权，绝不使用文本输入或网页抓取。",
        platformsHeading: "支持的平台",
        conditionsHeading: "认证条件",
        condOnePrefix: "在上述四个平台（YouTube · CHZZK · SOOP · Twitch）中，",
        condOneStrong: "只需认证一个",
        condOneSuffix: "即可被认定为 OwOGG Creator，无需认证全部四个平台。",
        condNoMinimum:
          "目前不要求订阅/关注人数或频道创建时长的最低标准，只需通过官方 OAuth 确认频道所有权即可。",
        condOauthOnly:
          "所有权认证始终只能通过各平台的官方 OAuth 登录页面完成，不支持直接输入频道 URL 或昵称的方式。",
        condOneChannelOneAccount: "一个外部频道只能绑定到一个 OwOGG 账户（1 个频道 = 1 个账户）。",
        methodHeading: "认证方法",
        step1: "前往个人资料页面的［创作者频道所有权认证］板块。",
        step2: "点击要认证的平台的［频道所有权认证］按钮。",
        step3: "在该平台的官方登录页面使用本人账户登录并授权。",
        step4: "返回 OwOGG 后，频道信息会被自动确认并显示。",
        calloutLoginStrong: "登录 OwOGG 与频道认证是两回事。",
        calloutLoginBody:
          " 使用 Google 登录并不会自动绑定你的 YouTube 频道 —— 必须完成明确的认证流程。",
        calloutDuplicate:
          "一个外部频道只能绑定到一个 OwOGG 账户。已被其他用户认证过的频道无法再次认证。",
        footerPrefix: "若要在主播排行榜中展示，在上述四个平台中",
        footerStrong: "只需认证一个",
        footerMid: "即可。详细资格条件请参阅",
        footerLink: "排行榜文档",
        footerSuffix: "。",
      },
      creatorFeatured: {
        title: "Featured Creator",
        description:
          "Featured 是依据 OwOGG 标准，以公开频道指标进行审核的、仅用于展示与筛选的徽章。",
        conceptHeading: "概念区分",
        conceptCreatorTerm: "Creator",
        conceptCreatorDesc: " —— 已通过官方 OAuth/API 验证频道所有权的状态。",
        conceptFeaturedTerm: "Featured Creator",
        conceptFeaturedDesc:
          " —— 在 Creator 之中，满足 OwOGG 标准（订阅/关注人数、频道创建时长等公开指标）并通过自动/人工审核的状态。",
        reviewHeading: "审核方式",
        reviewBody:
          "频道所有权认证完成后不会立即授予 Featured。一段时间后会使用最新的官方指标进行自动复审；若指标存在歧义，或平台未通过官方 API 提供指标，则会安全地转入运营人工审核。获得 Featured 之后也会定期重新验证。",
        calloutNoRankImpactStrong: "Featured 不会影响分数、XP 或排行榜名次。",
        calloutNoRankImpactBody:
          " 它仅是展示用徽章 —— 无论是否为 Featured，主播排行榜都只依据频道所有权认证来展示。",
        calloutTestingPhase:
          "目前处于服务验证阶段，因此不会自动授予 Featured，所有已认证频道所有权的 Creator 都会进入运营人工审核等待状态。无论是否为 Featured，在主播排行榜中的展示完全相同，并且 Featured 徽章目前尚未公开显示。",
        footerNote:
          "运营的审核标准与流程作为内部运营文档单独管理，不公开具体数值 —— 审核始终只使用可通过官方 API 核实的指标。",
      },
      account: {
        title: "账户概览",
        description: "OwOGG 支持 Google 与 Discord 登录，两者默认属于各自独立的账户。",
        loginHeading: "登录方式",
        loginBody:
          "你可以使用 Google 或 Discord 登录。即使是同一个人，通过 Google 创建的账户与通过 Discord 创建的账户默认也是不同的 OwOGG 账户 —— 系统不会自动合并。",
        profileHeading: "个人资料设置",
        profileBody:
          "在个人资料页面可以设置昵称和国家/地区，并查看等级、XP、成就、收藏以及最近游玩记录。",
        profileLink: "前往我的个人资料 →",
        calloutPrefix: "如果你分别创建了 Google 和 Discord 账户，可以通过",
        calloutLink: "账户合并",
        calloutSuffix: "功能将它们合并为一个。",
      },
      accountMerge: {
        title: "账户合并",
        description: "采用 Primary Account Wins 方式 —— 请先选择要保留的账户（Primary）再继续。",
        howHeading: "合并方式：Primary Account Wins",
        howBodyPrefix: "将两个账户中你要继续使用的那个指定为 ",
        howBodyPrimary: "Primary",
        howBodySuffix:
          "。合并完成后，Primary 的游戏记录、XP 和个性化设置将原封不动地保留，而 Secondary 的对应数据不会被合并，而是被清理。只有绑定在 Secondary 上的 Google/Discord 登录方式会转移到 Primary，此后无论使用哪种方式登录，都会进入同一个 Primary 账户。",
        stepsHeading: "操作步骤",
        step1: "使用你要继续使用的账户（Primary）登录。",
        step2: "启动账户合并，并使用待合并的账户（Secondary）完成身份验证。",
        step3: "确认合并内容 —— Secondary 的游戏/个性化数据不会被保留。",
        step4: "确认无误后完成合并。",
        step5: "此后使用原 Secondary 的登录方式也会登录到 Primary 账户。",
        calloutNoMergeStrong: "记录不会被合并。",
        calloutNoMergeBody:
          " 仅保留 Primary 的分数/XP/进度，Secondary 的记录在合并后会消失 —— 请务必将想保留的账户选为 Primary。",
        calloutAdminStrong: "若 Secondary 为管理员账户，合并将被阻止。",
        calloutAdminBody:
          " 若将拥有管理员权限的账户作为 Secondary 合并，该权限可能不会转移到任何地方而直接消失，因此出于安全考虑，OwOGG 会直接阻止此类合并，并要求由运营单独处理。",
        footerPrefix: "关于合并已完成平台所有权认证（Creator）账户的规则，请参阅",
        footerLink: "Creator 频道所有权认证",
        footerSuffix: "文档。",
      },
      games: {
        title: "游戏与排行榜概览",
        description: "OwOGG 提供包括反应速度、顺序记忆、瞄准、打字速度等在内的迷你游戏目录。",
        intro:
          "每款游戏都有各自独立的规则与计分方式，有效记录会自动计入排行榜。除分数之外，游玩行为本身也会累积经验值（XP）。",
        cardRanking: "排行榜 →",
        cardRankingDesc: "各游戏/主播排行榜的计算方式",
        cardXp: "XP 与等级 →",
        cardXpDesc: "经验值的发放方式与等级公式",
        footerPrefix: "现在就到",
        footerLink: "游戏目录",
        footerSuffix: "开始游玩吧。",
      },
      gamesRanking: {
        title: "排行榜",
        description: "名人堂（/ranking）由游戏排行榜、经验值排行榜、主播排行榜三个标签页组成。",
        gameHeading: "游戏排行榜",
        gameBody:
          "按各游戏的个人最佳成绩（Personal Best）排序。即使同一位用户多次游玩同一款游戏，排行榜也只会采用其中最好的一条记录。",
        xpHeading: "经验值（XP）排行榜",
        xpBodyPrefix: "按累计全局 XP 排序。详细的发放方式请参阅",
        xpBodyLink: "XP 与等级文档",
        xpBodySuffix: "。",
        streamerHeading: "主播排行榜",
        streamerBodyPrefix: "只有在 YouTube / CHZZK / SOOP / Twitch 中",
        streamerBodyStrong: "至少一个",
        streamerBodySuffix:
          "平台完成官方频道所有权认证的用户才会显示。名次数值使用与普通游戏排行榜/XP 排行榜完全相同的计算公式，已认证的平台数量不会影响名次 —— 最右侧的平台图标仅用于筛选与展示。",
        streamerLinkPrefix: "详细的认证方法请参阅",
        streamerLink: "Creator 频道所有权认证",
        streamerLinkSuffix: "文档。",
        calloutFeatured:
          "Featured Creator 标识是仅用于展示的徽章，对排行榜名次和 XP 计算没有任何影响。",
        footerPrefix: "关于 Discord 服务器维度的排行榜，请参阅",
        footerLink: "Discord 服务器 XP 文档",
        footerSuffix: "。",
      },
      gamesXp: {
        title: "XP 与等级",
        description: "每次有效完成游戏都会累积经验值，并根据累计经验值提升等级。",
        grantHeading: "XP 发放",
        grantPerPlay: "每次被认可的游戏完成可获得 10 XP。",
        grantDailyCap: "同一款游戏每天（以 UTC 为准）最多发放 10 次 XP。",
        grantAfterCap: "达到上限后仍然可以继续游玩 —— 只是不再发放额外的 XP。",
        formulaHeading: "等级公式",
        formulaPrefix: "达到等级 L 所需的累计 XP 为 ",
        formulaSuffix: "。等级越高，升到下一级所需的 XP 就越多。",
        calloutPrefix: "如果想了解在 Discord 服务器获得的 XP 与全局 XP 的关系，请查看",
        calloutLink: "Discord 服务器 XP 文档",
        calloutSuffix: "。",
        footerPrefix: "你可以在",
        footerProfileLink: "我的个人资料",
        footerMid: "查看自己的等级与 XP，在",
        footerRankingLink: "名人堂",
        footerSuffix: "查看总体排名。",
      },
      gettingStarted: {
        title: "开始使用",
        description: "以最快的方式游玩第一款游戏并留下记录。",
        flowHeading: "基本流程",
        step1: "使用 OwOGG 账户登录（Google 或 Discord）。",
        step2: "从游戏目录中选择想玩的迷你游戏。",
        step3: "游玩并查看结果 —— 有效记录会被自动保存。",
        step4: "在名人堂（排行榜）查看自己的名次与 XP。",
        step5: "如有需要，可连接 Discord 与服务器中的朋友一较高下。",
        calloutGuest:
          "以访客身份也可以游玩游戏。不过，若要将记录保存到账户并计入排行榜/XP，则需要登录。",
        cardCatalog: "游戏目录 →",
        cardCatalogDesc: "挑选现在就能玩的游戏",
        cardRanking: "名人堂 →",
        cardRankingDesc: "查看游戏/XP/主播排行榜",
        footerPrefix: "若想在 Discord 服务器中与朋友一起游玩，请查看",
        footerDiscordLink: "Discord 文档",
        footerMid: "；账户设置请查看",
        footerAccountLink: "账户文档",
        footerSuffix: "。",
      },
    },
    platformIcon: {
      chzzkLabel: "CHZZK",
      soopLabel: "SOOP",
      channelSuffix: "频道",
      verifiedPlatforms: "已验证平台",
    },
  },
};
