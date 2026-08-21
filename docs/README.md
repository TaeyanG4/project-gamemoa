# OwOGG Documentation

Status: Guide

Last verified: 2026-08-21

이 인덱스는 문서를 독자의 목적과 문서 역할에 따라 안내합니다. 구현 사실은 현재 코드,
마이그레이션, 워크플로 순으로 확인하며 문서와 구현이 다르면 구현이 우선합니다.

문서 역할은 다음과 같습니다.

- **Authoritative**: 현재 구현의 경계와 불변식을 설명합니다.
- **Guide**: 현재 구현을 사용하는 절차를 설명합니다.
- **Proposal**: 구현되지 않았거나 선택되지 않은 미래 설계입니다.
- **Historical**: 특정 시점의 조사/의사결정 기록이며 현재 사실의 권한 원천이 아닙니다.

## 시작하기

- [Repository README](../README.md) — 프로젝트 개요, 구조, 주요 명령

## 시스템 아키텍처

- [System Architecture](ARCHITECTURE.md) — **Authoritative**, 앱/패키지/인프라 경계
- [Game Platform Architecture](GAME_PLATFORM_ARCHITECTURE.md) — **Authoritative**, generic game
  identity, publication, runtime, score
- [Database](DATABASE.md) — **Authoritative**, D1 migration 및 데이터 경계
- [Authorization](AUTHORIZATION.md) — **Authoritative**, identity, staff, entitlement, permission,
  publisher authority

## 게임 개발 및 업로드

- [Game Creation Guide](GAME_CREATION_GUIDE.md) — **Guide**, OWOGG source와 USER bundle 흐름
- [Game Upload Guide](GAME_UPLOAD_GUIDE.md) — **Guide**, Game Creator Center 업로드 절차
- [Game Registry](../game-registry/README.md) — **Guide**, OWOGG bootstrap 입력 생성
- [Ball Dodge example](../examples/ball-dodge/README.md) — **Guide**, 예제 상태는 문서 내부의 주의사항 확인
- [Game Lineup](GAME_LINEUP.md) — **Proposal**, 후보 게임 기획
- [Multiplayer Game Design](MULTIPLAYER_GAME_DESIGN.md) — **Proposal**, 구현 전 멀티플레이 설계

## Discord

- [Discord Integration](DISCORD_INTEGRATION.md) — **Authoritative/Guide**, HTTP Interactions와 길드 연동
- [Discord Bot Guide](DISCORD_BOT_GUIDE.md) — **Guide**, 명령과 설정

## Creator

- [Creator System](CREATOR_SYSTEM.md) — **Authoritative/Guide**, 채널 소유권 검증과 Featured

`Creator System`의 스트리머/채널 인증과 `Authorization`의 GAME_CREATOR 업로드 자격은 서로 다른
프로그램입니다.

## 국제화

- [Internationalization](I18N.md) — **Guide**, UI locale 구조
- [i18n content workflow](i18n-content/README.md) — **Guide**, 콘텐츠 번역 작업
- [i18n content guide](i18n-content/GUIDE.md) — **Guide**, 번역 규칙
- [i18n content status](i18n-content/STATUS.md) — **Historical**, 현재 번역 상태 기록

## 유지보수

- [Legacy Ledger](maintenance/LEGACY_LEDGER.md) — **Historical**, F-0 저장소/legacy 판정 기록

이 ledger의 `DELETE`, `MIGRATE_THEN_DELETE`, `KEEP_REQUIRED`, `DEFER_UNTIL`, `KEEP_PERMANENT`
판정은 후속 정리 작업의 입력입니다. 문서 수정 자체가 삭제 권한을 부여하지는 않습니다.

## 운영 문서 공백

과거 문서가 가리키던 Admin 설정, OAuth 설정, 계정 연결 runbook은 현재 저장소에 실재하지
않습니다. F-1은 빈 placeholder를 만들지 않습니다. 현재 구현 경계는
[Authorization](AUTHORIZATION.md)과 관련 코드에서 확인하고, 실제 운영 runbook은 별도 운영 문서
단계에서 작성해야 합니다.
