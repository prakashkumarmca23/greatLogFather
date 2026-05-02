import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../utils/audio';

interface BrutalistClockPickerProps {
  time: string;
  onChange: (val: string) => void;
  format: '12h' | '24h';
  onClose: () => void;
  soundEnabled: boolean;
}

export function BrutalistClockPicker({ time, onChange, format, onClose, soundEnabled }: BrutalistClockPickerProps) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const clockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [h24, m] = time.split(':').map(Number);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let displayHour = h24 % 12;
  if (format === '12h') {
    if (displayHour === 0) displayHour = 12;
  }

  const toggleAmPm = (newAmPm: 'AM' | 'PM') => {
    if (ampm === newAmPm) return;
    let newH24 = h24;
    if (newAmPm === 'PM' && h24 < 12) newH24 += 12;
    if (newAmPm === 'AM' && h24 >= 12) newH24 -= 12;
    onChange(`${newH24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  const handlePointer = (e: React.MouseEvent | React.TouchEvent) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();

    let clientX = 0, clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left - (rect.width / 2);
    const y = clientY - rect.top - (rect.height / 2);

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hour') {
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;

      let newH24 = h;
      if (format === '12h') {
        newH24 = (h % 12) + (ampm === 'PM' ? 12 : 0);
      } else {
        const radius = Math.sqrt(x * x + y * y);
        if (radius < 43) {
          newH24 = h === 12 ? 0 : h + 12;
        } else {
          newH24 = h === 12 ? 0 : h;
        }
      }
      if (newH24 !== h24) {
        if (soundEnabled) playSound('tick');
        onChange(`${newH24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    } else {
      let newM = Math.round(angle / 6) % 60;
      if (newM !== m) {
        if (soundEnabled) playSound('tick');
        onChange(`${h24.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
      }
    }
  };

  const numbers = [];
  if (mode === 'hour') {
    if (format === '12h') {
      for (let i = 1; i <= 12; i++) numbers.push(i);
    } else {
      for (let i = 0; i < 24; i++) numbers.push(i);
    }
  } else {
    for (let i = 0; i < 60; i += 5) numbers.push(i);
  }

  let selectedRadius = 55;
  let selectedAngle = 0;

  if (mode === 'hour') {
    if (format === '24h' && (h24 >= 13 || h24 === 0)) selectedRadius = 32;
    selectedAngle = (h24 % 12) * 30;
  } else {
    selectedAngle = m * 6;
    selectedRadius = 55;
  }

  const selectedRad = (selectedAngle - 90) * (Math.PI / 180);

  const handleMouseUp = () => {
    setIsDragging(false);
    if (mode === 'hour') setMode('minute');
  };

  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  return (
    <div style={{ width: '180px', background: 'var(--color-white)', border: 'var(--border-thin)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--color-black)', color: 'var(--color-white)', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.2rem' }}>
        <input
          type="text"
          value={format === '12h' ? displayHour : h24.toString().padStart(2, '0')}
          onFocus={() => setMode('hour')}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(-2);
            if (val === '') return;
            let newH = parseInt(val);
            if (format === '12h') {
              if (newH > 12) newH = 12;
              if (newH === 0) newH = 12;
              const h24val = (newH % 12) + (ampm === 'PM' ? 12 : 0);
              onChange(`${h24val.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            } else {
              if (newH > 23) newH = 23;
              onChange(`${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontSize: '1.8rem',
            fontWeight: 700,
            width: '2.5rem',
            textAlign: 'center',
            padding: 0,
            cursor: 'text',
            opacity: mode === 'hour' ? 1 : 0.5,
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <span style={{ fontSize: '1.8rem', fontWeight: 700, opacity: 0.5 }}>:</span>
        <input
          type="text"
          value={m.toString().padStart(2, '0')}
          onFocus={() => setMode('minute')}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(-2);
            if (val === '') return;
            let newM = parseInt(val);
            if (newM > 59) newM = 59;
            onChange(`${h24.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontSize: '1.8rem',
            fontWeight: 700,
            width: '2.5rem',
            textAlign: 'center',
            padding: 0,
            cursor: 'text',
            opacity: mode === 'minute' ? 1 : 0.5,
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        {format === '12h' && (
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 700, gap: '2px' }}>
            <span onClick={() => toggleAmPm('AM')} style={{ cursor: 'pointer', opacity: ampm === 'AM' ? 1 : 0.3 }}>AM</span>
            <span onClick={() => toggleAmPm('PM')} style={{ cursor: 'pointer', opacity: ampm === 'PM' ? 1 : 0.3 }}>PM</span>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div
          ref={clockRef}
          onMouseDown={(e) => { setIsDragging(true); handlePointer(e); }}
          onMouseMove={(e) => { if (isDragging) handlePointer(e); }}
          onMouseUp={handleMouseUp}
          onTouchStart={(e) => { setIsDragging(true); handlePointer(e); }}
          onTouchMove={(e) => { if (isDragging) handlePointer(e); }}
          onTouchEnd={handleMouseUp}
          style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '50%', border: 'var(--border-thin)', background: 'var(--color-white)', cursor: 'pointer', touchAction: 'none' }}
        >
          {/* Clock Hand and Thumb */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}>
            <line
              x1="50%"
              y1="50%"
              x2={`calc(50% + ${selectedRadius * Math.cos(selectedRad)}px)`}
              y2={`calc(50% + ${selectedRadius * Math.sin(selectedRad)}px)`}
              stroke="var(--color-black)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx={`calc(50% + ${selectedRadius * Math.cos(selectedRad)}px)`}
              cy={`calc(50% + ${selectedRadius * Math.sin(selectedRad)}px)`}
              r="14"
              fill="var(--color-black)"
            />
          </svg>

          {/* Center dot */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '8px', height: '8px', background: 'var(--color-black)', transform: 'translate(-50%, -50%)', borderRadius: '50%', zIndex: 2 }} />

          {/* Numbers */}
          {numbers.map(num => {
            let angle = 0;
            let radius = 55;
            let isInner = false;

            if (mode === 'hour' && format === '24h') {
              if (num >= 13 || num === 0) { isInner = true; radius = 32; }
              angle = (num % 12) * 30;
            } else if (mode === 'hour') {
              angle = num * 30;
            } else {
              angle = (num / 5) * 30;
            }

            const rad = (angle - 90) * (Math.PI / 180);

            let isSelected = false;
            if (mode === 'hour') {
              isSelected = (format === '12h' && num === displayHour) || (format === '24h' && num === h24);
            } else {
              isSelected = num === m;
            }

            return (
              <div
                key={num}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${radius * Math.cos(rad)}px)`,
                  top: `calc(50% + ${radius * Math.sin(rad)}px)`,
                  transform: 'translate(-50%, -50%)',
                  width: isInner ? '20px' : '24px',
                  height: isInner ? '20px' : '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: isInner ? '0.75rem' : '0.9rem',
                  color: isSelected ? 'var(--color-white)' : 'var(--color-black)',
                  pointerEvents: 'none',
                  zIndex: 3
                }}
              >
                {mode === 'minute' ? num.toString().padStart(2, '0') : num}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => { if (soundEnabled) playSound('click'); onClose(); }} style={{ width: '100%', borderRadius: 0, border: 'none', background: 'var(--color-black)', color: 'var(--color-white)', padding: '0.75rem', fontWeight: 700, boxShadow: 'none', margin: 0 }}>
        DONE
      </button>
    </div>
  );
}
