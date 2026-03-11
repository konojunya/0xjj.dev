'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Slider } from '@/components/ui/slider';
import { ShaderCanvas } from './ShaderCanvas';
import type { ShaderControlValues, ShaderDefinition, ShaderSliderControl } from './types';

function buildDefaultValues(definition: ShaderDefinition): ShaderControlValues {
  return Object.fromEntries(
    definition.controls.map((control) => [control.key, control.defaultValue]),
  );
}

function formatValue(control: ShaderSliderControl, value: number): string {
  const precision = control.precision ?? (Number.isInteger(control.step) ? 0 : 2);
  return `${value.toFixed(precision)}${control.unit ?? ''}`;
}

function ShaderControls({
  definition,
  values,
  onChange,
  columns = 'responsive',
}: {
  definition: ShaderDefinition;
  values: ShaderControlValues;
  onChange: (key: string, value: number) => void;
  columns?: 'responsive' | 'two';
}) {
  return (
    <div className={columns === 'two' ? 'grid gap-3 md:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
      {definition.controls.map((control) => {
        const value = values[control.key] ?? control.defaultValue;

        return (
          <label
            key={control.key}
            className="block rounded-2xl border border-black/8 bg-black/[0.03] p-4 dark:border-white/8 dark:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-fg dark:text-white">
                  {control.label}
                </div>
                {control.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {control.description}
                  </p>
                )}
              </div>
              <span className="font-mono text-xs text-fg dark:text-white/88">
                {formatValue(control, value)}
              </span>
            </div>

            <Slider
              min={control.min}
              max={control.max}
              step={control.step}
              value={[value]}
              onValueChange={([v]) => {
                onChange(control.key, v);
              }}
              className="mt-4"
            />

            <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
              <span>{formatValue(control, control.min)}</span>
              <span>{formatValue(control, control.max)}</span>
            </div>
          </label>
        );
      })}
    </div>
  );
}

export function ShaderLab({ definition }: { definition: ShaderDefinition }) {
  const [values, setValues] = useState<ShaderControlValues>(() => buildDefaultValues(definition));
  const [isRunning, setIsRunning] = useState(true);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [desktopControlsOpen, setDesktopControlsOpen] = useState(false);

  useEffect(() => {
    setValues(buildDefaultValues(definition));
    setIsRunning(true);
    setMobileControlsOpen(false);
    setDesktopControlsOpen(false);
  }, [definition]);

  return (
    <section className="mt-6 space-y-4">
      <div className="relative overflow-hidden rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#070d1b_0%,#050915_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(96,165,250,0.10),_transparent_20%)]" />
        <div className="absolute inset-x-0 top-0 z-10 hidden items-center justify-end gap-2 px-4 py-4 md:flex">
          <button
            type="button"
            onClick={() => setIsRunning((current) => !current)}
            className="rounded-full border border-white/12 bg-black/26 px-4 py-2 font-mono text-xs text-white/88 backdrop-blur-md transition-colors hover:bg-black/40"
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={() => setValues(buildDefaultValues(definition))}
            className="rounded-full border border-white/12 bg-black/20 px-4 py-2 font-mono text-xs text-white/70 backdrop-blur-md transition-colors hover:bg-black/34"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setDesktopControlsOpen(true)}
            className="rounded-full border border-white/12 bg-black/20 px-4 py-2 font-mono text-xs text-white/70 backdrop-blur-md transition-colors hover:bg-black/34"
          >
            Controls
          </button>
        </div>

        <ShaderCanvas definition={definition} values={values} isRunning={isRunning} />

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 px-4 py-4 md:hidden">
          <button
            type="button"
            onClick={() => setIsRunning((current) => !current)}
            className="rounded-full border border-white/12 bg-black/35 px-4 py-2 font-mono text-xs text-white/88 backdrop-blur-md"
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setValues(buildDefaultValues(definition))}
              className="rounded-full border border-white/12 bg-black/28 px-4 py-2 font-mono text-xs text-white/72 backdrop-blur-md"
            >
              Reset
            </button>

            <Drawer direction="bottom" open={mobileControlsOpen} onOpenChange={setMobileControlsOpen} showOverlay>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  suppressHydrationWarning
                  className="rounded-full border border-white/12 bg-white/94 px-4 py-2 font-mono text-xs text-black shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                >
                  Controls
                </button>
              </DrawerTrigger>
              <DrawerContent showOverlay className="flex max-h-[70svh] flex-col">
                <DrawerHeader className="shrink-0 border-b">
                  <DrawerTitle>Controls</DrawerTitle>
                  <DrawerDescription>
                    Tune the attractor without covering the preview.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
                  <ShaderControls
                    definition={definition}
                    values={values}
                    columns="responsive"
                    onChange={(key, value) => {
                      setValues((current) => ({ ...current, [key]: value }));
                    }}
                  />
                </div>
                <DrawerFooter className="shrink-0">
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full font-mono text-xs">
                      Close
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <Drawer direction="right" open={desktopControlsOpen} onOpenChange={setDesktopControlsOpen} showOverlay>
          <DrawerContent className="flex h-full flex-col">
            <DrawerHeader className="border-b px-6 pt-6 pb-4">
              <DrawerTitle>Controls</DrawerTitle>
              <DrawerDescription>
                Tune the attractor while keeping the preview visible.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ShaderControls
                definition={definition}
                values={values}
                columns="two"
                onChange={(key, value) => {
                  setValues((current) => ({ ...current, [key]: value }));
                }}
              />
            </div>
            <DrawerFooter className="px-5">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full font-mono text-xs">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </section>
  );
}
