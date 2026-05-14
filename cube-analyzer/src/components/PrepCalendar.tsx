/**
 * Draft Prep Calendar
 *
 * Visual schedule for preparing for a draft on May 26, 2026.
 */

import { useState } from 'react';
import { CheckCircle, Circle, Target, BookOpen, Gamepad2, Brain, Trophy, Clock, ChevronRight } from 'lucide-react';

interface DayTask {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'learn' | 'practice' | 'drill' | 'review';
  completed: boolean;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  phase: string;
  tasks: DayTask[];
  focus: string;
}

// Generate schedule from May 14 to May 26
const PREP_SCHEDULE: DaySchedule[] = [
  {
    date: 'May 14',
    dayOfWeek: 'Wed',
    dayNumber: 1,
    phase: 'Learn the Data',
    focus: 'Wheel Rates',
    tasks: [
      { id: '1-1', title: 'Study Wheel Rate Data', description: 'Open drafter with coach mode. Note which cards have "Wheels" vs "Rare" badges.', duration: '15 min', type: 'learn', completed: false },
      { id: '1-2', title: 'Memorize Always-Take Cards', description: 'Power 9, Mana Drain, Sol Ring, The One Ring, Oko, Hullbreacher, Bowmasters', duration: '10 min', type: 'learn', completed: false },
      { id: '1-3', title: 'First Draft Run', description: 'Complete one full draft with coach mode ON', duration: '15 min', type: 'practice', completed: false },
    ],
  },
  {
    date: 'May 15',
    dayOfWeek: 'Thu',
    dayNumber: 2,
    phase: 'Learn the Data',
    focus: 'Wheel Rates Deep Dive',
    tasks: [
      { id: '2-1', title: 'Safe-to-Pass Cards', description: 'Study cards with >80% wheel rate: Damn, Vindicate, Golos, dual lands', duration: '10 min', type: 'learn', completed: false },
      { id: '2-2', title: 'Draft Practice', description: 'Run 2 drafts. Focus on passing wheelers and taking rare cards.', duration: '25 min', type: 'practice', completed: false },
      { id: '2-3', title: 'P1P1 Quiz', description: '5 quiz questions to drill first-pick instincts', duration: '5 min', type: 'drill', completed: false },
    ],
  },
  {
    date: 'May 16',
    dayOfWeek: 'Fri',
    dayNumber: 3,
    phase: 'Learn the Data',
    focus: 'Archetype Ceilings',
    tasks: [
      { id: '3-1', title: 'Study Archetype Emergence', description: 'Memorize: Midrange 21%, Aggro 16%, Reanimator 13%, Storm 13%, Tempo 10.6% (ceiling)', duration: '10 min', type: 'learn', completed: false },
      { id: '3-2', title: 'Force Reanimator Draft', description: 'Intentionally draft Reanimator. Note how supported it feels.', duration: '15 min', type: 'practice', completed: false },
      { id: '3-3', title: 'Force Tempo Draft', description: 'Intentionally draft Tempo. Feel the ceiling - limited card pool.', duration: '15 min', type: 'practice', completed: false },
    ],
  },
  {
    date: 'May 17',
    dayOfWeek: 'Sat',
    dayNumber: 4,
    phase: 'Learn the Data',
    focus: 'Archetype Deep Dive',
    tasks: [
      { id: '4-1', title: 'Limited Archetypes Study', description: 'Oath (1.6%), Control (3.6%), Artifacts (3.7%) - know these are speculative', duration: '10 min', type: 'learn', completed: false },
      { id: '4-2', title: 'Force Storm Draft', description: 'Draft Storm. Look for Yawgmoth\'s Will, Breach, rituals, LED.', duration: '15 min', type: 'practice', completed: false },
      { id: '4-3', title: 'Force Ramp Draft', description: 'Draft Ramp. Prioritize Channel, Natural Order, mana dorks.', duration: '15 min', type: 'practice', completed: false },
    ],
  },
  {
    date: 'May 18',
    dayOfWeek: 'Sun',
    dayNumber: 5,
    phase: 'Deliberate Practice',
    focus: 'Commitment Window',
    tasks: [
      { id: '5-1', title: 'Picks 4-10 Focus', description: 'Run 2 drafts. Pay special attention to picks 4-10 - the commitment window.', duration: '25 min', type: 'practice', completed: false },
      { id: '5-2', title: 'Signal Reading', description: 'Note what wheels back to you in pack 1. What does it tell you?', duration: '10 min', type: 'review', completed: false },
      { id: '5-3', title: 'P1P1 Quiz', description: '10 quiz questions', duration: '8 min', type: 'drill', completed: false },
    ],
  },
  {
    date: 'May 19',
    dayOfWeek: 'Mon',
    dayNumber: 6,
    phase: 'Deliberate Practice',
    focus: 'Draft Reps',
    tasks: [
      { id: '6-1', title: 'Morning Draft', description: 'One full draft with coach mode', duration: '12 min', type: 'practice', completed: false },
      { id: '6-2', title: 'Review Decisions', description: 'Look at your deck. What archetype? What\'s missing? Was it intentional?', duration: '5 min', type: 'review', completed: false },
      { id: '6-3', title: 'Evening Draft', description: 'Second draft. Try a different strategy than morning.', duration: '12 min', type: 'practice', completed: false },
    ],
  },
  {
    date: 'May 20',
    dayOfWeek: 'Tue',
    dayNumber: 7,
    phase: 'Deliberate Practice',
    focus: 'Quiz Mode',
    tasks: [
      { id: '7-1', title: 'P1P1 Quiz Blitz', description: '15 quiz questions. Target 80%+ accuracy.', duration: '12 min', type: 'drill', completed: false },
      { id: '7-2', title: 'Quiz Draft Mode', description: 'Run a draft in quiz mode - see optimal pick after each selection', duration: '15 min', type: 'practice', completed: false },
      { id: '7-3', title: 'Weak Spot Review', description: 'What picks are you missing most? Study those cards.', duration: '8 min', type: 'review', completed: false },
    ],
  },
  {
    date: 'May 21',
    dayOfWeek: 'Wed',
    dayNumber: 8,
    phase: 'Deliberate Practice',
    focus: 'Color Balance',
    tasks: [
      { id: '8-1', title: 'Color Stats Review', description: 'Blue 60%, Green 55%, Black 53%. Expect 3-color decks (70%).', duration: '5 min', type: 'learn', completed: false },
      { id: '8-2', title: 'Draft with Color Focus', description: 'Draft paying attention to color signals. Don\'t force a 4th color.', duration: '15 min', type: 'practice', completed: false },
      { id: '8-3', title: 'Mana Base Study', description: 'Look at lands in your deck. Are you using fetches/duals optimally?', duration: '10 min', type: 'review', completed: false },
    ],
  },
  {
    date: 'May 22',
    dayOfWeek: 'Thu',
    dayNumber: 9,
    phase: 'Deliberate Practice',
    focus: 'Speed Reps',
    tasks: [
      { id: '9-1', title: 'Timed Draft #1', description: 'Draft with a timer. Target < 90 seconds per pick average.', duration: '12 min', type: 'practice', completed: false },
      { id: '9-2', title: 'Timed Draft #2', description: 'Second timed draft. Faster decisions, trust your instincts.', duration: '12 min', type: 'practice', completed: false },
      { id: '9-3', title: 'P1P1 Speed Quiz', description: '10 questions, < 5 seconds each', duration: '5 min', type: 'drill', completed: false },
    ],
  },
  {
    date: 'May 23',
    dayOfWeek: 'Fri',
    dayNumber: 10,
    phase: 'Full Runs',
    focus: 'No Coach Mode',
    tasks: [
      { id: '10-1', title: 'Draft WITHOUT Coach', description: 'Turn coach mode OFF. Draft like it\'s the real thing.', duration: '12 min', type: 'practice', completed: false },
      { id: '10-2', title: 'Self-Evaluation', description: 'Review your draft. Grade yourself. What would you change?', duration: '8 min', type: 'review', completed: false },
      { id: '10-3', title: 'Second Unassisted Draft', description: 'Another draft without coach. Building confidence.', duration: '12 min', type: 'practice', completed: false },
    ],
  },
  {
    date: 'May 24',
    dayOfWeek: 'Sat',
    dayNumber: 11,
    phase: 'Full Runs',
    focus: 'Simulation Day',
    tasks: [
      { id: '11-1', title: 'Full Draft #1', description: 'Complete draft, no coach, full focus', duration: '15 min', type: 'practice', completed: false },
      { id: '11-2', title: 'Full Draft #2', description: 'Different approach than #1', duration: '15 min', type: 'practice', completed: false },
      { id: '11-3', title: 'Full Draft #3', description: 'Go with the flow - read signals', duration: '15 min', type: 'practice', completed: false },
    ],
  },
  {
    date: 'May 25',
    dayOfWeek: 'Sun',
    dayNumber: 12,
    phase: 'Final Prep',
    focus: 'Light Review',
    tasks: [
      { id: '12-1', title: 'Cheat Sheet Review', description: 'Review P1P1 priorities, archetype ceilings, wheel rates', duration: '10 min', type: 'review', completed: false },
      { id: '12-2', title: 'One Relaxed Draft', description: 'Light draft for fun. Don\'t overthink.', duration: '12 min', type: 'practice', completed: false },
      { id: '12-3', title: 'Visualize Success', description: 'Imagine opening your first pack. What do you hope to see? What will you do?', duration: '5 min', type: 'review', completed: false },
    ],
  },
  {
    date: 'May 26',
    dayOfWeek: 'Mon',
    dayNumber: 13,
    phase: 'Draft Day',
    focus: 'Execute',
    tasks: [
      { id: '13-1', title: 'Quick Warmup', description: 'One P1P1 quiz (5 questions) to get in the zone', duration: '3 min', type: 'drill', completed: false },
      { id: '13-2', title: 'THE DRAFT', description: 'Trust your preparation. Read signals. Have fun!', duration: '???', type: 'practice', completed: false },
    ],
  },
];

const TASK_TYPE_COLORS = {
  learn: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  practice: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  drill: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  review: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

const TASK_TYPE_ICONS = {
  learn: BookOpen,
  practice: Gamepad2,
  drill: Brain,
  review: Target,
};

export function PrepCalendar() {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    () => {
      const saved = localStorage.getItem('prep-calendar-completed');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
  );
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
    localStorage.setItem('prep-calendar-completed', JSON.stringify([...newCompleted]));
  };

  const totalTasks = PREP_SCHEDULE.reduce((sum, day) => sum + day.tasks.length, 0);
  const completedCount = completedTasks.size;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  // Find today's schedule (for highlighting)
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Draft Prep Calendar</h1>
          <p className="text-white/50 mt-1">May 14 - May 26, 2026 • 13 days to draft day</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{progressPercent}%</div>
          <div className="text-sm text-white/40">{completedCount}/{totalTasks} tasks</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/5 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Phase Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-white/60">Learn (Days 1-4)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-sm text-white/60">Practice (Days 5-9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-white/60">Full Runs (Days 10-12)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-sm text-white/60">Draft Day!</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-3">
        {PREP_SCHEDULE.map((day) => {
          const isExpanded = expandedDay === day.dayNumber;
          const isToday = day.date === todayStr;
          const dayCompleted = day.tasks.every(t => completedTasks.has(t.id));
          const dayProgress = day.tasks.filter(t => completedTasks.has(t.id)).length;

          const phaseColor = day.dayNumber <= 4 ? 'blue' :
                            day.dayNumber <= 9 ? 'purple' :
                            day.dayNumber <= 12 ? 'emerald' : 'amber';

          return (
            <div
              key={day.dayNumber}
              className={`
                rounded-xl border transition-all duration-200
                ${isToday ? 'border-white/30 bg-white/[0.08]' : 'border-white/10 bg-white/[0.02]'}
                ${isExpanded ? 'ring-1 ring-white/20' : ''}
              `}
            >
              {/* Day Header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
              >
                {/* Day Number */}
                <div className={`
                  w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0
                  ${dayCompleted ? `bg-${phaseColor}-500/30` : `bg-${phaseColor}-500/10`}
                `}>
                  <span className="text-xs text-white/40">{day.dayOfWeek}</span>
                  <span className={`text-lg font-bold ${dayCompleted ? `text-${phaseColor}-400` : 'text-white'}`}>
                    {day.dayNumber}
                  </span>
                </div>

                {/* Day Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{day.date}</span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs text-white font-medium">
                        Today
                      </span>
                    )}
                    {dayCompleted && (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-sm text-white/50 mt-0.5">
                    <span className={`text-${phaseColor}-400`}>{day.phase}</span>
                    <span className="mx-2">•</span>
                    <span>{day.focus}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-white/60">{dayProgress}/{day.tasks.length}</div>
                    <div className="text-xs text-white/30">tasks</div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Tasks (Expanded) */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {day.tasks.map((task) => {
                    const isCompleted = completedTasks.has(task.id);
                    const colors = TASK_TYPE_COLORS[task.type];
                    const Icon = TASK_TYPE_ICONS[task.type];

                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`
                          p-4 rounded-lg border cursor-pointer transition-all
                          ${isCompleted
                            ? 'bg-white/[0.02] border-white/10 opacity-60'
                            : `${colors.bg} ${colors.border}`
                          }
                          hover:bg-white/[0.05]
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className={`w-5 h-5 ${colors.text}`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isCompleted ? 'text-white/50 line-through' : 'text-white'}`}>
                                {task.title}
                              </span>
                              <Icon className={`w-4 h-4 ${colors.text}`} />
                            </div>
                            <p className={`text-sm mt-1 ${isCompleted ? 'text-white/30' : 'text-white/50'}`}>
                              {task.description}
                            </p>
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-1 text-white/40 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs">{task.duration}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">
            {PREP_SCHEDULE.slice(0, 4).reduce((sum, d) => sum + d.tasks.filter(t => completedTasks.has(t.id)).length, 0)}
            <span className="text-lg text-white/30">/{PREP_SCHEDULE.slice(0, 4).reduce((sum, d) => sum + d.tasks.length, 0)}</span>
          </div>
          <div className="text-sm text-white/40 mt-1">Learn Phase</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-400">
            {PREP_SCHEDULE.slice(4, 9).reduce((sum, d) => sum + d.tasks.filter(t => completedTasks.has(t.id)).length, 0)}
            <span className="text-lg text-white/30">/{PREP_SCHEDULE.slice(4, 9).reduce((sum, d) => sum + d.tasks.length, 0)}</span>
          </div>
          <div className="text-sm text-white/40 mt-1">Practice Phase</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-400">
            {PREP_SCHEDULE.slice(9, 12).reduce((sum, d) => sum + d.tasks.filter(t => completedTasks.has(t.id)).length, 0)}
            <span className="text-lg text-white/30">/{PREP_SCHEDULE.slice(9, 12).reduce((sum, d) => sum + d.tasks.length, 0)}</span>
          </div>
          <div className="text-sm text-white/40 mt-1">Full Runs</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span className="text-xl font-bold text-amber-400">May 26</span>
          </div>
          <div className="text-sm text-white/40 mt-1">Draft Day!</div>
        </div>
      </div>

      {/* Cheat Sheet */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Reference Cheat Sheet</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-amber-400 mb-2">Always Take (P1P1)</h4>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Power 9 (Lotus, Moxen, Ancestral, Time Walk)</li>
              <li>• Mana Drain, Sol Ring, Mana Crypt</li>
              <li>• The One Ring, Oko, Hullbreacher</li>
              <li>• Orcish Bowmasters, Ragavan</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Safe to Pass (Wheels 80%+)</h4>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Damn, Vindicate (93%)</li>
              <li>• Golos (91%)</li>
              <li>• Most dual lands (85-90%)</li>
              <li>• Lingering Souls (85%)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-emerald-400 mb-2">Supported Archetypes</h4>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Midrange (21%) - always viable</li>
              <li>• Aggro (16%) - solid</li>
              <li>• Reanimator (13%) - well-supported</li>
              <li>• Storm (13%) - needs commitment</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-red-400 mb-2">Limited Support (Don't Force)</h4>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Tempo (10.6%) - natural ceiling</li>
              <li>• Control (3.6%) - few sweepers</li>
              <li>• Oath (1.6%) - speculative only</li>
              <li>• Artifacts (3.7%) - no infinite combo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
