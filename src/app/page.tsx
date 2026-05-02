"use client";

import React, { useState, useEffect, useRef } from 'react';
import { timeToMinutes, formatMinutes } from '../utils/time';
import { playSound } from '../utils/audio';
import { TimeBlock } from '../types';
import { TimeClockInput } from '../components/TimeClockInput';

const dankMessages = [
  "Logging hours? The Don appreciates your precision.",
  "Every minute is a bullet. Don't waste them.",
  "Working hard, or hardly working? The Father is watching.",
  "You're doing great. Keep up the hustle.",
  "Time is money, but loyalty is everything.",
  "A man who doesn't track his time isn't a real man.",
  "Target reached! Go home to your family.",
  "The ledger must always balance. No deficits allowed.",
  "You're moving fast today. Like a getaway driver.",
  "Keep tracking. The families are counting on you.",
  "Is that a coffee break or a secret meeting?",
  "You're at 50%. Halfway to freedom.",
  "90% done. Almost time to call it a day.",
  "Success is a dish best served on time.",
  "Don't let the clock snitch on your laziness.",
  "You're logging more hours than a long-haul trucker.",
  "Good progress. The Underboss is impressed.",
  "Your dedication is... noted. Respect.",
  "The Great Log Father never forgets a missed minute.",
  "Are you tracking or are you testifying?",
  "Stay focused. Distractions are for associates.",
  "The clock is ticking, but you're keeping pace.",
  "Efficiency is the silent partner of success.",
  "You've logged enough hours to buy a small island.",
  "Almost there. One more row and you're golden.",
  "The ledger is looking clean. No red ink today.",
  "A master of the minutes. A boss of the hours.",
  "Work like the Don, rest like the King.",
  "Your time management is an offer no one can refuse.",
  "The Great Log Father is pleased with this progress."
];

export default function TrackerPage() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [targetHours, setTargetHours] = useState<number>(9);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [isMounted, setIsMounted] = useState(false);
  const [overlapIds, setOverlapIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Stats state
  const [workMinutes, setWorkMinutes] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [overallMinutes, setOverallMinutes] = useState(0);
  const successPlayed = useRef(false);

  // Initial Load
  useEffect(() => {
    const savedBlocks = localStorage.getItem('logfather_blocks');
    const savedTarget = localStorage.getItem('logfather_target');
    const savedFormat = localStorage.getItem('logfather_format');
    const savedSound = localStorage.getItem('logfather_sound');

    if (savedBlocks) setBlocks(JSON.parse(savedBlocks));
    else setBlocks([
      { id: '1', inTime: '', outTime: '' },
      { id: '2', inTime: '', outTime: '' }
    ]);

    if (savedTarget) setTargetHours(Number(savedTarget));
    if (savedFormat) setTimeFormat(savedFormat as '12h' | '24h');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    else setSoundEnabled(false);

    setIsMounted(true);
  }, []);

  // Save on Change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('logfather_blocks', JSON.stringify(blocks));
      localStorage.setItem('logfather_target', targetHours.toString());
      localStorage.setItem('logfather_format', timeFormat);
      localStorage.setItem('logfather_sound', soundEnabled.toString());
    }
  }, [blocks, targetHours, timeFormat, soundEnabled, isMounted]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addBlock();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMounted]);

  useEffect(() => {
    let totalWork = 0;
    let firstIn = Infinity;
    let lastOut = 0;
    const newOverlapIds: string[] = [];

    // Check for overlaps and calculate stats
    const minutesRanges = blocks.map(b => ({
      id: b.id,
      start: timeToMinutes(b.inTime),
      end: timeToMinutes(b.outTime)
    })).filter(r => r.start > 0 && r.end > 0 && r.end > r.start);

    // Get ALL entered minutes to find overall span even for incomplete blocks
    const allEnteredMinutes: number[] = [];
    blocks.forEach(b => {
      const start = timeToMinutes(b.inTime);
      const end = timeToMinutes(b.outTime);
      if (start > 0) allEnteredMinutes.push(start);
      if (end > 0) allEnteredMinutes.push(end);
    });

    minutesRanges.forEach((range, i) => {
      // Overlap detection
      for (let j = i + 1; j < minutesRanges.length; j++) {
        const other = minutesRanges[j];
        if (range.start < other.end && range.end > other.start) {
          if (!newOverlapIds.includes(range.id)) newOverlapIds.push(range.id);
          if (!newOverlapIds.includes(other.id)) newOverlapIds.push(other.id);
        }
      }
      totalWork += (range.end - range.start);
    });

    const absFirstIn = allEnteredMinutes.length > 0 ? Math.min(...allEnteredMinutes) : Infinity;
    const absLastOut = allEnteredMinutes.length > 0 ? Math.max(...allEnteredMinutes) : 0;

    setOverlapIds(newOverlapIds);
    setWorkMinutes(totalWork);

    if (absFirstIn !== Infinity && absLastOut > 0 && absLastOut >= absFirstIn) {
      const overall = absLastOut - absFirstIn;
      setOverallMinutes(overall);
      setBreakMinutes(Math.max(0, overall - totalWork));
    } else {
      setOverallMinutes(0);
      setBreakMinutes(0);
    }

    // Success sound on hitting 100%
    const targetMin = targetHours * 60;
    if (totalWork >= targetMin && totalWork > 0 && soundEnabled && !successPlayed.current) {
      playSound('success');
      successPlayed.current = true;
    } else if (totalWork < targetMin) {
      successPlayed.current = false;
    }
  }, [blocks, targetHours, soundEnabled]);

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const currentTimeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleBlockChange = (id: string, field: keyof TimeBlock, value: string) => {
    setBlocks(prev => prev.map(block =>
      block.id === id ? { ...block, [field]: value } : block
    ));
  };

  const addBlock = () => {
    setBlocks(prev => [
      ...prev,
      { id: Date.now().toString(), inTime: '', outTime: '' }
    ]);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const resetAll = () => {
    setBlocks([
      { id: Date.now().toString() + '1', inTime: '', outTime: '' },
      { id: Date.now().toString() + '2', inTime: '', outTime: '' }
    ]);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData('Text');
    if (!pastedData) return;

    // Split by newlines and filter out empty lines
    const lines = pastedData.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');

    // Only intercept if we pasted multiple lines
    if (lines.length > 1) {
      e.preventDefault(); // Prevent default native paste

      const parsedTimes: string[] = [];
      lines.forEach(line => {
        // Extract time ignoring seconds: e.g. "9:18:02 AM" -> 09:18
        const match = line.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM|am|pm)?/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const ampm = match[3] ? match[3].toUpperCase() : null;

          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;

          parsedTimes.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      });

      if (parsedTimes.length > 0) {
        const newBlocks: TimeBlock[] = [];
        for (let i = 0; i < parsedTimes.length; i += 2) {
          newBlocks.push({
            id: Date.now().toString() + i,
            inTime: parsedTimes[i] || '',
            outTime: parsedTimes[i + 1] || ''
          });
        }

        // Ensure at least 2 rows for layout
        while (newBlocks.length < 2) {
          newBlocks.push({ id: Date.now().toString() + newBlocks.length + 'pad', inTime: '', outTime: '' });
        }

        setBlocks(newBlocks);
      }
    }
  };

  const targetMinutes = targetHours * 60;
  const deficitMinutes = workMinutes - targetMinutes;

  const progressPercent = targetMinutes > 0 ? Math.min(100, Math.max(0, (workMinutes / targetMinutes) * 100)) : 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });



  // Dynamic dank greeting based on progress
  const dankMessages = [
    // 0-10%
    "Welcome to the abyss. You're early.",
    "0%? Your potential is currently a myth.",
    "The only thing you've finished is your coffee and your will to live.",
    "Loading... Error 404: Career found in trash.",
    "Your contribution today is as useful as a screen door on a submarine.",
    "Still at 0? Just like your bank account balance.",
    "I'd tell you to get a life, but you're already here.",
    "Procrastination isn't a hobby, it's a personality disorder at this point.",
    // 10-30%
    "Oh look, a pulse. Barely.",
    "15%? You're like a slow-loading YouTube ad nobody asked for.",
    "One small step for man, one giant waste of electricity.",
    "Your therapist is going to love hearing about this 'breakthrough'.",
    "If 'Meh' was a person, it would be you right now.",
    "Warming up the seat for the next person who actually cares.",
    "Is this work or a cry for help?",
    "You're doing the bare minimum. Your parents must be so proud.",
    // 30-50%
    "33%... The exact amount of hope left in this room.",
    "Halfway to a quarter of a decent day's work.",
    "Your soul is slowly leaving through the USB port.",
    "Brain cells are dying. Please press F to pay respects.",
    "Only 60% more until you can go back to being useless at home.",
    "The 'Reply All' urge is the only power you have left in this world.",
    "Keep going. The void is waiting for your report.",
    "You're the reason they put instructions on shampoo bottles.",
    "45%? You're almost at 'slightly below average'.",
    // 50-70%
    "51%... You've officially wasted more than half your life today.",
    "The light at the end of the tunnel is actually just an oncoming train.",
    "60%? That's a 'C' in school, but a 'Why bother' in real life.",
    "I can smell the burnout. It smells like cheap office carpet.",
    "You're in the 'zone'. The 'existential dread' zone.",
    "Almost at the 'updating my LinkedIn while crying' stage.",
    "Your keyboard is filing for divorce.",
    "Leveling up: 'Corporate Zombie'.",
    // 70-90%
    "75%? You're like a phone at 1%—screaming for an outlet.",
    "You're 80% legend, 20% regret.",
    "Calculating how many days until retirement... it's too many.",
    "Almost time to pack your things and your dignity.",
    "You've earned a break. Forever.",
    "The finish line is as fake as your corporate smile.",
    "85%? You're basically a professional at faking it now.",
    "One more deep sigh and your lungs might actually collapse.",
    // 90-99%
    "95%? I can feel the 'Shutdown' button mocking you.",
    "Almost there. Just like your mid-life crisis.",
    "Just one more tiny, meaningless task for the machine.",
    "You're the MVP of today. Most Visible Person.",
    "If you were a runner, you'd be a cautionary tale.",
    "99%... The final boss is your own boredom.",
    "Ready to 'Alt+F4' into the dark void of the internet?"
  ];

  const [surplusRoast, setSurplusRoast] = useState<string>("");

  useEffect(() => {
    if (progressPercent >= 100) {
      if (!surplusRoast) {
        const surplusRoasts = [
          "100%? The Father said work, not 'move in'. Go home.",
          "You've reached the target. Every minute more is just free labor for the machine.",
          "Congratulations, you've earned a 'Gold Star' that's worth exactly $0.00.",
          "Overtime? Your CEO just bought a second pool. Thanks for the donation.",
          "Is your house on fire? Or do you just hate your family that much?",
          "110%? Stop trying to be the hero. The hero usually dies in the first act.",
          "Working extra for no extra pay? That's not a 'hustle', that's a hostage situation.",
          "Your chair is filing a restraining order against you.",
          "120%? You're officially the 'Office Pet'. Go bark at someone else.",
          "The janitor is literally waiting for you to leave so he can clean your shame.",
          "Even the mob takes Sundays off. You're making us look bad.",
          "You've logged enough hours to buy a small island. Too bad you'll never have time to visit it.",
          "Are you trying to win an award? Because the award is 'Most Likely to Burn Out by 30'.",
          "150%? At this point, just sleep under your desk. It's more honest.",
          "You're working like the feds are closing in. Calm down, associate."
        ];
        setSurplusRoast(surplusRoasts[Math.floor(Math.random() * surplusRoasts.length)]);
      }
    } else {
      setSurplusRoast("");
    }
  }, [progressPercent, surplusRoast]);

  let greeting = "";
  if (progressPercent >= 100) {
    greeting = surplusRoast || "Target reached! Now get out of here.";
  } else {
    let idx = 0;
    if (progressPercent >= 90) idx = 41 + Math.floor((progressPercent - 90) / 1.5);
    else if (progressPercent >= 70) idx = 33 + Math.floor((progressPercent - 70) / 2.5);
    else if (progressPercent >= 50) idx = 25 + Math.floor((progressPercent - 50) / 2.5);
    else if (progressPercent >= 30) idx = 16 + Math.floor((progressPercent - 30) / 2.5);
    else if (progressPercent >= 10) idx = 8 + Math.floor((progressPercent - 10) / 2.5);
    else idx = Math.floor(progressPercent / 1.5);

    greeting = dankMessages[Math.min(idx, dankMessages.length - 1)];
  }

  if (!isMounted) return null;

  return (
    <div>
      {/* Top Header matching reference */}
      <header className="mobile-aware-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button style={{ background: 'transparent', border: 'var(--border-thin)', boxShadow: 'none', padding: '0.4rem 0.6rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ border: 'var(--border-thin)', padding: '0.4rem 1rem', background: 'transparent', fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-black)' }}>
            {currentTimeString}
          </div>

          <button style={{ background: 'transparent', border: 'var(--border-thin)', boxShadow: 'none', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>

          <div style={{ width: '38px', height: '38px', border: 'var(--border-thin)', background: 'transparent', overflow: 'hidden' }}>
            <img src="/HD-wallpaper-godfather-don-vito-movie-mafia-thumbnail.jpg" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </header>

      <h1 className="page-title" style={{ fontSize: '2.2rem' }}>Work Time Tracker</h1>


      <div className="tracker-layout">

        {/* Left Column: Yellow Card */}
        <div className="card yellow" style={{ position: 'relative' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{today}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {blocks.map((block, index) => {
              const isOverlapping = overlapIds.includes(block.id);
              return (
                <div key={block.id} className="time-block-row" style={{
                  alignItems: 'end',
                  position: 'relative'
                }}>
                  <div className="input-group">
                    <label>IN Time</label>
                    <TimeClockInput
                      value={block.inTime}
                      onChange={(val) => handleBlockChange(block.id, 'inTime', val)}
                      format={timeFormat}
                      defaultTime={index === 0 ? '09:00' : index === 1 ? '14:00' : '09:00'}
                      onPaste={handlePaste}
                      soundEnabled={soundEnabled}
                      preferPM={index > 0}
                    />
                  </div>
                  <div className="input-group">
                    <label>OUT Time</label>
                    <TimeClockInput
                      value={block.outTime}
                      onChange={(val) => handleBlockChange(block.id, 'outTime', val)}
                      format={timeFormat}
                      defaultTime={index === 0 ? '13:00' : index === 1 ? '19:00' : '17:00'}
                      onPaste={handlePaste}
                      soundEnabled={soundEnabled}
                      preferPM={true}
                    />
                  </div>
                  {index >= 2 && (
                    <button
                      onClick={() => { if (soundEnabled) playSound('click'); removeBlock(block.id); }}
                      style={{
                        background: 'var(--color-red)',
                        border: 'var(--border-thin)',
                        boxShadow: 'var(--shadow-hard-sm)',
                        padding: '0',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove row"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                  {index < 2 && (
                    <div style={{ width: '32px' }}></div> /* Spacer to keep grid aligned */
                  )}
                </div>
              );
            })}
          </div>

          <div className="card-actions">
            <button onClick={() => { if (soundEnabled) playSound('click'); addBlock(); }}>+ Add Row</button>
            <button onClick={() => { if (soundEnabled) playSound('click'); resetAll(); }}>Reset All</button>
          </div>
        </div>

        {/* Right Column: Settings / Target Panel */}
        <div className="card target-panel" style={{ alignItems: 'stretch', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'flex-start' }}>

          {/* Greeting Box */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-main)',
            border: 'var(--border-thin)',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100px',
            flexShrink: 0,
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, lineHeight: 1.3 }}>{greeting}</h3>
          </div>

          {/* Time Format Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Time Format</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setTimeFormat('12h')}
                style={{ flex: 1, height: '42px', background: timeFormat === '12h' ? 'var(--color-black)' : 'var(--color-white)', color: timeFormat === '12h' ? 'var(--color-white)' : 'var(--color-black)' }}
              >
                12-Hour
              </button>
              <button
                onClick={() => setTimeFormat('24h')}
                style={{ flex: 1, height: '42px', background: timeFormat === '24h' ? 'var(--color-black)' : 'var(--color-white)', color: timeFormat === '24h' ? 'var(--color-white)' : 'var(--color-black)' }}
              >
                24-Hour
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            {/* Sound Toggle */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sound</label>
              <button
                onClick={() => {
                  const newVal = !soundEnabled;
                  setSoundEnabled(newVal);
                  if (newVal) playSound('click');
                }}
                style={{ width: '100%', height: '42px', background: soundEnabled ? 'var(--color-black)' : 'var(--color-white)', color: soundEnabled ? 'var(--color-white)' : 'var(--color-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {soundEnabled ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </>
                  )}
                </svg>
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Target Hours */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Target</label>
              <select
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                style={{ width: '100%', textAlign: 'center', fontSize: '1rem', height: '42px', fontWeight: 700 }}
              >
                {[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(h => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Progress Section */}
      <div className="progress-section">
        <div className="progress-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2 className="progress-title">Progress</h2>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-black)', fontStyle: 'italic' }}>
              {workMinutes < targetMinutes
                ? `Freedom in: ${Math.floor((targetMinutes - workMinutes) / 60)}h ${(targetMinutes - workMinutes) % 60}m`
                : "Freedom Achieved!"}
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Math.round(progressPercent)}%</div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{
            width: `${progressPercent}%`,
            borderRight: progressPercent > 0 ? 'var(--border-thick)' : 'none',
            background: progressPercent === 0
              ? 'transparent'
              : progressPercent < 50
                ? 'var(--color-red)'
                : progressPercent < 100
                  ? 'var(--yellow-card)'
                  : 'var(--color-green)'
          }}></div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="stats-grid">
        <div className="card stat-card pink">
          <div className="stat-card-title">Work Hours</div>
          <div className="stat-card-value">{formatMinutes(workMinutes)}</div>
          <div className="stat-card-subtitle">Total time worked</div>
        </div>

        <div className="card stat-card blue">
          <div className="stat-card-title">Break Hours</div>
          <div className="stat-card-value">{formatMinutes(breakMinutes)}</div>
          <div className="stat-card-subtitle">Total resting time</div>
        </div>

        <div className="card stat-card green">
          <div className="stat-card-title">Overall Hours</div>
          <div className="stat-card-value">{formatMinutes(overallMinutes)}</div>
          <div className="stat-card-subtitle">First IN to last OUT</div>
        </div>

        <div className="card stat-card red">
          <div className="stat-card-title">{deficitMinutes >= 0 ? 'Surplus' : 'Deficit'}</div>
          <div className="stat-card-value">{formatMinutes(Math.abs(deficitMinutes))}</div>
          <div className="stat-card-subtitle">Relative to target</div>
        </div>
      </div>

    </div>
  );
}
