import confetti from "canvas-confetti";

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#eab308", "#3b82f6", "#f97316"],
  });
}
