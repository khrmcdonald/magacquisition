// One-time data reset for the live demo.
//
// All app state (vehicles, bids, transport, auction history, badges, store
// photos) and the active login are persisted in the browser's localStorage.
// Bumping DATA_VERSION clears that persisted state exactly once per browser on
// the next load, guaranteeing a blank slate before any provider reads storage.
const VERSION_KEY = 'mag_data_version';
const DATA_VERSION = '2026-06-18-demo-reset';

export function ensureFreshDataVersion() {
  try {
    if (localStorage.getItem(VERSION_KEY) === DATA_VERSION) return;
    localStorage.removeItem('mag_data');
    localStorage.removeItem('mag_user');
    localStorage.setItem(VERSION_KEY, DATA_VERSION);
  } catch {}
}
