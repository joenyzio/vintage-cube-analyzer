import { useState } from 'react';
import { useCubeData } from './hooks/useCubeData';
import { Card, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { ColorDistributionChart } from './components/charts/ColorDistributionChart';
import { ManaCurveChart } from './components/charts/ManaCurveChart';
import { TypeDistributionChart } from './components/charts/TypeDistributionChart';
import { StatsOverview } from './components/StatsOverview';
import { ArchetypeCard } from './components/ArchetypeCard';
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
      <div className="text-center space-y-8">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-xl bg-[#111] border border-white/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white/60 animate-pulse" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">Loading Cube Data</h2>
          <p className="text-white/50 mb-6">Fetching card data from Scryfall...</p>
          <div className="w-64 mx-auto h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/40 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/30 mt-3 font-mono text-sm">{progress}%</p>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="text-xl font-semibold text-white">Error Loading Data</h2>
        <p className="text-red-400/80 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-white/5 text-white border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
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
          <div className="space-y-8">
            <StatsOverview
              cards={cards}
              colorDistribution={colorDistribution}
              typeDistribution={typeDistribution}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-[#111] border-white/8">
                <CardHeader>
                  <CardTitle>Color Distribution</CardTitle>
                  <CardDescription>Breakdown of mono-colored cards</CardDescription>
                </CardHeader>
                <ColorDistributionChart data={colorDistribution} />
              </Card>
              <Card className="bg-[#111] border-white/8">
                <CardHeader>
                  <CardTitle>Mana Curve</CardTitle>
                  <CardDescription>Distribution by mana value and color</CardDescription>
                </CardHeader>
                <ManaCurveChart data={manaCurve} />
              </Card>
            </div>
            <Card className="bg-[#111] border-white/8">
              <CardHeader>
                <CardTitle>Card Types</CardTitle>
                <CardDescription>Number of cards by type</CardDescription>
              </CardHeader>
              <TypeDistributionChart data={typeDistribution} />
            </Card>
            <Card className="bg-[#111] border-white/8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Quick Insights
                </CardTitle>
              </CardHeader>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                  <h4 className="font-medium text-white mb-2">Best First Picks</h4>
                  <p className="text-sm text-white/50">
                    Black Lotus, Ancestral Recall, Sol Ring, Mana Crypt - colorless power goes in every deck
                  </p>
                </div>
                <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                  <h4 className="font-medium text-white mb-2">Blue is King</h4>
                  <p className="text-sm text-white/50">
                    Blue has the most powerful spells. Time Walk, Ancestral, and counterspells are premium.
                  </p>
                </div>
                <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                  <h4 className="font-medium text-white mb-2">Fast Mana Wins</h4>
                  <p className="text-sm text-white/50">
                    Turn 1 Sol Ring or Mana Crypt is often game-deciding. Prioritize acceleration.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'draft':
        return <DraftSimulator cards={cards} />;
      case 'archetypes':
        return (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {archetypes.map((archetype) => (
                <ArchetypeCard key={archetype.id} archetype={archetype} />
              ))}
            </div>
            <Card className="bg-[#111] border-white/8">
              <CardHeader>
                <CardTitle>Archetype Tier List</CardTitle>
                <CardDescription>Relative power level when optimally drafted</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                <div className="p-4 tier-s rounded-lg">
                  <h4 className="font-semibold text-amber-400 mb-1">S Tier</h4>
                  <p className="text-white/80 text-sm">UB Reanimator, Artifact Combo, UR Storm</p>
                </div>
                <div className="p-4 tier-a rounded-lg">
                  <h4 className="font-semibold text-purple-400 mb-1">A Tier</h4>
                  <p className="text-white/80 text-sm">UW Control, UG Ramp, Show & Tell</p>
                </div>
                <div className="p-4 tier-b rounded-lg">
                  <h4 className="font-semibold text-blue-400 mb-1">B Tier</h4>
                  <p className="text-white/80 text-sm">BR Aggro, RW Aggro, BG Midrange</p>
                </div>
              </div>
            </Card>
          </div>
        );
      case 'decks':
        return <SampleDecks cards={cards} />;
      case 'matchups':
        return <MatchupMatrix archetypes={archetypes} />;
      case 'synergies':
        return <SynergyExplorer cards={cards} archetypes={archetypes} />;
      case 'buildaround':
        return <BuildAround cards={cards} />;
      case 'power':
        return (
          <div className="space-y-6">
            <PowerRankings cards={powerRankings} />
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-[#111] border-white/8">
                <CardHeader>
                  <CardTitle>The Power Nine</CardTitle>
                  <CardDescription>The most iconic cards ever printed</CardDescription>
                </CardHeader>
                <div className="space-y-1">
                  {cards
                    .filter(c => ['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Pearl',
                                  'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Timetwister'].includes(c.name))
                    .map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 bg-white/2 rounded-lg">
                        <span className="text-white text-sm">{card.name}</span>
                        <span className="text-amber-400 text-xs ml-auto font-mono">10</span>
                      </div>
                    ))
                  }
                </div>
              </Card>
              <Card className="bg-[#111] border-white/8">
                <CardHeader>
                  <CardTitle>Fast Mana</CardTitle>
                  <CardDescription>Cards that accelerate you</CardDescription>
                </CardHeader>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {cards
                    .filter(c => c.role === 'fast_mana')
                    .sort((a, b) => b.powerLevel - a.powerLevel)
                    .slice(0, 10)
                    .map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 bg-white/2 rounded-lg">
                        <span className="text-white text-sm">{card.name}</span>
                        <span className="text-white/40 text-xs ml-auto font-mono">{card.powerLevel}</span>
                      </div>
                    ))
                  }
                </div>
              </Card>
            </div>
          </div>
        );
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
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#0a0a0a] border-r border-white/8
          transition-all duration-200 flex flex-col
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-[68px]' : 'w-60'}
        `}
      >
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-white/8 flex-shrink-0 ${sidebarCollapsed ? 'px-4 justify-center' : 'px-4'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white/60" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-semibold text-white truncate">Vintage Cube</h1>
                <p className="text-[11px] text-white/40">360 cards</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 rounded-lg transition-all text-[13px]
                      ${sidebarCollapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2'}
                      ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={`border-t border-white/8 flex-shrink-0 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
          {!sidebarCollapsed && (
            <a
              href="https://cubecobra.com/cube/list/8eec0c91-6c4e-4f96-957b-1ccc5ecac8fd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-white/40 hover:text-white/60 rounded-lg hover:bg-white/5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              CubeCobra
            </a>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              hidden lg:flex items-center justify-center gap-2 text-white/40 hover:text-white/60 rounded-lg hover:bg-white/5 transition-all text-[13px]
              ${sidebarCollapsed ? 'w-full p-2.5' : 'w-full px-3 py-2 mt-1'}
            `}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 bg-[#0a0a0a] border-b border-white/8 flex items-center px-4 lg:px-6 sticky top-0 z-30 flex-shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-white/60 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 lg:ml-0 ml-2">
            {activeNavItem && (
              <>
                <activeNavItem.icon className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white">{activeNavItem.label}</span>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
            {renderContent()}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4">
            <p className="text-white/30 text-xs">
              Data from{' '}
              <a href="https://scryfall.com" className="text-white/50 hover:text-white/70" target="_blank" rel="noopener noreferrer">
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
