// Plays a short two-note "delivery" chime via the Web Audio API so we don't
// have to ship an audio asset. No-op outside the browser.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = (window.AudioContext ?? (window as any).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function playDeliveryChime() {
  const c = getContext();
  if (!c) return;
  // Resume if suspended (browsers gate audio behind a user gesture; the chime
  // fires after a click in the chat composer, so this should already be live).
  if (c.state === "suspended") void c.resume();

  const now = c.currentTime;
  const notes: { freq: number; start: number; dur: number }[] = [
    { freq: 880, start: 0, dur: 0.16 },     // A5
    { freq: 1318.5, start: 0.13, dur: 0.22 }, // E6
  ];

  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;
    gain.gain.setValueAtTime(0, now + n.start);
    gain.gain.linearRampToValueAtTime(0.18, now + n.start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.05);
  }
}
