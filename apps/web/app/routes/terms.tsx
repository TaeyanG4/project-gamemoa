export function meta() {
  return [
    { title: "이용약관 | GAMEMOA" },
    { name: "description", content: "GAMEMOA 서비스 이용약관" },
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

export default function TermsRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 md:px-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-light">GAMEMOA</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary md:text-3xl">
          이용약관
        </h1>
        <p className="mt-2 text-xs text-text-muted">시행일: 2026년 8월 14일</p>
      </header>

      <div className="space-y-8 rounded-2xl border border-border bg-surface-raised p-5 md:p-8">
        <Section title="1. 서비스 개요">
          <p>
            GAMEMOA(이하 "서비스")는 설치 없이 브라우저에서 바로 즐기는 웹 미니게임 모음 플랫폼이며,
            Discord 서버 연동, 랭킹/경험치(XP), Creator 채널 인증 등 부가 기능을 함께 제공합니다.
          </p>
        </Section>

        <Section title="2. 계정 및 로그인">
          <p>
            서비스는 Google 또는 Discord 계정을 통한 OAuth 로그인만 지원하며, 별도의
            아이디/비밀번호를 직접 발급하지 않습니다(관리자 전용 계정 제외). 이용자는 본인이 소유한
            계정으로만 로그인해야 하며, 계정 관리에 대한 책임은 이용자 본인에게 있습니다.
          </p>
        </Section>

        <Section title="3. 이용자의 의무">
          <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>자동화 도구, 매크로 등을 이용해 게임 기록이나 경험치를 부정하게 조작하는 행위</li>
            <li>
              본인이 소유하지 않은 계정, 채널, Discord 서버를 마치 본인 소유인 것처럼 등록하거나
              인증하는 행위
            </li>
            <li>
              타인의 개인정보를 무단으로 수집·게시하거나 서비스를 통해 타인에게 피해를 주는 행위
            </li>
            <li>서비스의 정상적인 운영을 방해하는 공격, 과도한 요청, 취약점 악용 행위</li>
          </ul>
        </Section>

        <Section title="4. 콘텐츠 및 게임 기록">
          <p>
            이용자가 생성한 게임 기록, 닉네임, 프로필 정보는 랭킹/XP 등 서비스 제공 목적으로
            사용됩니다. 서비스는 부정 기록으로 판단되는 데이터를 사전 통지 없이 조정하거나 삭제할 수
            있습니다.
          </p>
        </Section>

        <Section title="5. 서비스 변경 및 중단">
          <p>
            서비스는 운영상·기술상 필요에 따라 제공하는 게임, 기능, 화면 구성을 예고 없이 변경하거나
            중단할 수 있습니다. 서비스는 무료로 제공되며, 가용성이나 특정 성능을 보장하지 않습니다.
          </p>
        </Section>

        <Section title="6. 면책조항">
          <p>
            서비스는 무료로 제공되는 개인/소규모 프로젝트로, 관련 법령이 허용하는 범위에서 서비스
            이용과 관련하여 발생하는 손해에 대해 책임을 지지 않습니다. 다만 고의 또는 중과실로 인한
            손해는 예외로 합니다.
          </p>
        </Section>

        <Section title="7. 약관의 변경">
          <p>
            본 약관은 필요시 개정될 수 있으며, 개정 시 이 페이지를 통해 고지합니다. 개정된 약관은
            게시와 동시에 효력이 발생합니다.
          </p>
        </Section>

        <Section title="8. 문의">
          <p>
            서비스 이용과 관련한 문의는{" "}
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
    </div>
  );
}
