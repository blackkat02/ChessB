import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEY, SCHEMA_VERSION, savePersistedGame, loadPersistedGame } from './persistGame';

describe('persistGame', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trip: те, що зберегли, повертається читанням без втрат', () => {
    const gameState = { whiteTime: 123456, blackTime: 90000, history: [{ san: 'e4' }], plyCount: 1 };

    savePersistedGame(gameState);

    expect(loadPersistedGame()).toEqual(gameState);
  });

  it('повертає undefined, якщо в localStorage ще нічого не збережено', () => {
    expect(loadPersistedGame()).toBeUndefined();
  });

  it('неправильна версія схеми -> undefined, старий несумісний запис ігнорується, не підставляється', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION - 1, state: { whiteTime: 1 } })
    );

    expect(loadPersistedGame()).toBeUndefined();
  });

  it('пошкоджений JSON -> undefined, не кидає виняток назовні', () => {
    localStorage.setItem(STORAGE_KEY, '{ це не валідний json');

    expect(() => loadPersistedGame()).not.toThrow();
    expect(loadPersistedGame()).toBeUndefined();
  });

  it('localStorage.setItem кидає виняток (квота/приватний режим) -> savePersistedGame не кидає назовні', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => savePersistedGame({ whiteTime: 1 })).not.toThrow();
  });
});
