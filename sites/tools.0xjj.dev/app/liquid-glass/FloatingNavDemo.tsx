'use client';

import { useState } from 'react';
import { Home, Search, Bell, MessageCircle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Home, label: 'Home' },
  { icon: Search, label: 'Search' },
  { icon: Bell, label: 'Alerts' },
  { icon: MessageCircle, label: 'Chat' },
  { icon: User, label: 'Profile' },
];

export default function FloatingNavDemo() {
  const [active, setActive] = useState(0);

  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold tracking-tight text-fg">UI Example: Floating Navigation</h2>
      <p className="mt-2 text-sm text-muted">
        backdrop-filter: blur() + saturate() applied to a floating tab bar.
      </p>

      <div
        className="relative mt-4 flex h-[320px] items-end justify-center overflow-hidden rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)',
        }}
      >
        {/* Floating glass nav */}
        <nav
          className="relative z-10 mb-8 flex items-center gap-1 rounded-2xl p-1.5"
          style={{
            backdropFilter: 'blur(40px) saturate(2)',
            WebkitBackdropFilter: 'blur(40px) saturate(2)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.25), inset 0 -0.5px 0 rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.18)',
          }}
        >
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = active === i;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActive(i)}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-5 py-2.5 text-[11px] font-medium tracking-wide transition-all ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)',
                      boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.3), 0 0 12px rgba(255,255,255,0.05)',
                      border: '0.5px solid rgba(255,255,255,0.12)',
                    }}
                  />
                )}
                <Icon className="relative" size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
