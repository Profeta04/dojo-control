import confetti from "canvas-confetti";

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#eab308", "#3b82f6", "#f97316"],
  });
}

export function fireLegendaryConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#a855f7", "#eab308", "#f97316"],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#a855f7", "#eab308", "#f97316"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
