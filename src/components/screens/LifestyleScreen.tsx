import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { LUXURY_CATALOG } from '../../data/luxuryItems';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  car: { label: 'Cars', emoji: '🏎️' },
  home: { label: 'Properties', emoji: '🏠' },
  jewelry: { label: 'Jewelry', emoji: '💎' },
  watch: { label: 'Watches', emoji: '⌚' },
  art: { label: 'Art', emoji: '🖼️' },
  jet: { label: 'Private Jets', emoji: '✈️' },
  yacht: { label: 'Yachts', emoji: '⛵' },
};

export function LifestyleScreen() {
  const { player, ownedAssets, buyLuxuryItem } = useGameStore();

  if (!player) return null;

  const totalWealth = player.career.money +
    useGameStore.getState().investments.reduce((s, i) => s + i.currentValue, 0);

  const categories = [...new Set(LUXURY_CATALOG.map(i => i.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          💎 Lifestyle
        </h1>
        <p className="text-gray-500 text-sm">Your assets and luxury purchases</p>
      </div>

      {/* Wealth summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card glass>
          <div className="text-2xl mb-1">💵</div>
          <div className="text-2xl font-black text-green-400">${Math.floor(player.career.money).toLocaleString()}</div>
          <div className="text-xs text-gray-500">Cash Available</div>
        </Card>
        <Card glass>
          <div className="text-2xl mb-1">💼</div>
          <div className="text-2xl font-black text-yellow-400">${Math.floor(totalWealth).toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total Net Worth</div>
        </Card>
        <Card glass>
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-2xl font-black text-purple-400">{ownedAssets.length}</div>
          <div className="text-xs text-gray-500">Assets Owned</div>
        </Card>
      </div>

      {/* Owned Assets */}
      {ownedAssets.length > 0 && (
        <Card>
          <h3 className="font-bold text-white text-sm mb-4">Your Assets</h3>
          <div className="grid grid-cols-3 gap-3">
            {ownedAssets.map(asset => (
              <div key={asset.id} className="bg-gray-800 rounded-xl p-3">
                <div className="text-2xl mb-1">{CATEGORY_LABELS[asset.category]?.emoji ?? '📦'}</div>
                <div className="text-white font-bold text-xs">{asset.name}</div>
                <div className="text-gray-500 text-xs capitalize">{asset.category}</div>
                <div className="text-yellow-400 font-mono text-xs mt-1">${asset.cost.toLocaleString()}</div>
                {asset.disciplineBonus && (
                  <div className="mt-1"><Badge color="green">+{asset.disciplineBonus} Discipline</Badge></div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Shop by category */}
      {categories.map(cat => {
        const catInfo = CATEGORY_LABELS[cat] ?? { label: cat, emoji: '📦' };
        const items = LUXURY_CATALOG.filter(i => i.category === cat);
        const unlockedItems = items.filter(i => totalWealth >= i.unlockThreshold);
        const lockedItems = items.filter(i => totalWealth < i.unlockThreshold);

        if (unlockedItems.length === 0 && lockedItems.length === 0) return null;

        return (
          <Card key={cat}>
            <h3 className="font-bold text-white text-sm mb-4">
              {catInfo.emoji} {catInfo.label}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {items.map(item => {
                const owned = ownedAssets.some(a => a.id === item.id);
                const unlocked = totalWealth >= item.unlockThreshold;
                const canAfford = player.career.money >= item.cost;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      owned
                        ? 'bg-yellow-500/10 border-yellow-500/40'
                        : unlocked
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-900 border-gray-800 opacity-40'
                    }`}
                  >
                    <div className="text-xl mb-1">{catInfo.emoji}</div>
                    <div className="text-white text-xs font-bold leading-tight">{item.name}</div>
                    <div className="text-yellow-400 font-mono text-xs mt-1">${item.cost.toLocaleString()}</div>
                    {item.disciplineBonus && (
                      <div className="text-green-400 text-xs">+{item.disciplineBonus} Discipline</div>
                    )}
                    {!unlocked && (
                      <div className="text-gray-600 text-xs mt-1">
                        🔒 Need ${item.unlockThreshold.toLocaleString()} wealth
                      </div>
                    )}
                    {owned ? (
                      <div className="text-yellow-400 text-xs mt-2">✅ Owned</div>
                    ) : unlocked ? (
                      <Button
                        variant={canAfford ? 'gold' : 'secondary'}
                        size="sm"
                        className="mt-2 w-full justify-center"
                        disabled={!canAfford}
                        onClick={() => buyLuxuryItem(item.id)}
                      >
                        {canAfford ? 'Buy' : 'Too Expensive'}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
