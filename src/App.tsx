import { useGameStore } from './store/gameStore';
import { TurnReportModal } from './components/TurnReportModal';
import { Sidebar } from './components/layout/Sidebar';
import { SplashScreen } from './components/screens/SplashScreen';
import { goBack, startNav, useCanGoBack } from './components/layout/nav';
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
import { StyleScreen } from './components/screens/StyleScreen';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { AccountScreen } from './components/screens/AccountScreen';
import { useAccount } from './hooks/useAccount';
import { JournalScreen } from './components/screens/JournalScreen';
import { AppointmentModal } from './components/moments/AppointmentModal';
import { CatalogScreen } from './components/screens/CatalogScreen';
import { CreateArtistNpcScreen } from './components/screens/CreateArtistNpcScreen';
import { CourtModal } from './components/moments/CourtModal';
import { CeremonyModal } from './components/moments/CeremonyModal';
import { AwardsScreen } from './components/screens/AwardsScreen';
import { CourtScreen } from './components/screens/CourtScreen';
import type { Platform } from './types/game';

function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0B10] flex">
      <Sidebar />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 p-3 md:p-6 overflow-y-auto min-h-screen">
        <DesktopBack />
        {children}
      </main>
      {/* Overlays live above every screen, so a report raised by the clock is
          visible whichever page the player pressed it from. */}
      <TurnReportModal />
      <AppointmentModal />
      <CourtModal />
      <CeremonyModal />
    </div>
  );
}

/** On a computer there's no phone bar: a small back link above every page. */
function DesktopBack() {
  const can = useCanGoBack();
  if (!can) return null;
  return (
    <div className="hidden md:block mb-2">
      <button onClick={goBack} className="text-[13px] text-ink2 hover:text-ink">← Back</button>
    </div>
  );
}

function Standalone({ children }: { children: React.ReactNode }) {
  const setScreen = useGameStore((s) => s.setScreen);
  return (
    <div className="min-h-screen bg-[#0A0B10] px-3 py-4 sm:p-8">
      <div className="max-w-[760px] mx-auto mb-3"><button onClick={() => setScreen('splash')} className="text-[13px] text-ink2 hover:text-ink">← Home</button></div>
      {children}
    </div>
  );
}

startNav();

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const player = useGameStore((s) => s.player);

  // One interval for the whole app: the world moves whichever page is open.
  useGameClock();
  useAIRunner();

  const account = useAccount();

  // Nobody logged in: the welcome page (log in, create an account, or just play).
  if (!account) return <WelcomeScreen />;

  // Full-screen screens (no sidebar)
  if (screen === 'splash' || screen === 'welcome') return <SplashScreen />;
  // Settings reachable from the home page before a career is open.
  if (!player && (screen === 'ai' || screen === 'account')) return <Standalone>{screen === 'ai' ? <AISettingsScreen /> : <AccountScreen />}</Standalone>;
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
      case 'style': return <StyleScreen />;
      case 'journal': return <JournalScreen />;
      case 'account': return <AccountScreen />;
      case 'court': return <CourtScreen />;
      case 'awards': return <AwardsScreen />;
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
      case 'catalog':
        return <CatalogScreen />;
      case 'create_npc':
        return <CreateArtistNpcScreen />;
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
