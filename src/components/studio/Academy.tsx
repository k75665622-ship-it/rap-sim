// ─── THE ACADEMY ───────────────────────────────────────────────────────────
// Lessons with a demo you can hear and a quiz; an exam per course for a
// certificate; and a tutor to ask. See sim/academy.ts for what is taught.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';
import { COURSES, LESSONS, lessonsOf, examQuestions, askTutor, examPass, type CourseId, type Lesson, type Question } from '../../sim/academy';
import { startDemo } from '../../audio/academyDemo';
import { stopPreview } from '../../audio/preview';
import { cn } from '@/utils/cn';

function Quiz({ title, questions, onDone }: { title: string; questions: Question[]; onDone: (score: number) => string }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const done = picked.every((p) => p !== null);
  const score = picked.reduce<number>((n, p, i) => n + (p === questions[i].answer ? 1 : 0), 0);
  return (
    <div className="space-y-3">
      <div className="text-[13px] font-bold text-ink">{title}</div>
      {questions.map((q, i) => (
        <div key={i} className="rounded-[12px] border border-line p-3 space-y-2">
          <div className="text-[13px] text-ink">{i + 1}. {q.q}</div>
          <div className="grid gap-1.5">
            {q.options.map((o, j) => {
              const chosen = picked[i] === j;
              const show = revealed;
              return <button key={j} disabled={revealed} onClick={() => setPicked((p) => p.map((x, k) => (k === i ? j : x)))} aria-pressed={chosen}
                className={cn('text-left text-[12px] rounded-[10px] border px-3 py-2', show && j === q.answer ? 'border-rise bg-rise/10 text-ink' : show && chosen ? 'border-fall bg-fall/10 text-ink' : chosen ? 'border-amber bg-amber/10 text-ink' : 'border-line text-ink2')}>{o}</button>;
            })}
          </div>
          {revealed && <div className="text-[11px] text-ink3">{picked[i] === q.answer ? '✓ ' : '✗ '}{q.why}</div>}
        </div>
      ))}
      {!revealed
        ? <button disabled={!done} onClick={() => { setRevealed(true); setResult(onDone(score)); }} className="h-10 px-5 rounded-full bg-amber text-black font-bold text-[13px] disabled:opacity-40">Submit answers</button>
        : <div className="text-[12px] text-ink2 leading-snug">{result}</div>}
    </div>
  );
}

export function Academy({ onClose, openLesson }: { onClose: () => void; openLesson?: string }) {
  const academy = useGameStore((s) => s.academy);
  const finishLesson = useGameStore((s) => s.finishLesson);
  const finishExam = useGameStore((s) => s.finishExam);
  const [lesson, setLesson] = useState<Lesson | null>(() => LESSONS.find((l) => l.id === openLesson) ?? null);
  const [exam, setExam] = useState<CourseId | null>(null);
  const [demoOn, setDemoOn] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [ask, setAsk] = useState('');
  const [reply, setReply] = useState<{ answer: string; lesson?: string } | null>(null);
  const [tries, setTries] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const demoRef = useRef<ReturnType<typeof startDemo> | null>(null);
  const passed = (id: string) => !!academy?.lessons?.[id];

  const stopDemo = () => { demoRef.current?.stop(); demoRef.current = null; setDemoPlaying(false); setDemoOn(false); };
  useEffect(() => () => { demoRef.current?.stop(); ctxRef.current?.close().catch(() => {}); }, []);
  useEffect(() => { stopDemo(); setTries(0); }, [lesson?.id, exam]); // eslint-disable-line react-hooks/exhaustive-deps
  function toggleDemo() {
    if (!lesson?.demo) return;
    if (demoPlaying) { stopDemo(); return; }
    stopPreview();
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctxRef.current.resume().catch(() => {});
    demoRef.current = startDemo(ctxRef.current, lesson.demo.kind);
    setDemoPlaying(true);
  }
  const flip = () => { const n = !demoOn; setDemoOn(n); demoRef.current?.setOn(n); };

  const course = (c: CourseId) => COURSES.find((x) => x.id === c)!;
  const examSeed = new Date().getDate() + tries * 7;

  return createPortal(
    <div className="studio-cinematic fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Academy">
      <div className="absolute inset-0 bg-black/80" onClick={() => { stopDemo(); onClose(); }} />
      <div className="studio-booth-panel relative w-full sm:max-w-[820px] max-h-[94vh] rounded-t-[24px] sm:rounded-[24px] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[18px] font-bold text-ink">🎓 The Academy</div><div className="text-[11px] text-ink3">Learn the tools for real. Pass lessons, sit the exam, earn a certificate that makes your recordings and mixes better.</div></div>
          <button onClick={() => { stopDemo(); onClose(); }} className="w-9 h-9 rounded-full border border-line text-ink2" aria-label="Close">✕</button>
        </div>

        {exam ? (
          <div className="space-y-3">
            <button onClick={() => setExam(null)} className="text-[12px] text-ink3 hover:text-ink2">← Back</button>
            <Quiz key={`${exam}-${tries}`} title={`${course(exam).title} — exam (pass: ${Math.ceil(6 * examPass)}/6)`} questions={examQuestions(exam, examSeed)} onDone={(s) => finishExam(exam, s, 6).message} />
            <button onClick={() => setTries((t) => t + 1)} className="text-[12px] text-ink3 underline">New questions</button>
          </div>
        ) : lesson ? (
          <div className="space-y-4">
            <button onClick={() => setLesson(null)} className="text-[12px] text-ink3 hover:text-ink2">← All lessons</button>
            <div><div className="text-[16px] font-bold text-ink">{lesson.title}</div><div className="text-[12px] text-ink3">{lesson.blurb}</div></div>
            <div className="space-y-2">{lesson.body.map((p, i) => <p key={i} className="text-[13px] text-ink2 leading-relaxed">{p}</p>)}</div>
            <div className="rounded-[12px] border border-amber/40 bg-amber/5 p-3 text-[12px] text-ink"><b>Remember:</b> {lesson.takeaway}</div>
            {lesson.demo && (
              <div className="studio-window rounded-[14px] border border-line p-3 space-y-2">
                <div className="text-[12px] font-semibold text-ink">🔊 Hear it</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={toggleDemo} className="h-9 px-4 rounded-full bg-amber text-black font-bold text-[12px]">{demoPlaying ? '■ Stop' : '▶ Play the demo'}</button>
                  <div className="flex rounded-full border border-line p-0.5 text-[11px]" role="group" aria-label="Demo switch">
                    <button disabled={!demoPlaying} onClick={() => demoOn && flip()} aria-pressed={!demoOn} className={cn('px-3 h-7 rounded-full disabled:opacity-40', !demoOn ? 'bg-white/15 text-ink' : 'text-ink2')}>{lesson.demo.off}</button>
                    <button disabled={!demoPlaying} onClick={() => !demoOn && flip()} aria-pressed={demoOn} className={cn('px-3 h-7 rounded-full disabled:opacity-40', demoOn ? 'bg-amber text-black font-semibold' : 'text-ink2')}>{lesson.demo.on}</button>
                  </div>
                </div>
                <div className="text-[11px] text-ink3">{lesson.demo.listen}</div>
              </div>
            )}
            <Quiz key={`${lesson.id}-${tries}`} title="Quiz — 2 of 3 to pass" questions={lesson.quiz} onDone={(s) => finishLesson(lesson.id, s).message} />
          </div>
        ) : (
          <>
            {COURSES.map((c) => {
              const ls = lessonsOf(c.id); const done = ls.filter((l) => passed(l.id)).length; const cert = academy?.certs?.[c.id];
              return (
                <div key={c.id} className="studio-window rounded-[16px] border border-line p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-[15px] font-bold text-ink">{c.emoji} {c.title}</div><div className="text-[12px] text-ink3 mt-0.5">{c.blurb}</div><div className="text-[11px] text-amber mt-1">{c.reward}</div></div>
                    {cert ? <span className="studio-chip rounded-full px-3 py-1 text-[11px] font-bold text-rise shrink-0">🏅 Certified · {cert.score}/{cert.total}</span> : <span className="text-[11px] text-ink3 shrink-0">{done}/{ls.length} lessons</span>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ls.map((l) => (
                      <button key={l.id} onClick={() => setLesson(l)} className="text-left rounded-[12px] border border-line p-3 hover:border-amber/60 transition">
                        <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-ink">{l.title}</span><span className={cn('text-[11px]', passed(l.id) ? 'text-rise' : 'text-ink3')}>{passed(l.id) ? `✓ ${academy!.lessons[l.id].best}/3` : 'Start'}</span></div>
                        <div className="text-[11px] text-ink3 mt-0.5">{l.blurb}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setExam(c.id)} disabled={done < ls.length} className="h-9 px-4 rounded-full border border-amber/60 text-amber text-[12px] font-semibold disabled:opacity-40">{cert ? '📝 Retake the exam' : done < ls.length ? '📝 Exam (pass every lesson first)' : '📝 Sit the exam'}</button>
                </div>
              );
            })}
            <div className="studio-window rounded-[16px] border border-line p-4 space-y-2">
              <div className="text-[13px] font-bold text-ink">💬 Ask the tutor</div>
              <form onSubmit={(e) => { e.preventDefault(); if (ask.trim()) setReply(askTutor(ask)); }} className="flex gap-2">
                <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="e.g. why does my vocal sound muddy?" aria-label="Ask the tutor" className="h-10 flex-1 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink" />
                <button className="h-10 px-4 rounded-full bg-amber text-black font-bold text-[12px]">Ask</button>
              </form>
              {reply && <div className="text-[12px] text-ink2 leading-relaxed">{reply.answer}{reply.lesson && <> <button onClick={() => { setLesson(LESSONS.find((l) => l.id === reply.lesson) ?? null); setReply(null); }} className="text-amber underline">Open the lesson →</button></>}</div>}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
