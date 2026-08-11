import { gameManifests } from "../features/catalog/registry";
import { GameCard } from "../components/ui/GameCard";

export function meta() {
  return [
    { title: "게임 목록 | gamemoa" },
    { name: "description", content: "모든 미니게임을 한 곳에서 확인하세요." },
  ];
}

export default function Games() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl flex-1">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold mb-4">모든 게임</h1>
        <p className="text-lg text-text-secondary">
          총 {gameManifests.length}개의 게임이 준비되어 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {gameManifests.map((game) => (
          <GameCard key={game.slug} {...game} />
        ))}
        
        {gameManifests.length === 0 && (
          <div className="col-span-full py-20 text-center text-text-muted bg-surface-raised rounded-3xl border border-border border-dashed">
            현재 준비된 게임이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
