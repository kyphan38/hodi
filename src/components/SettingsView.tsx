'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

import TopBar from '@/components/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { applyDisplayPrefs, questionsStore, sizeStore, themeStore, type TextSize, type Theme } from '@/lib/prefs';
import type { Store } from '@/lib/store';

function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

/** Một dòng lựa chọn: lựa chọn hiện tại là chữ đậm, còn lại là chữ mờ bấm được. */
function Choice<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <Row label={label}>
      <div className="flex gap-4" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onPick(o.value)}
            className={o.value === value ? 'text-ink' : 'text-faint hover:text-muted'}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Row>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsView() {
  const { user, signOut } = useAuth();
  const theme = useStore(themeStore);
  const size = useStore(sizeStore);
  const questions = useStore(questionsStore);

  const pickTheme = (t: Theme) => {
    themeStore.set(t);
    applyDisplayPrefs(t, size);
  };
  const pickSize = (s: TextSize) => {
    sizeStore.set(s);
    applyDisplayPrefs(theme, s);
  };

  return (
    <main className="paper pb-24">
      <TopBar current="settings" left="settings" />

      <section className="mt-10 text-[15px]">
        <Choice
          label="Theme"
          value={theme}
          onPick={pickTheme}
          options={[
            { value: 'system', label: 'system' },
            { value: 'light', label: 'light' },
            { value: 'dark', label: 'dark' },
          ]}
        />
        <Choice
          label="Text size"
          value={size}
          onPick={pickSize}
          options={[
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
            { value: 'l', label: 'L' },
          ]}
        />
        <Choice
          label="Daily question"
          value={questions}
          onPick={(v) => questionsStore.set(v)}
          options={[
            { value: 'on', label: 'on' },
            { value: 'off', label: 'off' },
          ]}
        />
      </section>

      <section className="mt-10 text-[15px]">
        <Row label={user?.email ?? ''}>
          <button type="button" onClick={signOut} className="text-faint hover:text-ink">
            sign out
          </button>
        </Row>
        <p className="mt-2 text-[13px] leading-relaxed text-faint">
          Signing out also clears the copy of your journal saved on this device.
        </p>
      </section>
    </main>
  );
}
