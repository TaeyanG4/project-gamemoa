import { Link } from "react-router";
import { Gamepad2, Sparkles } from "lucide-react";


export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface-sidebar mt-auto select-none">
      {/* CrazyGames Style SEO Text Section */}
      <div className="w-full border-b border-border/50 bg-surface-raised/40 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex items-center gap-2 text-brand font-extrabold text-lg">
            <Sparkles className="w-5 h-5" />
            <h3>빠르고 재미있는 웹 미니게임 모음 플랫폼, gamemoa!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs md:text-sm text-text-secondary leading-relaxed">
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-text-primary text-base">다운로드 없이 1초만에 시작하는 미니게임</h4>
              <p>
                gamemoa는 별도의 회원가입이나 앱 설치 없이 브라우저에서 즉시 실행되는 웹 미니게임 라이브러리입니다.
                바쁜 일상 속 점심시간이나 쉬는 시간 동안 순발력 테스트, 두뇌 회전 게임, 아케이드 게임을 부담 없이 즐겨보세요.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-text-primary text-base">공정한 기록 도전과 순위 경쟁</h4>
              <p>
                순발력 측정, 반응속도 테스트 등 유저의 정밀한 타이밍과 반응시간을 밀리초(ms) 단위로 측정합니다.
                친구들과 기록을 비교하고 최고의 랭커가 되기 위해 계속 도전해 보세요!
              </p>
            </div>
          </div>

          {/* Quick Tag Cloud */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/30">
            <span className="text-xs font-bold text-text-muted mr-2">인기 태그:</span>
            {["#반응속도테스트", "#무설치미니게임", "#순발력게임", "#두뇌회전", "#웹게임모음", "#무료게임"].map((tag) => (
              <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface border border-border/80 text-text-secondary hover:text-text-primary hover:border-brand/40 transition-colors">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link to="/" className="flex items-center gap-2 group">
            <Gamepad2 className="w-5 h-5 text-brand" />
            <span className="font-bold text-lg tracking-tight text-text-primary">
              game<span className="text-brand">moa</span>
            </span>
          </Link>
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} gamemoa. All rights reserved. Designed for speed & fun.
          </p>
        </div>
        
        <div className="flex items-center gap-6 text-xs text-text-secondary">
          <a href="https://github.com/TaeyanG4/project-gamemoa" target="_blank" rel="noreferrer" className="hover:text-text-primary transition-colors">
            GitHub Repo
          </a>
          <Link to="/games" className="hover:text-text-primary transition-colors">
            전체 게임 목록
          </Link>
          <Link to="/ranking" className="hover:text-text-primary transition-colors">
            명예의 전당
          </Link>
        </div>
      </div>
    </footer>
  );
}
