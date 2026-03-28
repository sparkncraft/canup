import type { CreditBalance } from './types.js';

let credits = new Map<string, CreditBalance>();
let listeners: (() => void)[] = [];

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export const creditStore = {
  subscribe(listener: () => void): () => void {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getSnapshot(): Map<string, CreditBalance> {
    return credits;
  },

  setCredits(action: string, data: CreditBalance): void {
    credits = new Map(credits);
    credits.set(action, data);
    emitChange();
  },
};
