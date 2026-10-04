import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import type { Investment, Business } from '../../types/game';

const INVESTMENT_OPTIONS: Array<{
  type: Investment['type'];
  name: string;
  emoji: string;
  desc: string;
  baseCost: number;
  riskLevel: Investment['riskLevel'];
  monthlyReturn: string;
}> = [
  { type: 'real_estate', name: 'Rental Property', emoji: '🏠', desc: 'Steady rental income. Safe long-term bet.', baseCost: 150_000, riskLevel: 'low', monthlyReturn: '0.5%/mo' },
  { type: 'real_estate', name: 'Apartment Building', emoji: '🏢', desc: 'Multiple units, higher income.', baseCost: 500_000, riskLevel: 'low', monthlyReturn: '0.5%/mo' },
  { type: 'stock', name: 'Index Funds', emoji: '📈', desc: 'Diversified market exposure. Low risk.', baseCost: 10_000, riskLevel: 'low', monthlyReturn: 'Market growth' },
  { type: 'stock', name: 'Individual Stocks', emoji: '💹', desc: 'Higher potential, higher variance.', baseCost: 25_000, riskLevel: 'medium', monthlyReturn: 'Volatile' },
  { type: 'music_catalog', name: 'Music Catalog Rights', emoji: '🎵', desc: "Buy rights to old songs. Royalties forever.", baseCost: 200_000, riskLevel: 'medium', monthlyReturn: '0.8%/mo' },
  { type: 'restaurant', name: 'Restaurant / Bar', emoji: '🍽️', desc: 'Good monthly cash flow. Needs management.', baseCost: 300_000, riskLevel: 'medium', monthlyReturn: '3%/mo' },
  { type: 'tech_startup', name: 'Tech Startup', emoji: '💻', desc: 'High risk. Can 10x or go to zero.', baseCost: 100_000, riskLevel: 'high', monthlyReturn: 'High variance' },
  { type: 'clothing_brand', name: 'Clothing Brand', emoji: '👕', desc: 'Connect it to your brand. Fans buy.', baseCost: 80_000, riskLevel: 'medium', monthlyReturn: '2%/mo' },
];

const BUSINESS_OPTIONS = [
  { type: 'record_label', name: 'Record Label', emoji: '🎙️', desc: 'Sign artists, take a cut of their earnings.', cost: 500_000 },
  { type: 'recording_studio', name: 'Recording Studio', emoji: '🎛️', desc: 'Rent studio time to other artists.', cost: 200_000 },
  { type: 'clothing_line', name: 'Clothing Line', emoji: '👗', desc: 'Your brand, your merch.', cost: 150_000 },
  { type: 'nightclub', name: 'Nightclub', emoji: '🕺', desc: 'Monthly income, occasional scandal.', cost: 800_000 },
  { type: 'media_company', name: 'Media Company', emoji: '📺', desc: 'Blog / radio station. Influence.', cost: 350_000 },
];

export function InvestmentsScreen() {
  const { player, investments, businesses, buyInvestment, sellInvestment, buyBusiness, sellBusiness } = useGameStore();
  const [tab, setTab] = useState<'portfolio' | 'invest' | 'business'>('portfolio');
  const [notice, setNotice] = useState<string | null>(null);

  if (!player) return null;

  const totalPortfolioValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalMonthlyIncome = investments.reduce((s, i) => s + i.monthlyIncome, 0);
  const totalBusinessProfit = businesses.reduce((s, b) => s + b.monthlyRevenue - b.monthlyCosts, 0);

  function riskColor(risk: string) {
    if (risk === 'high') return 'red';
    if (risk === 'medium') return 'orange';
    return 'green';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          💹 Investments & Business
        </h1>
        <p className="text-gray-500 text-sm">Make your money work for you</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Portfolio Value', value: `$${totalPortfolioValue.toLocaleString()}`, icon: '💼' },
          { label: 'Monthly Investment Income', value: `$${totalMonthlyIncome.toFixed(0)}/mo`, icon: '📈' },
          { label: 'Business Profit', value: `$${totalBusinessProfit.toFixed(0)}/mo`, icon: '🏢' },
          { label: 'Cash Available', value: `$${Math.floor(player.career.money).toLocaleString()}`, icon: '💵' },
        ].map(item => (
          <Card key={item.label} glass>
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-xl font-bold text-white">{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </Card>
        ))}
      </div>

      {notice && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {notice}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['portfolio', 'invest', 'business'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t === 'portfolio' ? '📊 Portfolio' : t === 'invest' ? '💰 Invest' : '🏢 Business'}
          </button>
        ))}
      </div>

      {/* Portfolio Tab */}
      {tab === 'portfolio' && (
        <div className="space-y-3">
          {investments.length === 0 && businesses.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💹</div>
                <p className="text-gray-500">No investments yet. Stack enough money and invest!</p>
              </div>
            </Card>
          ) : (
            <>
              {investments.map(inv => {
                const roi = ((inv.currentValue - inv.initialCost) / inv.initialCost * 100).toFixed(1);
                const isUp = inv.currentValue >= inv.initialCost;
                return (
                  <Card key={inv.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{inv.name}</div>
                        <div className="text-xs text-gray-500">{inv.type.replace('_', ' ')} · {inv.riskLevel} risk</div>
                        <div className="text-xs text-gray-500 mt-1">Bought: {inv.purchaseDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${inv.currentValue.toLocaleString()}</div>
                        <div className={`text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? '▲' : '▼'} {Math.abs(Number(roi))}%
                        </div>
                        {inv.monthlyIncome > 0 && (
                          <div className="text-xs text-blue-400">+${inv.monthlyIncome.toFixed(0)}/mo</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button variant="danger" size="sm" onClick={() => sellInvestment(inv.id)}>
                        Sell for ${inv.currentValue.toLocaleString()}
                      </Button>
                    </div>
                  </Card>
                );
              })}

              {businesses.map(biz => (
                <Card key={biz.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{biz.name}</div>
                      <div className="text-xs text-gray-500">{biz.type.replace('_', ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${(biz.monthlyRevenue - biz.monthlyCosts) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${(biz.monthlyRevenue - biz.monthlyCosts).toLocaleString()}/mo
                      </div>
                      <div className="text-xs text-gray-500">Revenue: ${biz.monthlyRevenue.toLocaleString()}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Invest Tab */}
      {tab === 'invest' && (
        <div className="grid grid-cols-2 gap-4">
          {INVESTMENT_OPTIONS.map((opt, idx) => {
            const canAfford = player.career.money >= opt.baseCost;
            return (
              <Card key={idx}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{opt.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{opt.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge color={riskColor(opt.riskLevel) as any}>{opt.riskLevel} risk</Badge>
                      <Badge color="blue">{opt.monthlyReturn}</Badge>
                    </div>
                    <div className="text-yellow-400 font-bold text-sm mt-2">${opt.baseCost.toLocaleString()}</div>
                    <Button
                      variant={canAfford ? 'gold' : 'secondary'}
                      size="sm"
                      className="mt-2"
                      disabled={!canAfford}
                      onClick={() => buyInvestment(opt.type, opt.name, opt.baseCost, opt.riskLevel)}
                    >
                      {canAfford ? 'Invest Now' : `Need $${opt.baseCost.toLocaleString()}`}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Business Tab */}
      {tab === 'business' && (
        <div className="grid grid-cols-2 gap-4">
          {BUSINESS_OPTIONS.map((opt, idx) => {
            const canAfford = player.career.money >= opt.cost;
            const owned = businesses.some(b => b.type === opt.type);
            return (
              <Card key={idx}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{opt.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{opt.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    <div className="text-yellow-400 font-bold text-sm mt-2">${opt.cost.toLocaleString()}</div>
                    {owned ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge color="green">✅ Owned</Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const biz = businesses.find(b => b.type === opt.type);
                            if (!biz) return;
                            sellBusiness(biz.id);
                            setNotice(`Sold ${opt.name}. The money's in your account.`);
                          }}
                        >
                          Sell
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant={canAfford ? 'gold' : 'secondary'}
                        size="sm"
                        className="mt-2"
                        disabled={!canAfford}
                        onClick={() => {
                          buyBusiness(opt.type as Business['type'], opt.name, opt.cost);
                          setNotice(`Bought ${opt.name}. It'll start paying out monthly.`);
                        }}
                      >
                        {canAfford ? 'Buy Business' : `Need $${opt.cost.toLocaleString()}`}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
