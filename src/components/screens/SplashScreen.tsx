import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Card';

export function SplashScreen() {
  const { setScreen, loadGame, newGame, listSaves } = useGameStore();
  const saved = listSaves();
  const hasAny = saved.length > 0;

  function handleLoad() {
    // "Continue" is the shortcut into the career you were last in. When there
    // is none — or the file is missing — the honest place to land is the list
    // of careers, not an alert telling the player to start over.
    if (!loadGame()) setScreen('careers');
  }

  function handleNew() {
    newGame();
    setScreen('create_artist');
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,200,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,200,0,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-lg px-6">
        {/* Logo */}
        <div className="mb-2">
          <span className="text-xs tracking-[0.5em] text-yellow-500 uppercase font-bold">The Game</span>
        </div>
        <h1 className="text-7xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          RAP
        </h1>
        <h1 className="text-7xl font-black text-yellow-400 mb-6 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          GAME
        </h1>
        <p className="text-gray-400 text-lg mb-3 leading-relaxed">
          From the streets to the world stage.
        </p>
        <p className="text-gray-600 text-sm mb-12">
          Build your career. Manage your beef. Chase legacy.
        </p>

        <div className="flex flex-col gap-3 items-center">
          <Button variant="gold" size="lg" onClick={handleNew}>
            🎤 Start New Career
          </Button>
          <Button variant="secondary" size="lg" onClick={handleLoad}>
            💾 Continue Career
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setScreen('careers')}>
            {hasAny
              ? `📂 All careers (${saved.length})`
              : '📂 All careers'}
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: '🎵', label: 'Create Music' },
            { icon: '🌍', label: 'Build Global Fame' },
            { icon: '💰', label: 'Stack Real Wealth' },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-3xl mb-1">{item.icon}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>

        <p className="text-gray-700 text-xs mt-12">
          Features NPC artists. Built for personal use.
        </p>
      </div>
    </div>
  );
}
