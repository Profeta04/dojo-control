import { Buffer } from "buffer";
(window as any).Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// === Global error shield ===
// Catch chunk/module errors that escape React ErrorBoundary
const RELOAD_KEY = "chunk-reload-ts";
const RELOAD_COOLDOWN = 10_000; // 10s cooldown to prevent infinite reload loops

function isChunkError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to fetch dynamically imported module") ||
    lower.includes("loading chunk") ||
    lower.includes("error loading dynamically imported module") ||
    lower.includes("loading css chunk") ||
    lower.includes("unable to preload css")
  );
}

function safeReload() {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
  const now = Date.now();
  if (now - lastReload > RELOAD_COOLDOWN) {
    sessionStorage.setItem(RELOAD_KEY, String(now));
    window.location.reload();
  } else {
    console.warn("Chunk error detected but reload suppressed (cooldown active)");
  }
}

window.addEventListener("error", (event) => {
  if (event.message && isChunkError(event.message)) {
    event.preventDefault();
    safeReload();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason || "");
  if (isChunkError(msg)) {
    event.preventDefault();
    safeReload();
  }
});

// === Render app ===
createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA + Share Target + Push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });

    // Listen for navigation messages from SW (iOS notification click fallback)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        window.location.href = event.data.url;
      }
    });
  });
}
