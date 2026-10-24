// ─── THE AI, RUNNING IN THE BACKGROUND ─────────────────────────────────────
// Answers chats that are waiting, lets the people around you act once a game
// day, writes comments under your new posts, and keeps interview hosts live.
// Does nothing at all when the AI is off.

import { useEffect } from 'react';
import { useGameStore, nowMinuteOf } from '../store/gameStore';
import { aiSettings } from '../sim/ai';
import { kickAI, runDirector, runFeed, runTeamChatter, commentsForPost, interviewFollowUp } from '../ai/bridge';

export function useAIRunner() {
  useEffect(() => {
    let lastPost = useGameStore.getState().socialPosts.find((p) => p.isPlayerPost)?.id ?? '';
    let lastIv = '';
    const id = window.setInterval(() => {
      const st = useGameStore.getState();
      if (!st.player) return;
      // Always: anything waiting on a reply gets one (AI, or the built-in fallback).
      kickAI();
      if (!aiSettings().enabled) return;
      const newest = st.socialPosts.find((p) => p.isPlayerPost);
      if (newest && newest.id !== lastPost) { lastPost = newest.id; void commentsForPost(newest.id); }
      const live = st.activeInterview;
      const ivKey = live ? `${live.id}|${live.idx}` : '';
      if (ivKey && ivKey !== lastIv) { lastIv = ivKey; void interviewFollowUp(); }
      if (Math.floor(nowMinuteOf(st) / 1440) && !document.hidden) { void runDirector(); void runFeed(); void runTeamChatter(); }
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
}
