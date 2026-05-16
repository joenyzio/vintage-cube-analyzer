import { useState, useEffect, useRef } from 'react';
import { useCubeData } from './hooks/useCubeData';
import { DashboardPage } from './components/DashboardPage';
import { OverviewPage } from './components/OverviewPage';
import { ArchetypesPage } from './components/ArchetypesPage';
import { PowerRankings } from './components/PowerRankings';
import { DraftGuide } from './components/DraftGuide';
import { CardBrowser } from './components/CardBrowser';
import { DraftSimulator } from './components/DraftSimulator';
import { SynergyExplorer } from './components/SynergyExplorer';
import { MatchupMatrix } from './components/MatchupMatrix';
import { SampleDecks } from './components/SampleDecks';
import { GamesPage } from './components/GamesPage';
import { ArchetypeOddsPage } from './components/ArchetypeOddsPage';
import {
  BarChart3, Layers, Trophy, BookOpen, Search, Sparkles,
  Gamepad2, Link2, Swords, ExternalLink, FileStack,
  ChevronLeft, Dices, Percent, Home
} from 'lucide-react';

// 4 Primary Sections (manabase pattern)
type SectionId = 'home' | 'practice' | 'learn' | 'reference';

// Sub-tabs within each section
type PracticeTab = 'draft' | 'games';
type LearnTab = 'archetypes' | 'decks' | 'guide' | 'synergies';
type ReferenceTab = 'cards' | 'power' | 'overview' | 'odds' | 'matchups';

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  mobileLabel: string;
}

// 4 flat nav items - like manabase
const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: Home, mobileLabel: 'Home' },
  { id: 'practice', label: 'Practice', icon: Gamepad2, mobileLabel: 'Practice' },
  { id: 'learn', label: 'Learn', icon: BookOpen, mobileLabel: 'Learn' },
  { id: 'reference', label: 'Reference', icon: Search, mobileLabel: 'Reference' },
];

// Tab definitions for each section
const PRACTICE_TABS = [
  { id: 'draft' as PracticeTab, label: 'Draft Simulator', icon: Gamepad2 },
  { id: 'games' as PracticeTab, label: 'Training Games', icon: Dices },
];

const LEARN_TABS = [
  { id: 'archetypes' as LearnTab, label: 'Archetypes', icon: Layers },
  { id: 'decks' as LearnTab, label: 'Sample Decks', icon: FileStack },
  { id: 'guide' as LearnTab, label: 'Draft Guide', icon: BookOpen },
  { id: 'synergies' as LearnTab, label: 'Synergies', icon: Link2 },
];

const REFERENCE_TABS = [
  { id: 'cards' as ReferenceTab, label: 'Cards', icon: Search },
  { id: 'power' as ReferenceTab, label: 'Power Rankings', icon: Trophy },
  { id: 'overview' as ReferenceTab, label: 'Cube Overview', icon: BarChart3 },
  { id: 'odds' as ReferenceTab, label: 'Draft Odds', icon: Percent },
  { id: 'matchups' as ReferenceTab, label: 'Matchups', icon: Swords },
];

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
      <div className="relative text-center space-y-8">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl animate-pulse-subtle" />
          <div className="relative glass-card rounded-2xl w-full h-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white/70 animate-pulse-subtle" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Vintage Cube Analyzer</h2>
          <p className="text-white/40 text-sm">Loading card data...</p>
        </div>
        <div className="w-72 mx-auto">
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-white/30 to-white/50 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/30 mt-3 font-mono text-xs tracking-wider">{progress}%</p>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <span className="text-2xl text-red-400">!</span>
        </div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Error Loading Data</h2>
        <p className="text-red-400/80 text-sm leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Horizontal Tab Navigation component
function TabNav<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: T; label: string; icon: React.ElementType }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${isActive
                ? 'bg-white/[0.08] text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const {
    cards,
    archetypes,
    draftStrategies,
    colorDistribution,
    manaCurve,
    typeDistribution,
    powerRankings,
    loading,
    error,
    progress,
  } = useCubeData();

  // Section state
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tab state for each section
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('draft');
  const [learnTab, setLearnTab] = useState<LearnTab>('archetypes');
  const [referenceTab, setReferenceTab] = useState<ReferenceTab>('cards');

  // Auto-start draft flag (when coming from Dashboard "Start Draft")
  const [autoStartDraft, setAutoStartDraft] = useState(false);

  const mainRef = useRef<HTMLElement>(null);

  // Navigation helper for Dashboard
  const handleNavigate = (target: string) => {
    // Map old tab IDs to new section/tab structure
    const mapping: Record<string, { section: SectionId; tab?: string }> = {
      'draft': { section: 'practice', tab: 'draft' },
      'games': { section: 'practice', tab: 'games' },
      'archetypes': { section: 'learn', tab: 'archetypes' },
      'decks': { section: 'learn', tab: 'decks' },
      'guide': { section: 'learn', tab: 'guide' },
      'synergies': { section: 'learn', tab: 'synergies' },
      'cards': { section: 'reference', tab: 'cards' },
      'power': { section: 'reference', tab: 'power' },
      'overview': { section: 'reference', tab: 'overview' },
      'odds': { section: 'reference', tab: 'odds' },
      'matchups': { section: 'reference', tab: 'matchups' },
    };

    const nav = mapping[target];
    if (nav) {
      setActiveSection(nav.section);
      if (nav.tab) {
        if (nav.section === 'practice') setPracticeTab(nav.tab as PracticeTab);
        if (nav.section === 'learn') setLearnTab(nav.tab as LearnTab);
        if (nav.section === 'reference') setReferenceTab(nav.tab as ReferenceTab);
      }
    }
  };

  // Scroll to top when section changes
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeSection, practiceTab, learnTab, referenceTab]);

  // Clear autoStartDraft when leaving practice section
  useEffect(() => {
    if (activeSection !== 'practice') {
      setAutoStartDraft(false);
    }
  }, [activeSection]);

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <DashboardPage
            cards={cards}
            onNavigate={handleNavigate}
            onStartDraft={() => {
              setAutoStartDraft(true);
              setActiveSection('practice');
              setPracticeTab('draft');
            }}
          />
        );

      case 'practice':
        return (
          <div className="space-y-6">
            <TabNav tabs={PRACTICE_TABS} activeTab={practiceTab} onTabChange={(tab) => {
              setPracticeTab(tab);
              if (tab !== 'draft') setAutoStartDraft(false);
            }} />
            {practiceTab === 'draft' && <DraftSimulator cards={cards} autoStart={autoStartDraft} />}
            {practiceTab === 'games' && <GamesPage cards={cards} />}
          </div>
        );

      case 'learn':
        return (
          <div className="space-y-6">
            <TabNav tabs={LEARN_TABS} activeTab={learnTab} onTabChange={setLearnTab} />
            {learnTab === 'archetypes' && <ArchetypesPage archetypes={archetypes} cards={cards} />}
            {learnTab === 'decks' && <SampleDecks cards={cards} />}
            {learnTab === 'guide' && <DraftGuide strategies={draftStrategies} />}
            {learnTab === 'synergies' && <SynergyExplorer cards={cards} />}
          </div>
        );

      case 'reference':
        return (
          <div className="space-y-6">
            <TabNav tabs={REFERENCE_TABS} activeTab={referenceTab} onTabChange={setReferenceTab} />
            {referenceTab === 'cards' && <CardBrowser cards={cards} />}
            {referenceTab === 'power' && <PowerRankings cards={cards} />}
            {referenceTab === 'overview' && (
              <OverviewPage
                cards={cards}
                archetypes={archetypes}
                colorDistribution={colorDistribution}
                manaCurve={manaCurve}
                typeDistribution={typeDistribution}
                powerRankings={powerRankings}
                onNavigate={handleNavigate}
              />
            )}
            {referenceTab === 'odds' && <ArchetypeOddsPage cards={cards} />}
            {referenceTab === 'matchups' && <MatchupMatrix archetypes={archetypes} cards={cards} />}
          </div>
        );

      default:
        return null;
    }
  };

  const activeNavItem = NAV_ITEMS.find(item => item.id === activeSection);

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      {/* Subtle background texture */}
      <div className="fixed inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.005] pointer-events-none" />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 modal-backdrop z-40 lg:hidden animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/[0.06]
          transition-all duration-300 ease-out flex-col safe-top
          hidden lg:flex
          ${sidebarCollapsed ? 'w-[72px]' : 'w-56'}
        `}
      >
        {/* Logo */}
        <div className={`min-h-16 flex items-center border-b border-white/[0.06] flex-shrink-0 ${sidebarCollapsed ? 'px-4 justify-center' : 'px-5'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 glass-card rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white/70" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-semibold text-white tracking-tight">Vintage Cube</h1>
                <p className="text-[11px] text-white/40 font-medium">360 cards</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation - 4 flat items */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-[13px] font-medium active:scale-[0.98]
                      ${sidebarCollapsed ? 'px-3 py-3.5 justify-center' : 'px-4 py-3'}
                      ${isActive
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                      }
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CubeCobra Link */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <a
              href="https://cubecobra.com/cube/list/8eec0c91-6c4e-4f96-957b-1ccc5ecac8fd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/40 hover:text-white/60 rounded-xl hover:bg-white/[0.04] transition-all duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              <span>CubeCobra</span>
            </a>
          </div>
        )}

        {/* Collapse Button */}
        <div className={`border-t border-white/[0.06] flex-shrink-0 ${sidebarCollapsed ? 'p-3' : 'px-3 py-2'}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-2 text-white/30 hover:text-white/50 transition-all duration-200 text-[12px]
              ${sidebarCollapsed ? 'w-full justify-center p-2' : 'px-4 py-2'}
            `}
          >
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative pb-16 lg:pb-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 sticky top-0 z-30 flex-shrink-0 safe-area-header min-h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white/70" />
            </div>
            <span className="text-sm font-semibold text-white">Vintage Cube</span>
          </div>
          {activeNavItem && (
            <span className="text-xs text-white/40 font-medium">{activeNavItem.label}</span>
          )}
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] items-center px-6 sticky top-0 z-30 flex-shrink-0 min-h-14">
          <div className="flex items-center gap-3">
            {activeNavItem && (
              <>
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <activeNavItem.icon className="w-4 h-4 text-white/50" />
                </div>
                <span className="text-sm font-medium text-white tracking-tight">{activeNavItem.label}</span>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main ref={mainRef} className="flex-1 overflow-auto relative">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
            {renderContent()}
          </div>
        </main>

        {/* Desktop Footer */}
        <footer className="hidden lg:block border-t border-white/[0.04] flex-shrink-0 bg-black/50">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <p className="text-white/30 text-xs">
              Data from{' '}
              <a href="https://scryfall.com" className="text-white/50 hover:text-white/70 transition-colors" target="_blank" rel="noopener noreferrer">
                Scryfall
              </a>
              {' '}· Not affiliated with Wizards of the Coast
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation - Like manabase */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 w-full h-full transition-colors
                  ${isActive ? 'text-white' : 'text-white/40'}
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                <span className="text-[10px] font-medium">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
