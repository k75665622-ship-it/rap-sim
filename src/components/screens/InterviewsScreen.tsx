import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { INTERVIEW_STATIONS } from '../../data/interviewStations';
import { generateInterviewQuestion } from '../../ai/offlineProvider';
import type { InterviewTone } from '../../types/game';
import { ENERGY_COSTS, energyShortfallMessage } from '../../sim/energy';

const TONES: { id: InterviewTone; label: string; emoji: string; desc: string }[] = [
  { id: 'diplomatic', label: 'Diplomatic', emoji: '🕊️', desc: '+Rep, safe, low momentum' },
  { id: 'dismissive', label: 'Dismissive', emoji: '😒', desc: '-Rep, +Street Cred' },
  { id: 'aggressive', label: 'Aggressive', emoji: '🔥', desc: '+Street, -Rep, risks beef' },
  { id: 'humorous', label: 'Humorous', emoji: '😄', desc: '+Fame, +Momentum, crowd loves it' },
  { id: 'honest', label: 'Honest', emoji: '💯', desc: '+Rep, +Fame, small risk of reveals' },
];

const TONE_ANSWERS: Record<InterviewTone, string[]> = {
  diplomatic: [
    "I appreciate the question. I just want to focus on the music and what it means to the people who listen.",
    "You know, at the end of the day, this industry is about building something meaningful. I try to stay on that path.",
    "I have a lot of respect for everyone in the game. We all have different journeys.",
  ],
  dismissive: [
    "Next question.",
    "I don't really think about that kind of thing. I'm focused on my craft.",
    "That's not really relevant to what I'm building. Let's talk about the music.",
  ],
  aggressive: [
    "Listen, I keep it one hundred. If someone has a problem with me, they know where to find me.",
    "I don't play games. The music speaks and if anyone has an issue with what I'm saying, say it to my face.",
    "People need to stop moving funny. I see everything and I respond in my music.",
  ],
  humorous: [
    "Ha! You know what, I'm not even going to dignify that with a straight answer. *laughs* But for real though—",
    "Man, you almost got me! *laughs* Look, life is too short to be serious all the time.",
    "I came here to vibe, not to start drama! *laughs* Ask me about the music!",
  ],
  honest: [
    "Real talk? It was hard. There were times I almost quit. But this is what I was born to do.",
    "I'll be transparent with you — that situation was complicated. Here's what actually happened.",
    "Look, I'm not going to sugarcoat it. I made mistakes. But I learned and kept moving.",
  ],
};

function getAnswer(tone: InterviewTone): string {
  const pool = TONE_ANSWERS[tone];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function InterviewsScreen() {
  const { player, interviews, openThreads, startInterview, answerQuestion, completeInterview, setScreen } = useGameStore();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Array<{ q: string; tone: InterviewTone; a: string }>>([]);
  const [interviewDone, setInterviewDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!player) return null;

  const activeInterview = interviews.find(i => i.id === activeInterviewId);
  const completedInterviews = interviews.filter(i => i.completed);

  function handleStartInterview() {
    if (!selectedStationId) return;
    // A press day costs energy. Gate it up front rather than letting the
    // player answer four questions and then discover it did not count.
    if (player!.energy < ENERGY_COSTS.interview) {
      setNotice(energyShortfallMessage(ENERGY_COSTS.interview, player!.energy));
      return;
    }
    setNotice(null);
    startInterview(selectedStationId);
    const station = INTERVIEW_STATIONS.find(s => s.id === selectedStationId)!;

    // Generate questions
    const openThread = openThreads.find(t => !t.resolved);
    const qs = Array.from({ length: 4 }, () =>
      generateInterviewQuestion(station.personality, openThread?.description)
    );

    setQuestions(qs);
    setAnswers([]);
    setCurrentQuestionIdx(0);
    setInterviewDone(false);

    const state = useGameStore.getState();
    const newInterview = state.interviews[state.interviews.length - 1];
    setActiveInterviewId(newInterview.id);
  }

  function handleAnswer(tone: InterviewTone) {
    if (!activeInterviewId) return;
    const q = questions[currentQuestionIdx];
    const a = getAnswer(tone);

    answerQuestion(activeInterviewId, currentQuestionIdx, tone);
    setAnswers(prev => [...prev, { q, tone, a }]);

    if (currentQuestionIdx >= questions.length - 1) {
      completeInterview(activeInterviewId);
      setInterviewDone(true);
    } else {
      setCurrentQuestionIdx(i => i + 1);
    }
  }

  function handleReset() {
    setActiveInterviewId(null);
    setSelectedStationId(null);
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIdx(0);
    setInterviewDone(false);
  }

  const riskColor = (level: number) => level >= 60 ? 'red' : level >= 30 ? 'orange' : 'green';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          🎙️ Interviews
        </h1>
        <p className="text-gray-500 text-sm">Speak to the world. Choose your words carefully.</p>
      </div>

      {!activeInterviewId ? (
        <div className="grid grid-cols-3 gap-6">
          {/* Station selection */}
          <div className="col-span-2">
            <Card>
              <h3 className="font-bold text-white mb-4">Available Stations</h3>
              <div className="space-y-3">
                {INTERVIEW_STATIONS.map(station => (
                  <button
                    key={station.id}
                    onClick={() => setSelectedStationId(station.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedStationId === station.id
                        ? 'bg-yellow-500/10 border border-yellow-500'
                        : 'bg-gray-900 border border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{station.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{station.audienceType}</div>
                        <div className="mt-2 flex gap-2">
                          <Badge color={riskColor(station.riskLevel) as any}>
                            Risk: {station.riskLevel}/100
                          </Badge>
                          <Badge color={
                            station.personality === 'friendly' ? 'green' :
                            station.personality === 'provocative' ? 'red' :
                            station.personality === 'underground' ? 'blue' : 'orange'
                          }>
                            {station.personality}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-2xl">
                        {station.personality === 'friendly' ? '😊' :
                         station.personality === 'provocative' ? '⚡' :
                         station.personality === 'underground' ? '🎤' : '🔥'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {notice && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2 text-red-300 text-xs mt-4">
                  {notice}
                </div>
              )}
              <Button
                variant="gold"
                className="w-full justify-center mt-4"
                onClick={handleStartInterview}
                disabled={!selectedStationId}
              >
                🎙️ Start Interview
              </Button>
              <p className="text-[11px] text-gray-600 text-center mt-2">
                A press day costs ⚡{ENERGY_COSTS.interview} energy. You have {Math.floor(player.energy)}.
              </p>
            </Card>
          </div>

          {/* Completed interviews */}
          <div>
            <Card>
              <h3 className="font-bold text-white text-sm mb-3">Past Interviews ({completedInterviews.length})</h3>
              {completedInterviews.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">No interviews yet</p>
              ) : (
                <div className="space-y-2">
                  {completedInterviews.slice(0, 5).map(intv => {
                    const station = INTERVIEW_STATIONS.find(s => s.id === intv.stationId);
                    return (
                      <div key={intv.id} className="bg-gray-800 rounded-xl p-3">
                        <div className="text-white text-xs font-bold">{station?.name}</div>
                        <div className="text-gray-500 text-xs">{intv.date}</div>
                        <div className="flex gap-1 mt-1">
                          {intv.fameGained > 0 && <Badge color="yellow">+{intv.fameGained} Fame</Badge>}
                          {intv.reputationChange > 0 && <Badge color="green">+{intv.reputationChange} Rep</Badge>}
                          {intv.reputationChange < 0 && <Badge color="red">{intv.reputationChange} Rep</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* Active Interview */
        <Card className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-4xl">🎙️</span>
            <h2 className="text-xl font-black text-white mt-2">
              {INTERVIEW_STATIONS.find(s => s.id === selectedStationId)?.name}
            </h2>
            {!interviewDone && (
              <p className="text-gray-500 text-sm">Question {currentQuestionIdx + 1} of {questions.length}</p>
            )}
          </div>

          {/* Q&A so far */}
          {answers.length > 0 && (
            <div className="space-y-4 mb-6">
              {answers.map((qa, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Interviewer:</p>
                    <p className="text-gray-300 text-sm">"{qa.q}"</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-yellow-500">{player.artistName}</p>
                      <Badge color={qa.tone === 'aggressive' ? 'red' : qa.tone === 'diplomatic' ? 'blue' : 'yellow'}>
                        {TONES.find(t => t.id === qa.tone)?.emoji} {qa.tone}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm">"{qa.a}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!interviewDone ? (
            <>
              {/* Current question */}
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">Interviewer:</p>
                <p className="text-white text-sm font-medium">"{questions[currentQuestionIdx]}"</p>
              </div>

              {/* Tone choices */}
              <div>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">How do you respond?</p>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map(tone => (
                    <button
                      key={tone.id}
                      onClick={() => handleAnswer(tone.id)}
                      className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-yellow-500/50 hover:bg-gray-700 transition-all"
                    >
                      <div className="text-lg mb-0.5">{tone.emoji}</div>
                      <div className="text-white text-xs font-bold">{tone.label}</div>
                      <div className="text-gray-500 text-xs">{tone.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Interview complete */}
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-lg font-black text-white">Interview Complete!</h3>
                <p className="text-gray-500 text-sm mt-1">
                  "{activeInterview?.headline}"
                </p>
                <div className="flex justify-center gap-3 mt-3">
                  {(activeInterview?.fameGained ?? 0) > 0 && (
                    <Badge color="yellow">+{activeInterview?.fameGained} Fame</Badge>
                  )}
                  {(activeInterview?.reputationChange ?? 0) !== 0 && (
                    <Badge color={(activeInterview?.reputationChange ?? 0) >= 0 ? 'green' : 'red'}>
                      {(activeInterview?.reputationChange ?? 0) >= 0 ? '+' : ''}{activeInterview?.reputationChange} Rep
                    </Badge>
                  )}
                </div>
                <div className="flex gap-3 justify-center mt-4">
                  <Button variant="gold" onClick={handleReset}>
                    Do Another Interview
                  </Button>
                  <Button variant="secondary" onClick={() => setScreen('social_chirp')}>
                    See Social Reactions
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
