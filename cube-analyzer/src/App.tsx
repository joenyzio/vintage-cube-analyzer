import { useCubeData } from './hooks/useCubeData';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/Tabs';
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
  Gamepad2, Link2, Swords, ExternalLink, FileStack, Lightbulb
} from 'lucide-react';

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-8">
        {/* Animated card stack */}
        <div className="relative w-32 h-44 mx-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl"
              style={{
                transform: `rotate(${(i - 1) * 8}deg) translateY(${i * 4}px)`,
                opacity: 1 - i * 0.2,
                animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Loading Cube Data</h2>
          <p className="text-gray-400 mb-6">Fetching card data from Scryfall...</p>

          {/* Progress bar */}
          <div className="w-64 mx-auto h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-purple-400 mt-3 font-mono">{progress}%</p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
          50% { transform: translateY(-10px) rotate(var(--rotate, 0deg)); }
        }
      `}</style>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
          <span className="text-4xl">💀</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Error Loading Data</h2>
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
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

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Gradient background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-900/20 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Vintage Cube Analyzer</h1>
                <p className="text-sm text-gray-400">360 cards • Deep analysis & draft strategies</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://cubecobra.com/cube/list/8eec0c91-6c4e-4f96-957b-1ccc5ecac8fd"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                View on CubeCobra
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="flex-wrap bg-gray-900/50 backdrop-blur-sm border border-gray-800/50">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="draft">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Draft Simulator
            </TabsTrigger>
            <TabsTrigger value="archetypes">
              <Layers className="w-4 h-4 mr-2" />
              Archetypes
            </TabsTrigger>
            <TabsTrigger value="decks">
              <FileStack className="w-4 h-4 mr-2" />
              Sample Decks
            </TabsTrigger>
            <TabsTrigger value="matchups">
              <Swords className="w-4 h-4 mr-2" />
              Matchups
            </TabsTrigger>
            <TabsTrigger value="synergies">
              <Link2 className="w-4 h-4 mr-2" />
              Synergies
            </TabsTrigger>
            <TabsTrigger value="buildaround">
              <Lightbulb className="w-4 h-4 mr-2" />
              Build Around
            </TabsTrigger>
            <TabsTrigger value="power">
              <Trophy className="w-4 h-4 mr-2" />
              Power Rankings
            </TabsTrigger>
            <TabsTrigger value="guide">
              <BookOpen className="w-4 h-4 mr-2" />
              Draft Guide
            </TabsTrigger>
            <TabsTrigger value="cards">
              <Search className="w-4 h-4 mr-2" />
              Card Browser
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-300">
            <StatsOverview
              cards={cards}
              colorDistribution={colorDistribution}
              typeDistribution={typeDistribution}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
                <CardHeader>
                  <CardTitle>Color Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of mono-colored cards (excluding lands)
                  </CardDescription>
                </CardHeader>
                <ColorDistributionChart data={colorDistribution} />
              </Card>

              <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
                <CardHeader>
                  <CardTitle>Mana Curve</CardTitle>
                  <CardDescription>
                    Distribution of cards by mana value and color
                  </CardDescription>
                </CardHeader>
                <ManaCurveChart data={manaCurve} />
              </Card>
            </div>

            <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
              <CardHeader>
                <CardTitle>Card Type Distribution</CardTitle>
                <CardDescription>
                  Number of cards by type
                </CardDescription>
              </CardHeader>
              <TypeDistributionChart data={typeDistribution} />
            </Card>

            {/* Quick Insights */}
            <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Quick Insights
                </CardTitle>
              </CardHeader>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 bg-gradient-to-br from-purple-900/30 to-transparent rounded-xl border border-purple-500/20">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span> Best First Picks
                  </h4>
                  <p className="text-sm text-gray-400">
                    Black Lotus, Ancestral Recall, Sol Ring, Mana Crypt - colorless power goes in every deck
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-900/30 to-transparent rounded-xl border border-blue-500/20">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">💧</span> Blue is King
                  </h4>
                  <p className="text-sm text-gray-400">
                    Blue has the most powerful spells. Time Walk, Ancestral, and counterspells are premium.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-900/30 to-transparent rounded-xl border border-red-500/20">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">⚡</span> Fast Mana Wins
                  </h4>
                  <p className="text-sm text-gray-400">
                    Turn 1 Sol Ring or Mana Crypt is often game-deciding. Prioritize acceleration.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-900/30 to-transparent rounded-xl border border-green-500/20">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">🌿</span> Green Ramps Hard
                  </h4>
                  <p className="text-sm text-gray-400">
                    8 one-mana dorks plus Channel means green can deploy threats incredibly fast.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-800/50 to-transparent rounded-xl border border-gray-600/20">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">⚙️</span> Artifacts Matter
                  </h4>
                  <p className="text-sm text-gray-400">
                    Tinker, Tolarian Academy, and Workshop enable broken artifact synergies.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-yellow-900/30 to-transparent rounded-xl border border-yellow-500/20">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">🏆</span> Combo Potential
                  </h4>
                  <p className="text-sm text-gray-400">
                    Multiple combo kills: Storm, Reanimator, Show & Tell, Channel. Be prepared!
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Draft Simulator Tab */}
          <TabsContent value="draft" className="animate-in fade-in duration-300">
            <DraftSimulator cards={cards} />
          </TabsContent>

          {/* Archetypes Tab */}
          <TabsContent value="archetypes" className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Cube Archetypes</h2>
                <p className="text-gray-400">
                  The most powerful strategies and how to draft them
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {archetypes.map((archetype) => (
                <ArchetypeCard key={archetype.id} archetype={archetype} />
              ))}
            </div>

            {/* Archetype Tier List */}
            <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
              <CardHeader>
                <CardTitle>Archetype Tier List</CardTitle>
                <CardDescription>
                  Relative power level of each strategy when optimally drafted
                </CardDescription>
              </CardHeader>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-yellow-900/40 to-transparent border-l-4 border-yellow-500 rounded-r-lg">
                  <h4 className="font-bold text-yellow-400 mb-2">S Tier - The Best</h4>
                  <p className="text-gray-300">UB Reanimator, Artifact Combo, UR Storm</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Can win on turns 1-3 with the right draw. Maximum power potential.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-900/40 to-transparent border-l-4 border-purple-500 rounded-r-lg">
                  <h4 className="font-bold text-purple-400 mb-2">A Tier - Very Strong</h4>
                  <p className="text-gray-300">UW Control, UG Ramp, Show & Tell, Oath</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Consistently powerful. Can compete with S-tier when well-drafted.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-900/40 to-transparent border-l-4 border-blue-500 rounded-r-lg">
                  <h4 className="font-bold text-blue-400 mb-2">B Tier - Solid</h4>
                  <p className="text-gray-300">BR Aggro, RW Aggro, BG Midrange, UW Blink</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Good fallback options. Can steal games from better decks.
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-r from-gray-800/50 to-transparent border-l-4 border-gray-600 rounded-r-lg">
                  <h4 className="font-bold text-gray-400 mb-2">C Tier - Playable</h4>
                  <p className="text-gray-300">Mono White Aggro, Other color pairs</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Requires the table to cooperate. Draft when wide open.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Sample Decks Tab */}
          <TabsContent value="decks" className="animate-in fade-in duration-300">
            <SampleDecks cards={cards} />
          </TabsContent>

          {/* Matchups Tab */}
          <TabsContent value="matchups" className="animate-in fade-in duration-300">
            <MatchupMatrix archetypes={archetypes} />
          </TabsContent>

          {/* Synergies Tab */}
          <TabsContent value="synergies" className="animate-in fade-in duration-300">
            <SynergyExplorer cards={cards} archetypes={archetypes} />
          </TabsContent>

          {/* Build Around Tab */}
          <TabsContent value="buildaround" className="animate-in fade-in duration-300">
            <BuildAround cards={cards} />
          </TabsContent>

          {/* Power Rankings Tab */}
          <TabsContent value="power" className="space-y-6 animate-in fade-in duration-300">
            <PowerRankings cards={powerRankings} />

            {/* Power Categories */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">💎</span> The Power Nine
                  </CardTitle>
                  <CardDescription>The most iconic and powerful cards ever printed</CardDescription>
                </CardHeader>
                <div className="space-y-2">
                  {cards
                    .filter(c => ['Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Pearl',
                                  'Mox Sapphire', 'Mox Jet', 'Mox Ruby', 'Mox Emerald', 'Timetwister'].includes(c.name))
                    .map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                        <span className="text-white font-medium">{card.name}</span>
                        <span className="text-yellow-500 text-sm ml-auto font-bold">Power: 10</span>
                      </div>
                    ))
                  }
                </div>
              </Card>

              <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">⚡</span> Fast Mana
                  </CardTitle>
                  <CardDescription>Cards that accelerate you ahead of the curve</CardDescription>
                </CardHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                  {cards
                    .filter(c => c.role === 'fast_mana')
                    .sort((a, b) => b.powerLevel - a.powerLevel)
                    .map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                        <span className="text-white font-medium">{card.name}</span>
                        <span className="text-purple-400 text-sm ml-auto">Power: {card.powerLevel}</span>
                      </div>
                    ))
                  }
                </div>
              </Card>

              <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">📚</span> Tutors
                  </CardTitle>
                  <CardDescription>Find exactly what you need</CardDescription>
                </CardHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                  {cards
                    .filter(c => c.role === 'tutor')
                    .sort((a, b) => b.powerLevel - a.powerLevel)
                    .map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                        <span className="text-white font-medium">{card.name}</span>
                        <span className="text-blue-400 text-sm ml-auto">Power: {card.powerLevel}</span>
                      </div>
                    ))
                  }
                </div>
              </Card>

              <Card className="backdrop-blur-sm bg-gray-900/80 border-gray-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">💀</span> Reanimation Targets
                  </CardTitle>
                  <CardDescription>The fatties you want to cheat into play</CardDescription>
                </CardHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                  {cards
                    .filter(c => c.role === 'reanimation_target')
                    .sort((a, b) => b.powerLevel - a.powerLevel)
                    .map(card => (
                      <div key={card.id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                        <span className="text-white font-medium">{card.name}</span>
                        <span className="text-red-400 text-sm ml-auto">Power: {card.powerLevel}</span>
                      </div>
                    ))
                  }
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Draft Guide Tab */}
          <TabsContent value="guide" className="animate-in fade-in duration-300">
            <DraftGuide strategies={draftStrategies} />
          </TabsContent>

          {/* Card Browser Tab */}
          <TabsContent value="cards" className="animate-in fade-in duration-300">
            <CardBrowser cards={cards} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-gray-800/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              Card data from{' '}
              <a href="https://scryfall.com" className="text-purple-400 hover:text-purple-300" target="_blank" rel="noopener noreferrer">
                Scryfall
              </a>
              {' '}• Cube from{' '}
              <a href="https://cubecobra.com" className="text-purple-400 hover:text-purple-300" target="_blank" rel="noopener noreferrer">
                CubeCobra
              </a>
            </p>
            <p className="text-gray-600 text-xs">
              Not affiliated with Wizards of the Coast. Magic: The Gathering is a trademark of Wizards of the Coast LLC.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
