/** Tiny Web Audio helper for the buzzer. Safe to call from UI effects. */

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function setBuzzer(on: boolean, frequency = 880): void {
  const ac = getCtx();
  if (!ac) return;
  void ac.resume();
  if (on) {
    if (!osc) {
      osc = ac.createOscillator();
      gain = ac.createGain();
      gain.gain.value = 0.04;
      osc.type = 'square';
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
    }
    osc.frequency.setTargetAtTime(frequency, ac.currentTime, 0.01);
  } else if (osc) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
    osc.disconnect();
    gain?.disconnect();
    osc = null;
    gain = null;
  }
}
