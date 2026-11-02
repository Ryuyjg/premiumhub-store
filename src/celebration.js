import confetti from "canvas-confetti";

export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    const playBell = (freq, start, duration, gainVal = 0.25) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainVal, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Upbeat chime sequence (C5 -> E5 -> G5 -> C6)
    playBell(523.25, now, 0.45, 0.2);
    playBell(659.25, now + 0.08, 0.5, 0.25);
    playBell(783.99, now + 0.16, 0.6, 0.3);
    playBell(1046.5, now + 0.24, 0.85, 0.35);
  } catch (err) {
    console.warn("Chime audio unavailable:", err);
  }
}

export function triggerPaymentConfetti() {
  try {
    // 1. Center burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#6366f1", "#f59e0b", "#ec4899", "#3b82f6"],
    });

    // 2. Left and right cannons
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#6366f1", "#ec4899", "#10b981"],
      });
    }, 250);
  } catch (err) {
    console.warn("Confetti animation unavailable:", err);
  }
}
