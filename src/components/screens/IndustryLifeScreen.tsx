import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { money } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PostCareerRole } from '../../types/game';

export function IndustryLifeScreen() {
  const s = useGameStore();
  const { player } = s;
  const [songId, setSongId] = useState('');
  const [sampleName, setSampleName] = useState('');
  const [rightsHolder, setRightsHolder] = useState('');
  const [payolaSong, setPayolaSong] = useState('');
  const [city, setCity] = useState(player?.city ?? 'Accra');
  const [flash, setFlash] = useState<string | null>(null);

  const released = useMemo(() => s.songs.filter(x => x.masterStatus === 'released'), [s.songs]);
  const activeSamples = s.sampleClearances.filter(x => x.status === 'pending');
  const activePayola = s.payolaCampaigns.filter(x => !x.completed);
  const openMissions = s.scoutMissions.filter(x => x.status === 'open');

  if (!player) return null;

  const act = (r: { ok: boolean; message: string }) => setFlash(r.message);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header>
        <div className="text-[11px] uppercase tracking-widest text-amber font-bold">Industry & Life</div>
        <h1 className="text-2xl font-black text-ink mt-1">The part of the career that follows you home.</h1>
        <p className="text-[12px] text-ink3 mt-1 max-w-3xl">Radio politics, rights, A&R opportunities, family obligations and the decision to walk away from the spotlight. These systems change numbers, not just headlines.</p>
      </header>

      {flash && <div className="rounded-xl border border-line bg-card px-4 py-3 text-[12px] text-ink2">{flash}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between"><div><div className="font-black text-ink">Sample clearance</div><div className="text-[11px] text-ink3 mt-1">A sample is a legal obligation, not a cosmetic tag.</div></div><Badge color="yellow">{activeSamples.length} pending</Badge></div>
          <div className="grid md:grid-cols-3 gap-2 mt-4">
            <select value={songId} onChange={e=>setSongId(e.target.value)} className="bg-bg border border-line rounded-lg px-3 py-2 text-[12px] text-ink"><option value="">Select released song</option>{released.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>
            <input value={sampleName} onChange={e=>setSampleName(e.target.value)} placeholder="Sample name" className="bg-bg border border-line rounded-lg px-3 py-2 text-[12px] text-ink" />
            <input value={rightsHolder} onChange={e=>setRightsHolder(e.target.value)} placeholder="Rights holder" className="bg-bg border border-line rounded-lg px-3 py-2 text-[12px] text-ink" />
          </div>
          <Button className="mt-3" size="sm" variant="gold" onClick={()=>act(s.requestSampleClearance(songId,sampleName,rightsHolder))}>Request clearance</Button>
          <div className="mt-4 space-y-2">{activeSamples.map(c=><div key={c.id} className="flex items-center justify-between gap-3 border-t border-line pt-2"><div><div className="text-[12px] font-semibold text-ink">{c.songTitle} · {c.sampleName}</div><div className="text-[10px] text-ink3">{c.rightsHolder} · quoted {money(c.quotedCost)}</div></div><Button size="sm" variant="secondary" onClick={()=>act(s.approveSampleClearance(c.id))}>Clear it</Button></div>)}</div>
        </Card>

        <Card className="p-4">
          <div className="font-black text-ink">Family</div>
          <div className="text-[11px] text-ink3 mt-1">A recurring obligation with actual monthly cost.</div>
          <div className="text-3xl font-black text-ink mt-4">{s.family.children}</div><div className="text-[10px] text-ink3">children</div>
          {s.family.children > 0 ? <div className="mt-3 text-[12px] text-ink2">Monthly support: <b className="text-ink">{money(s.family.monthlyChildSupport)}</b><br/>Co-parent: {s.family.coParentName}</div> : <Button className="mt-4" size="sm" variant="secondary" onClick={()=>act(s.acceptChildSupport('Co-parent'))}>Add family responsibility</Button>}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-black text-ink">Radio campaign</div><div className="text-[11px] text-ink3 mt-1">Unofficial promotion can move attention quickly, but exposure damages reputation.</div>
          <div className="flex gap-2 mt-4"><select value={payolaSong} onChange={e=>setPayolaSong(e.target.value)} className="flex-1 bg-bg border border-line rounded-lg px-3 py-2 text-[12px] text-ink"><option value="">Select release</option>{released.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select><input value={city} onChange={e=>setCity(e.target.value)} className="w-32 bg-bg border border-line rounded-lg px-3 py-2 text-[12px] text-ink" /></div>
          <Button className="mt-3" size="sm" variant="gold" onClick={()=>act(s.launchPayola(payolaSong,city,player.country))}>Launch 7-day push</Button>
          <div className="mt-4 space-y-2">{activePayola.map(c=><div key={c.id} className="border-t border-line pt-2 text-[11px] text-ink2"><b className="text-ink">{c.songTitle}</b> · {c.city} · {c.remainingDays} days left {c.exposed && <Badge color="red">exposed</Badge>}</div>)}</div>
        </Card>

        <Card className="p-4">
          <div className="font-black text-ink">A&R missions</div><div className="text-[11px] text-ink3 mt-1">Scouts want relationships built, not a button pressed.</div>
          <div className="mt-4 space-y-3">{openMissions.length ? openMissions.map(m=><div key={m.id} className="border border-line rounded-xl p-3"><div className="text-[10px] text-ink3">{m.scoutName}</div><div className="text-[13px] font-bold text-ink mt-1">{m.targetName}</div><div className="text-[11px] text-ink2 mt-1">{m.objective}</div><div className="flex items-center justify-between mt-3"><span className="text-[10px] text-ink3">Reward {money(m.rewardMoney)} · +{m.rewardFame.toFixed(1)} fame</span><Button size="sm" variant="secondary" onClick={()=>act(s.completeScoutMission(m.id))}>Complete</Button></div></div>) : <div className="text-[12px] text-ink3">No open missions. Keep building numbers; scouts appear when your career has traction.</div>}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between"><div><div className="font-black text-ink">Legacy & retirement</div><div className="text-[11px] text-ink3 mt-1">Retirement is a career state. Your catalogue and businesses keep moving.</div></div><Badge color={s.legacy.retired ? 'green' : 'gray'}>{s.legacy.retired ? 'retired' : 'active'}</Badge></div>
        <div className="grid md:grid-cols-4 gap-4 mt-4"><div><div className="text-2xl font-black text-ink">{s.legacy.legacyScore.toLocaleString()}</div><div className="text-[10px] text-ink3">legacy score</div></div><div><div className="text-2xl font-black text-ink">{s.legacy.titles.join(' · ') || 'Building'}</div><div className="text-[10px] text-ink3">legacy titles</div></div><div><div className="text-2xl font-black text-ink">{s.legacy.comebackAttempts}</div><div className="text-[10px] text-ink3">comeback attempts</div></div><div className="flex flex-wrap gap-2 items-start">{!s.legacy.retired ? <Button size="sm" variant="danger" onClick={()=>act(s.retireCareer())}>Retire</Button> : <Button size="sm" variant="gold" onClick={()=>act(s.attemptComeback())}>Attempt comeback</Button>}</div></div>
        {s.legacy.retired && <div className="mt-4 border-t border-line pt-4"><div className="text-[11px] text-ink3 mb-2">Choose your post-career role</div><div className="flex flex-wrap gap-2">{(['executive','producer','manager','mentor'] as PostCareerRole[]).map(role=><button key={role} onClick={()=>act(s.choosePostCareerRole(role))} className={cn('px-3 py-2 rounded-lg text-[11px] border',s.legacy.postCareerRole===role?'border-amber bg-amber/10 text-amber':'border-line text-ink2 hover:text-ink')}>{role}</button>)}</div></div>}
      </Card>

      <Card className="p-4"><div className="font-black text-ink">Industry notices</div><div className="mt-3 space-y-2">{s.industryNotices.slice(0,8).map(n=><div key={n.id} className="flex gap-3 py-2 border-t border-line"><div className="w-2 h-2 rounded-full bg-amber mt-1.5"/><div><div className="text-[12px] font-semibold text-ink">{n.title}</div><div className="text-[11px] text-ink2 mt-0.5">{n.body}</div><div className="text-[10px] text-ink3 mt-1">{n.date}</div></div></div>)}{s.industryNotices.length===0&&<div className="text-[12px] text-ink3">Nothing yet. The industry notices appear when the world gives you something to deal with.</div>}</div></Card>
    </div>
  );
}
