// Sound Utility using Web Audio API
let audioCtx: AudioContext | null = null;

export const playSound = (type: 'click' | 'tick' | 'success') => {
  if (typeof window === 'undefined') return;
  
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const now = audioCtx.currentTime;

  if (type === 'click') {
    // Mechanical click
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'tick') {
    // Crisp Modern Tick
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } else if (type === 'success') {
    // Triumphant Fanfare
    const notes = [261.63, 392.00, 523.25, 659.25]; // C4, G4, C5, E5
    notes.forEach((freq, i) => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(freq, now + (i * 0.1));
      g.gain.setValueAtTime(0, now + (i * 0.1));
      g.gain.linearRampToValueAtTime(0.12, now + (i * 0.1) + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.6);
      o.connect(g);
      g.connect(audioCtx!.destination);
      o.start(now + (i * 0.1));
      o.stop(now + (i * 0.1) + 0.6);
    });
  }
};
