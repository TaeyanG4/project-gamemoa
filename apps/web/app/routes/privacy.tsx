import { WikiLayout } from "../components/wiki/WikiLayout";

export function meta() {
  return [
    { title: "개인정보 처리방침 | GAMEMOA" },
    { name: "description", content: "GAMEMOA 개인정보 처리방침" },
    { name: "robots", content: "noindex" },
  ];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-black text-text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

export default function PrivacyRoute() {
  return (
    <WikiLayout eyebrow="정책" title="개인정보 처리방침" description="시행일: 2026년 8월 14일">
      <div className="space-y-8 rounded-2xl border border-border bg-surface-raised p-5 md:p-8">
        <Section title="1. 수집하는 개인정보 항목">
          <p>GAMEMOA는 서비스 제공을 위해 아래 정보만 수집합니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-text-primary">로그인 정보</strong> — Google 또는 Discord
              계정으로 로그인 시 제공되는 이메일, 닉네임(표시 이름), 프로필 사진 URL, 계정 고유
              식별자(sub/ID)
            </li>
            <li>
              <strong className="text-text-primary">게임 이용 기록</strong> — 게임별 점수/기록,
              경험치(XP), 레벨, 도전과제 달성 내역
            </li>
            <li>
              <strong className="text-text-primary">프로필 설정</strong> — 이용자가 직접 입력하는
              닉네임, 국가/지역(선택, 자기 신고 정보이며 국적 인증이 아님)
            </li>
            <li>
              <strong className="text-text-primary">Discord 연동 정보</strong> — 계정 연동 시
              Discord 사용자 ID, 서버(길드) 등록 시 서버 ID/이름/아이콘, 관리 권한 여부
            </li>
            <li>
              <strong className="text-text-primary">Creator 채널 인증 정보</strong> — 스트리머 랭킹
              참여를 위해 자발적으로 채널 소유권 인증을 진행한 경우, 해당 플랫폼(YouTube/
              Twitch/CHZZK/SOOP)의 공식 API를 통해 확인된 채널명, 채널 URL, 구독자/팔로워 수
            </li>
          </ul>
          <p>
            비밀번호는 별도로 수집하지 않습니다(관리자 전용 계정은 예외이며, 해당 비밀번호는
            PBKDF2로 해시되어 저장되고 평문으로 보관되지 않습니다).
          </p>
        </Section>

        <Section title="2. 수집 목적">
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 식별 및 로그인 상태 유지</li>
            <li>게임 기록·랭킹·경험치 시스템 제공</li>
            <li>Discord 봇 명령어에서 본인 계정 정보 조회, 서버별 활동 집계</li>
            <li>Creator/스트리머 랭킹 자격 확인</li>
            <li>부정 이용(어뷰징) 탐지 및 서비스 안정성 유지</li>
          </ul>
        </Section>

        <Section title="3. 보관 기간">
          <p>
            개인정보는 회원 탈퇴 시 또는 이용자의 삭제 요청 시까지 보관하며, 관련 법령에서 별도
            보관을 요구하는 경우 그에 따릅니다.
          </p>
        </Section>

        <Section title="4. 제3자 제공">
          <p>
            GAMEMOA는 이용자의 개인정보를 광고, 마케팅 등 목적으로 제3자에게 제공하거나 판매하지
            않습니다. 서비스 운영에 필요한 인프라(Cloudflare — 서버/데이터베이스 호스팅)만 이용하며,
            이는 제3자 마케팅 제공에 해당하지 않습니다.
          </p>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>
            이용자는 언제든지 본인의 개인정보 열람, 정정, 삭제(계정 탈퇴)를 요청할 수 있습니다. 아래
            문의처로 연락해 주시면 확인 후 처리해 드립니다.
          </p>
        </Section>

        <Section title="6. 쿠키 및 세션">
          <p>
            로그인 상태 유지를 위해 세션 쿠키를 사용합니다. 광고 목적의 추적 쿠키나 제3자 분석
            도구는 사용하지 않습니다.
          </p>
        </Section>

        <Section title="7. 문의">
          <p>
            개인정보 관련 문의는{" "}
            <a
              href="mailto:taeyang95@naver.com"
              className="font-bold text-brand-light hover:underline"
            >
              taeyang95@naver.com
            </a>
            으로 연락해 주세요.
          </p>
        </Section>
      </div>
    </WikiLayout>
  );
}
