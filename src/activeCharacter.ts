// The character last opened on this device: the library's "what can I cast" filter
// and new spell ideas use it. A per-device convenience, so localStorage is fine.
const KEY = 'agathon:active-character';

export function getActiveCharacter(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveCharacter(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage blocked (private mode): the app just won't remember the choice
  }
}
