import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/audio';
import { BrutalistClockPicker } from './BrutalistClockPicker';

interface TimeClockInputProps {
  value: string;
  onChange: (val: string) => void;
  format: '12h' | '24h';
  defaultTime?: string;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  soundEnabled: boolean;
  preferPM?: boolean;
}

export function TimeClockInput({ value, onChange, format, defaultTime = '12:00', onPaste, soundEnabled, preferPM = false }: TimeClockInputProps) {
  const [localValue, setLocalValue] = useState('');
  const [showClock, setShowClock] = useState(false);
  const [clockTime, setClockTime] = useState(value || defaultTime);

  useEffect(() => {
    if (!value) {
      setLocalValue('');
      return;
    }
    if (format === '24h') {
      setLocalValue(value);
    } else {
      let [h, m] = value.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      setLocalValue(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`);
    }
  }, [value, format]);

  useEffect(() => {
    if (showClock) {
      setClockTime(value || defaultTime);
    }
  }, [showClock, value, defaultTime]);

  const handleBlur = () => {
    let val = localValue.trim().toUpperCase();
    if (!val) {
      onChange('');
      return;
    }

    let h = 0, m = 0, ampm: 'AM' | 'PM' | null = null;
    
    // Check for AM/PM in text
    if (val.includes('AM')) { ampm = 'AM'; val = val.replace('AM', '').trim(); }
    else if (val.includes('PM')) { ampm = 'PM'; val = val.replace('PM', '').trim(); }

    // Strip everything except digits and colon
    val = val.replace(/[^0-9:]/g, '');

    if (val.includes(':')) {
      const parts = val.split(':');
      h = parseInt(parts[0] || '0');
      m = parseInt(parts[1] || '0');
    } else if (val.length >= 3) {
      // HHMM or HMM -> split last two as minutes
      h = parseInt(val.slice(0, val.length - 2));
      m = parseInt(val.slice(val.length - 2));
    } else {
      // Just hours (1 or 2 digits)
      h = parseInt(val || '0');
      m = 0;
    }

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    // Smart default: If no AM/PM specified, and it's a 1-11h value, check preferPM
    if (ampm === null && preferPM && h > 0 && h < 12) {
      h += 12;
    }

    if (h > 23) h = 23;
    if (m > 59) m = 59;

    const new24hValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    if (new24hValue !== value) {
      onChange(new24hValue);
      if (soundEnabled) playSound('click');
    } else {
      if (format === '24h') {
        setLocalValue(new24hValue);
      } else {
        let [hh, mm] = new24hValue.split(':').map(Number);
        const a = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12;
        if (hh === 0) hh = 12;
        setLocalValue(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')} ${a}`);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <input
          type="text"
          value={localValue}
          onPaste={onPaste}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { 
            if (e.key === 'Enter') {
              handleBlur();
              if (soundEnabled) playSound('click');
              setShowClock(false);
            }
            if (e.key === 'Escape') setShowClock(false);
          }}
          placeholder="--:--"
          style={{ width: '100%', borderRight: 'none', border: 'var(--border-thin)', borderRadius: 0, padding: '0.4rem', outline: 'none', margin: 0, boxSizing: 'border-box', fontFamily: 'inherit', fontWeight: 600 }}
        />
        <button
          type="button"
          onClick={() => { if (soundEnabled) playSound('click'); setShowClock(!showClock); }}
          style={{ background: 'var(--color-black)', color: 'var(--color-white)', border: 'var(--border-thin)', borderRadius: 0, padding: '0 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, boxSizing: 'border-box', boxShadow: 'none' }}
          title="Open Clock Picker"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      </div>

      {showClock && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
            onClick={() => setShowClock(false)}
          />
          <div style={{ position: 'absolute', zIndex: 100, top: '100%', right: 0, marginTop: '4px' }}>
            <BrutalistClockPicker
              time={clockTime}
              format={format}
              soundEnabled={soundEnabled}
              onChange={(newTime) => {
                setClockTime(newTime);
                onChange(newTime);
              }}
              onClose={() => setShowClock(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
