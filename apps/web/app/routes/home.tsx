import { Link } from "react-router";
import { MonitorSmartphone, Timer, Trophy, ArrowRight, Play } from "lucide-react";
import { gameManifests } from "../features/catalog/registry";
import { GameCard } from "../components/ui/GameCard";

export default function Home() {
  const featuredGames = gameManifests.slice(0, 3);

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full pt-20 pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[85vh]">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--color-surface-raised)_0%,_var(--color-surface)_100%)] -z-10" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none -z-10" />
        
        <div className="container mx-auto px-4 flex flex-col items-center text-center z-10 max-w-4xl">
          <span className="px-4 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-bold tracking-widest mb-8 border border-brand/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            PLAY. SCORE. AGAIN.
          </span>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 whitespace-pre-line leading-[1.1]">
            <span className="text-text-primary">심심할 틈 없이,</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-brand">
              게임을 한곳에.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-text-secondary mb-12 max-w-2xl leading-relaxed whitespace-pre-line">
            설치 없이 바로 즐기는 가벼운 미니게임.
            {"\n"}짧게 한 판, 기록을 깨고, 다시 도전하세요.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              to="/games" 
              className="flex items-center justify-center gap-2 px-8 py-4 bg-brand text-white rounded-full font-bold text-lg hover:bg-brand-dark hover:scale-105 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              지금 바로 플레이
            </Link>
            <Link 
              to="/games" 
              className="flex items-center justify-center gap-2 px-8 py-4 bg-surface-raised text-text-primary border border-border rounded-full font-bold text-lg hover:bg-surface-overlay transition-colors cursor-pointer"
            >
              게임 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="py-24 bg-surface-raised w-full">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">지금 뭐 할까?</h2>
              <p className="text-text-secondary text-lg">고민할 필요 없이 바로 시작할 수 있는 게임들.</p>
            </div>
            <Link to="/games" className="group flex items-center gap-2 text-brand font-semibold hover:text-brand-light transition-colors">
              전체보기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredGames.map(game => (
              <GameCard key={game.slug} {...game} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Gamemoa Section */}
      <section className="py-32 bg-surface relative overflow-hidden w-full">
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-surface-overlay/50 border border-border/50 backdrop-blur-sm flex flex-col items-start hover:border-brand/30 transition-colors group">
              <div className="p-4 rounded-2xl bg-brand/10 text-brand mb-6 group-hover:scale-110 transition-transform">
                <MonitorSmartphone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">설치 없이</h3>
              <p className="text-text-secondary leading-relaxed">
                브라우저만 열면 끝. 다운로드도 업데이트도 필요 없어요. 언제 어디서든 바로 시작하세요.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-surface-overlay/50 border border-border/50 backdrop-blur-sm flex flex-col items-start hover:border-accent-green/30 transition-colors group">
              <div className="p-4 rounded-2xl bg-accent-green/10 text-accent-green mb-6 group-hover:scale-110 transition-transform">
                <Timer className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">짧고 가볍게</h3>
              <p className="text-text-secondary leading-relaxed">
                1분이든 10분이든, 원할 때 한 판만 즐겨도 충분해요. 바쁜 일상 속 작은 휴식을 즐기세요.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-surface-overlay/50 border border-border/50 backdrop-blur-sm flex flex-col items-start hover:border-accent-yellow/30 transition-colors group">
              <div className="p-4 rounded-2xl bg-accent-yellow/10 text-accent-yellow mb-6 group-hover:scale-110 transition-transform">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">기록에 도전</h3>
              <p className="text-text-secondary leading-relaxed">
                로그인하면 최고 기록과 플레이 이력을 남길 수 있어요. 친구들과 순위를 경쟁해보세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multiplayer Teaser */}
      <section className="py-24 bg-surface w-full relative">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue font-bold text-sm mb-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-blue"></span>
            </span>
            COMING SOON
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 whitespace-pre-line leading-tight">
            혼자도 좋지만,{"\n"}같이 하면 더 재밌으니까.
          </h2>
          <p className="text-xl text-text-secondary">
            친구와 바로 입장할 수 있는 온라인 멀티게임도 준비하고 있습니다.
          </p>
        </div>
      </section>

      {/* Login CTA Section */}
      <section className="py-24 bg-surface-raised w-full">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="bg-surface p-12 rounded-[3rem] border border-border/80 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/10 blur-[100px] rounded-full" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">오늘의 기록을 남겨볼까요?</h2>
              <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
                Google 또는 Discord로 로그인하고 최고 기록과 즐겨찾기를 안전하게 저장하세요.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  disabled 
                  className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg opacity-50 cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Google로 계속하기
                </button>
                <button 
                  disabled 
                  className="px-8 py-4 bg-[#5865F2] text-white rounded-full font-bold text-lg opacity-50 cursor-not-allowed hover:bg-[#4752C4] transition-colors"
                >
                  Discord로 계속하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
