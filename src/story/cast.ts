export interface CastMember { id: string; name: string; role: string; emoji: string; color: string }
export const CAST: Record<string, CastMember> = {
  esi: { id: 'esi', name: 'Mama Esi', role: "Owner, Mama's Kitchen", emoji: '👩🏾‍🍳', color: '#f59e0b' },
  static: { id: 'static', name: 'Static', role: 'Rapper', emoji: '🎤', color: '#22d3ee' },
  ankh: { id: 'ankh', name: 'Ankh', role: 'Producer, Studio 9', emoji: '🎛️', color: '#a78bfa' },
  efua: { id: 'efua', name: 'Efua Mensah-Quartey', role: 'CEO, Gold Coast Sound', emoji: '🏢', color: '#f43f5e' },
  mimi: { id: 'mimi', name: 'Mimi Owusu-Banson', role: 'A&R and manager', emoji: '📋', color: '#34d399' },
  adwoa: { id: 'adwoa', name: 'Adwoa Sarpong', role: 'Singer', emoji: '🎶', color: '#fb7185' },
  selasi: { id: 'selasi', name: 'Selasi Tetteh', role: 'Director', emoji: '🎬', color: '#60a5fa' },
  radiok: { id: 'radiok', name: 'Radio K', role: 'The Midnight Cypher', emoji: '📻', color: '#fbbf24' },
  moses: { id: 'moses', name: 'Big Moses', role: 'Promoter', emoji: '💼', color: '#94a3b8' },
  afia: { id: 'afia', name: 'Afia Boakye', role: 'Music lawyer', emoji: '⚖️', color: '#c084fc' },
  fiifi: { id: 'fiifi', name: 'Fiifi', role: 'From the block', emoji: '🧢', color: '#4ade80' },
  zee: { id: 'zee', name: 'Lady Zee', role: 'Pop star', emoji: '✨', color: '#f472b6' },
  kj: { id: 'kj', name: 'KJ', role: 'Childhood friend', emoji: '😎', color: '#f97316' },
  mum: { id: 'mum', name: 'Mum', role: 'Family', emoji: '👩🏾', color: '#fda4af' },
  unknown: { id: 'unknown', name: 'Unknown number', role: '', emoji: '❓', color: '#64748b' },
  you: { id: 'you', name: 'You', role: '', emoji: '🙂', color: '#e5e7eb' },
  narr: { id: 'narr', name: '', role: '', emoji: '', color: '#9ca3af' },
};
export const BOND_CAST = ['esi', 'static', 'ankh', 'efua', 'mimi', 'adwoa', 'selasi', 'radiok', 'moses', 'afia', 'fiifi', 'kj', 'mum'];
