# 위키/사이트 번역 진행 현황 (STATUS — 계속 갱신되는 문서)

**경로**: `docs/i18n-content/STATUS.md`

이 문서는 **지금 시점에 뭐가 끝났고 뭐가 남았는지**만 담습니다. 규칙/절차(번역 지침, 도구 사용법
등 안 변하는 내용)는 **[`GUIDE.md`](./GUIDE.md)를 보세요**. 파일이 새로 번역되거나 코드에
연결될 때마다 이 문서만 갱신합니다.

_최근 갱신: 2026-08-14 — 약관/정책(`legal.terms`/`legal.privacy`), 게임 카테고리 칩
(`games.categories`), 위키 홈 "정책" 카드(`catPolicyTitle`/`catPolicyDesc`)를 `dictionary.ts`에
연결하고 해당 라우트(`/terms`, `/privacy`, `CategoryChips`, `/wiki`)를 번역본으로 전환 완료.
남은 건 게임 4종의 제목/설명/태그뿐(아래 "다음 할 일" 참고)._

## 파일 목록

| 파일                                                 | 상태                                     | 내용                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `translated-creator.json`                            | ✅ 번역 완료, 코드 연결됨                | Creator 개요/인증/Featured 3페이지, 4개 언어 전체                                                                                                                                                                                            |
| `translated-account-games.json`                      | ✅ 번역 완료, 코드 연결됨                | Account/AccountMerge/Games/GamesRanking/GamesXp/GettingStarted 6페이지, 4개 언어 전체                                                                                                                                                        |
| `01-wiki-discord.json`                               | ✅ 번역 완료, 코드 연결됨                | 위키 Discord 섹션 7페이지(Overview/Install/AccountLink/ServerRegistration/Commands/Xp/Troubleshooting), 4개 언어 전체                                                                                                                        |
| `03-terms-privacy.json` + `.en-US`/`.ja-JP`/`.zh-CN` | ✅ 번역 완료, 코드 연결됨 (`dict.legal`) | 이용약관·개인정보처리방침 전문. `/terms`, `/privacy` 라우트가 `dict.legal.terms`/`dict.legal.privacy`를 사용.                                                                                                                                |
| `02-game-content.json` + `.en-US`/`.ja-JP`/`.zh-CN`  | 🟡 일부 연결됨                           | `categories`(카테고리 칩 7개)와 `wikiHomePolicyCard`는 `dict.games.categories`/`dict.wiki.catPolicy*`로 연결 완료. `games`(게임 4종 title/shortDescription/description/tags)는 **아직 미연결** — `GameManifest` 스키마 변경 필요(아래 참고). |

**✅ 완료 파일의 구조**는 `{ "ko-KR": {...}, "en-US": {...}, "ja-JP": {...}, "zh-CN": {...} }`처럼
언어가 최상위 키입니다 — `dictionary.ts`의 실제 섹션을 그대로 뽑아온 것이라, 배포된 문구와 100%
동일합니다.

`01-wiki-discord.json`과 `03-terms-privacy.json`은 원래 대기 파일이었지만 이제 코드 연결까지
완료됐습니다 — 원본 소스 위치를 계속 남겨두기 위해 파일 자체는 옮기지 않았고, 위 표의 상태만
갱신했습니다. `02-game-content.json`은 부분 연결 상태라 별도 표시(🟡)를 사용합니다.

## 위키 본문 다국어화 진행률

**16/16페이지 완료** (Getting Started 1 + Account 2 + Games 3 + Creator 3 + Discord 7). 위키 본문
다국어화(Task #7)는 완료되었습니다.

## 최신화(드리프트) 상태

✅ 완료된 위키 본문 16페이지는 `pnpm i18n:sync-check`로 자동 감시됩니다 — 한국어 원문이 스냅샷과
달라지면 경고가 뜹니다. 이 문서를 손으로 "최신화 필요"라고 적어둘 필요 없이, 커밋 전에 그 명령만
실행하면 됩니다. 실행 방법/해석 방법은 `GUIDE.md`의 "최신화 상태 확인" 섹션 참고.

- 마지막 스냅샷 갱신 시점 기준(2026-08-14): 위키 본문 16페이지 288개 키 전부 일치 확인됨.
- `dict.legal`, `dict.games.categories`, `dict.wiki.catPolicy*`는 아직 이 자동 감시 대상에
  포함되지 않았습니다(스냅샷 도구는 현재 `wikiBody`만 봄) — 범위를 넓히는 건 별도 작업으로 남김.

## 다음 할 일 (우선순위 순)

1. **게임 카탈로그 콘텐츠 로케일화**: `GameManifest`(`packages/game-sdk/src/contracts/manifest.ts`)의
   `title`/`shortDescription`/`description`/`tags`가 현재 `string`(단일 로케일, 한국어 고정)입니다.
   4개 게임 패키지(`games/reaction-time`, `games/memory-test`, `games/aim-test`,
   `games/typing-test`)의 `manifest.ts` 각각과, 이를 소비하는 `HeroSpotlight.tsx`/`games.tsx`/
   `home.tsx` 등 UI까지 함께 바꿔야 하는 스키마 변경 작업입니다. 번역본은 이미
   `02-game-content.json`의 `.en-US`/`.ja-JP`/`.zh-CN`에 준비되어 있습니다.
2. `dict.legal`/`dict.games.categories`/`dict.wiki.catPolicy*`를 `pnpm i18n:sync-check` 감시
   범위에 포함시킬지 검토(현재는 `wikiBody`만 감시).
