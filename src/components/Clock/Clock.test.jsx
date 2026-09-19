import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Clock from './Clock';
import { COLORS } from '../../redux/game/gameConstants';

describe('Clock — формат', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('неактивний годинник показує сире storedMs, як є', () => {
    render(
      <Clock storedMs={125000} turnStartedAt={null} color={COLORS.WHITE} isActive={false} isGameOver={false} />
    );
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('активний годинник одразу показує коректний залишок (turnStartedAt щойно виставлений — elapsed=0)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    render(
      <Clock storedMs={125000} turnStartedAt={1_000_000} color={COLORS.WHITE} isActive isGameOver={false} />
    );
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('нижче порогу перемикається на десяті секунди', () => {
    render(
      <Clock storedMs={9999} turnStartedAt={null} color={COLORS.WHITE} isActive={false} isGameOver={false} />
    );
    expect(screen.getByText('9.9')).toBeInTheDocument();
  });

  it('захищається від від\'ємного значення — показує "0.0", не мінус', () => {
    render(
      <Clock storedMs={-500} turnStartedAt={null} color={COLORS.WHITE} isActive={false} isGameOver={false} />
    );
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });
});

describe('Clock — тік і виявлення таймауту (ізольовано в компоненті)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('тікає й оновлює власне відображення самостійно, поки активний', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    render(<Clock storedMs={5000} turnStartedAt={1_000_000} color={COLORS.WHITE} isActive isGameOver={false} />);
    expect(screen.getByText('5.0')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('3.0')).toBeInTheDocument();
  });

  it('викликає onTimeUp РІВНО один раз, коли залишок доходить до нуля', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const onTimeUp = vi.fn();
    render(
      <Clock
        storedMs={300}
        turnStartedAt={1_000_000}
        color={COLORS.BLACK}
        isActive
        isGameOver={false}
        onTimeUp={onTimeUp}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1000); // набагато більше за залишок
    });

    expect(onTimeUp).toHaveBeenCalledTimes(1);
    expect(onTimeUp).toHaveBeenCalledWith(COLORS.BLACK);

    act(() => {
      vi.advanceTimersByTime(2000); // час іде далі — вдруге кликати не повинен
    });
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('не тікає й не кличе onTimeUp, якщо isActive=false', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const onTimeUp = vi.fn();
    render(
      <Clock
        storedMs={100}
        turnStartedAt={1_000_000}
        color={COLORS.WHITE}
        isActive={false}
        isGameOver={false}
        onTimeUp={onTimeUp}
      />
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onTimeUp).not.toHaveBeenCalled();
    expect(screen.getByText('0.1')).toBeInTheDocument(); // storedMs без змін — годинник не йде
  });

  it('прибирає таймер при розмонтуванні — не кличе onTimeUp після цього', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const onTimeUp = vi.fn();
    const { unmount } = render(
      <Clock
        storedMs={300}
        turnStartedAt={1_000_000}
        color={COLORS.WHITE}
        isActive
        isGameOver={false}
        onTimeUp={onTimeUp}
      />
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it('visibilitychange форсує негайний перерахунок, не чекаючи запланованого тіку (фонова вкладка)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    render(
      <Clock storedMs={180000} turnStartedAt={1_000_000} color={COLORS.WHITE} isActive isGameOver={false} />
    );
    expect(screen.getByText('03:00')).toBeInTheDocument();

    // "вкладка у фоні" — реальний час минув, жоден setTimeout ще не спрацював
    vi.setSystemTime(1_020_000);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByText('02:40')).toBeInTheDocument();
  });
});
