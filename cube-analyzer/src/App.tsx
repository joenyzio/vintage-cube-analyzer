import { useState } from 'react';
import { useCubeData } from './hooks/useCubeData';
import { OverviewPage } from './components/OverviewPage';
import { ArchetypesPage } from './components/ArchetypesPage';
import { PowerRankings } from './components/PowerRankings';
import { DraftGuide } from './components/DraftGuide';
import { CardBrowser } from './components/CardBrowser';
import { DraftSimulator } from './components/DraftSimulator';
import { SynergyExplorer } from './components/SynergyExplorer';
import { MatchupMatrix } from './components/MatchupMatrix';
import { SampleDecks } from './components/SampleDecks';
import { BuildAround } from './components/BuildAround';
import {
  BarChart3, Layers, Trophy, BookOpen, Search, Sparkles,
  Gamepad2, Link2, Swords, ExternalLink, FileStack, Lightbulb,
  Menu, ChevronLeft
} from 'lucide-react';

type TabId = 'overview' | 'draft' | 'archetypes' | 'decks' | 'matchups' | 'synergies' | 'buildaround' | 'power' | 'guide' | 'cards';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'draft', label: 'Draft Simulator', icon: Gamepad2 },
  { id: 'archetypes', label: 'Archetypes', icon: Layers },
  { id: 'decks', label: 'Sample Decks', icon: FileStack },
  { id: 'matchups', label: 'Matchups', icon: Swords },
  { id: 'synergies', label: 'Synergies', icon: Link2 },
  { id: 'buildaround', label: 'Build Around', icon: Lightbulb },
  { id: 'power', label: 'Power Rankings', icon: Trophy },
  { id: 'guide', label: 'Draft Guide', icon: BookOpen },
  { id: 'cards', label: 'Card Browser', icon: Search },
];

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

      <div className="relative text-center space-y-8">
        {/* Logo with glow */}
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

        {/* Progress bar */}
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

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPage
            cards={cards}
            archetypes={archetypes}
            colorDistribution={colorDistribution}
            manaCurve={manaCurve}
            typeDistribution={typeDistribution}
            powerRankings={powerRankings}
            onNavigate={(tab) => setActiveTab(tab as TabId)}
          />
        );
      case 'draft':
        return <DraftSimulator cards={cards} />;
      case 'archetypes':
        return <ArchetypesPage archetypes={archetypes} cards={cards} />;
      case 'decks':
        return <SampleDecks cards={cards} />;
      case 'matchups':
        return <MatchupMatrix archetypes={archetypes} />;
      case 'synergies':
        return <SynergyExplorer cards={cards} />;
      case 'buildaround':
        return <BuildAround cards={cards} />;
      case 'power':
        return <PowerRankings cards={cards} />;
      case 'guide':
        return <DraftGuide strategies={draftStrategies} />;
      case 'cards':
        return <CardBrowser cards={cards} />;
      default:
        return null;
    }
  };

  const activeNavItem = NAV_ITEMS.find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-black flex">
      {/* Subtle background texture */}
      <div className="fixed inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.005] pointer-events-none" />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 modal-backdrop z-40 lg:hidden animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/[0.06]
          transition-all duration-300 ease-out flex flex-col
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-white/[0.06] flex-shrink-0 ${sidebarCollapsed ? 'px-4 justify-center' : 'px-5'}`}>
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

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="animate-in slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-[13px] font-medium active:scale-[0.98]
                      ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-3.5 py-3 lg:py-2.5'}
                      ${isActive
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                      }
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CubeCobra Link - above the line */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <a
              href="https://cubecobra.com/cube/list/8eec0c91-6c4e-4f96-957b-1ccc5ecac8fd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-white/40 hover:text-white/60 rounded-xl hover:bg-white/[0.04] transition-all duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on CubeCobra</span>
            </a>
          </div>
        )}

        {/* Collapse Button - desktop only */}
        <div className={`hidden lg:block border-t border-white/[0.06] flex-shrink-0 ${sidebarCollapsed ? 'p-3' : 'px-3 py-2'}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-2 text-white/30 hover:text-white/50 transition-all duration-200 text-[12px]
              ${sidebarCollapsed ? 'w-full justify-center p-2' : 'px-3.5 py-2'}
            `}
          >
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Mobile: Add safe area padding at bottom */}
        <div className="lg:hidden h-4 flex-shrink-0" />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 lg:px-6 sticky top-0 z-30 flex-shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2.5 -ml-2 text-white/60 hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 lg:ml-0 ml-2">
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
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
            {renderContent()}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] flex-shrink-0 bg-black/50">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-5">
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
    </div>
  );
}

export default App;
