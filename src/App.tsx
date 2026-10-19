import { useGameStore } from './store/gameStore';
import { TurnReportModal } from './components/TurnReportModal';
import { Sidebar } from './components/layout/Sidebar';
import { SplashScreen } from './components/screens/SplashScreen';
import { CreateArtistScreen } from './components/screens/CreateArtistScreen';
import { Dashboard } from './components/screens/Dashboard';
import { StudioScreen } from './components/screens/StudioScreen';
import { PingChatScreen } from './components/screens/PingChatScreen';
import { MailboxScreen } from './components/screens/MailboxScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { TeamScreen } from './components/screens/TeamScreen';
import { TaxScreen } from './components/screens/TaxScreen';
import { CareersScreen } from './components/screens/CareersScreen';
import { IndustryLifeScreen } from './components/screens/IndustryLifeScreen';
import { LabelScreen } from './components/screens/LabelScreen';
import { TrainingScreen } from './components/screens/TrainingScreen';
import { JobsScreen } from './components/screens/JobsScreen';
import { ShowsScreen } from './components/screens/ShowsScreen';
import { NPCProfileScreen } from './components/screens/NPCProfileScreen';
import { InterviewsScreen } from './components/screens/InterviewsScreen';
import { MoneyScreen } from './components/screens/MoneyScreen';
import { TrophyRoomScreen } from './components/screens/TrophyRoomScreen';
import { NewsScreen } from './components/screens/NewsScreen';
import { LifestyleScreen } from './components/screens/LifestyleScreen';
import { SocialScreen } from './components/screens/SocialScreen';
import { StreamsHomeScreen } from './components/screens/StreamsHomeScreen';
import { ChartsScreen } from './components/screens/ChartsScreen';
import { StreamingScreen } from './components/screens/StreamingScreen';
import { PlatformScreen } from './components/screens/PlatformScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { VideosScreen } from './components/screens/VideosScreen';
import { WatchScreen } from './components/screens/WatchScreen';
import { ChannelScreen } from './components/screens/ChannelScreen';
import { ArtistPageScreen } from './components/screens/ArtistPageScreen';
import { SongScreen } from './components/screens/SongScreen';
import { CreateVideoScreen } from './components/screens/CreateVideoScreen';
import { useGameClock } from './hooks/useGameClock';
import { useAIRunner } from './hooks/useAIRunner';
import { AISettingsScreen } from './components/screens/AISettingsScreen';
import { AppointmentModal } from './components/moments/AppointmentModal';
import type { Platform } from './types/game';

function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0B10] flex">
      <Sidebar />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 p-3 md:p-6 overflow-y-auto min-h-screen">
        {children}
      </main>
      {/* Overlays live above every screen, so a report raised by the clock is
          visible whichever page the player pressed it from. */}
      <TurnReportModal />
      <AppointmentModal />
    </div>
  );
}

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const player = useGameStore((s) => s.player);

  // One interval for the whole app: the world moves whichever page is open.
  useGameClock();
  useAIRunner();

  // Full-screen screens (no sidebar)
  if (screen === 'splash') return <SplashScreen />;
  if (screen === 'create_artist') return <CreateArtistScreen />;

  // The careers list has to work with no career open — that is exactly the
  // state you are in when you need it — so it renders standalone until one is
  // loaded, and inside the shell afterwards.
  if (screen === 'careers' && !player) return <CareersScreen standalone />;

  // Should never reach here without a player
  if (!player) return <SplashScreen />;

  function renderScreen() {
    switch (screen) {
      case 'dashboard': return <Dashboard />;
      case 'studio': return <StudioScreen />;
      case 'pingchat': return <PingChatScreen />;
      case 'mailbox': return <MailboxScreen />;
      case 'stats': return <StatsScreen />;
      case 'team': return <TeamScreen />;
      case 'tax': return <TaxScreen />;
      case 'careers': return <CareersScreen />;
      case 'training': return <TrainingScreen />;
      case 'jobs': return <JobsScreen />;
      case 'shows': return <ShowsScreen />;
      case 'npc_profile': return <NPCProfileScreen />;
      case 'interviews': return <InterviewsScreen />;
      case 'ai': return <AISettingsScreen />;
      case 'investments': return <MoneyScreen />;
      case 'trophy_room': return <TrophyRoomScreen />;
      case 'news': return <NewsScreen />;
      case 'lifestyle': return <LifestyleScreen />;
      case 'retirement': return <IndustryLifeScreen />;
      case 'label': return <LabelScreen />;
      case 'social_chirp': return <SocialScreen platform={'chirp' as Platform} />;
      case 'social_snapgram': return <SocialScreen platform={'snapgram' as Platform} />;
      case 'social_clip': return <SocialScreen platform={'clip' as Platform} />;
      case 'social_circle': return <SocialScreen platform={'circle' as Platform} />;

      // ── RAP LIFE Streams ────────────────────────────────────────────
      case 'streams':
        return <StreamsHomeScreen />;
      // The global charts are their own destination. Pointing this at the
      // Streams home made the "Global Charts" button, the shell's "Top Charts"
      // entry and the sidebar's "Charts" entry all silent no-ops, and left the
      // BillBoard Global Top 100 / Top 200 unreachable.
      case 'charts':
        return <ChartsScreen />;
      case 'streaming': return <StreamingScreen />;
      case 'platform': return <PlatformScreen />;
      case 'search': return <SearchScreen />;

      // ── Video platform ──────────────────────────────────────────────
      case 'videos': return <VideosScreen />;
      case 'watch': return <WatchScreen />;
      case 'channel': return <ChannelScreen />;
      case 'create_video': return <CreateVideoScreen />;
      case 'artist_page': return <ArtistPageScreen />;
      case 'song': return <SongScreen />;

      default: return <Dashboard />;
    }
  }

  return <GameLayout>{renderScreen()}</GameLayout>;
}
