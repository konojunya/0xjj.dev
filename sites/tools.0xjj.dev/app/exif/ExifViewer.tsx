'use client';

import { useCallback, useRef, useState } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ExifEntry {
  key: string;
  value: string;
}

interface ExifSection {
  id: string;
  label: string;
  entries: ExifEntry[];
}

interface FileResult {
  name: string;
  size: number;
  sections: ExifSection[];
}

// ─── grouping config ──────────────────────────────────────────────────────────

const IMAGE_GROUPS: Array<{
  id: string;
  label: string;
  match: (key: string) => boolean;
}> = [
  {
    id: 'camera',
    label: 'Camera',
    match: (k) =>
      ['Make', 'Model', 'Software', 'BodySerialNumber', 'LensMake', 'LensSerialNumber'].includes(k),
  },
  {
    id: 'image',
    label: 'Image',
    match: (k) =>
      [
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
        'Orientation',
        'ColorSpace',
        'BitsPerSample',
        'XResolution',
        'YResolution',
        'ResolutionUnit',
        'PixelXDimension',
        'PixelYDimension',
        'Compression',
        'PhotometricInterpretation',
        'SamplesPerPixel',
        'PlanarConfiguration',
        'YCbCrSubSampling',
        'YCbCrPositioning',
      ].includes(k),
  },
  {
    id: 'exposure',
    label: 'Exposure',
    match: (k) =>
      [
        'ExposureTime',
        'FNumber',
        'ISO',
        'ISOSpeedRatings',
        'ExposureProgram',
        'ExposureMode',
        'ExposureBiasValue',
        'ExposureIndex',
        'Flash',
        'FocalLength',
        'FocalLengthIn35mmFormat',
        'LensModel',
        'LensSpecification',
        'MaxApertureValue',
        'MeteringMode',
        'LightSource',
        'SensingMethod',
        'SceneCaptureType',
        'SceneType',
        'CustomRendered',
        'WhiteBalance',
        'DigitalZoomRatio',
        'GainControl',
        'Contrast',
        'Saturation',
        'Sharpness',
        'SubjectDistanceRange',
        'ShutterSpeedValue',
        'ApertureValue',
        'BrightnessValue',
      ].includes(k),
  },
  {
    id: 'datetime',
    label: 'Date / Time',
    match: (k) =>
      [
        'DateTime',
        'DateTimeOriginal',
        'DateTimeDigitized',
        'SubSecTime',
        'SubSecTimeOriginal',
        'SubSecTimeDigitized',
        'OffsetTime',
        'OffsetTimeOriginal',
        'OffsetTimeDigitized',
      ].includes(k),
  },
  {
    id: 'gps',
    label: 'GPS',
    match: (k) =>
      k.startsWith('GPS') || k === 'latitude' || k === 'longitude' || k === 'altitude',
  },
  {
    id: 'other',
    label: 'Other',
    match: () => true,
  },
];

// ─── value formatting ─────────────────────────────────────────────────────────

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';

  if (value instanceof Uint8Array) {
    return `<binary ${value.byteLength} bytes>`;
  }

  if (key === 'ExposureTime') {
    const n = Number(value);
    if (!isNaN(n) && n > 0 && n < 1) {
      return `1/${Math.round(1 / n)}s`;
    }
    return `${n}s`;
  }

  if (key === 'FNumber') {
    return `f/${Number(value).toFixed(1)}`;
  }

  if (key === 'FocalLength' || key === 'FocalLengthIn35mmFormat') {
    return `${Number(value)}mm`;
  }

  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value !== null &&
    ('_rawValue' in value || value instanceof Date)
  ) {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    // GPS DMS array: [degrees, minutes, seconds]
    if (
      value.length === 3 &&
      value.every((v) => typeof v === 'number') &&
      (key.includes('GPS') || key === 'latitude' || key === 'longitude')
    ) {
      const [d, m, s] = value as number[];
      return `${d}° ${m}' ${s.toFixed(2)}"`;
    }
    return value
      .map((v) => (v instanceof Uint8Array ? `<binary ${v.byteLength} bytes>` : String(v)))
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

// ─── image parser ─────────────────────────────────────────────────────────────

async function parseImage(file: File): Promise<ExifSection[]> {
  const { default: exifr } = await import('exifr');

  const raw = await exifr.parse(file, {
    tiff: true,
    exif: true,
    gps: true,
    iptc: true,
    ihdr: true,
    icc: false,
    translateValues: true,
    reviveValues: true,
    mergeOutput: false,
  });

  if (!raw) {
    return [];
  }

  // Flatten all segments into one map
  const flat: Record<string, unknown> = {};
  for (const segment of Object.values(raw)) {
    if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
      Object.assign(flat, segment);
    }
  }

  // Also parse GPS separately for lat/lon/altitude convenience fields
  const gps = await exifr.gps(file).catch(() => null);
  if (gps) {
    if (gps.latitude !== undefined) flat['latitude'] = gps.latitude;
    if (gps.longitude !== undefined) flat['longitude'] = gps.longitude;
  }

  // Build sections
  const sectionMap = new Map<string, ExifEntry[]>();
  for (const g of IMAGE_GROUPS) sectionMap.set(g.id, []);

  for (const [key, val] of Object.entries(flat)) {
    const formatted = formatValue(key, val);
    if (!formatted) continue;

    const groupId = IMAGE_GROUPS.find((g) => g.match(key))?.id ?? 'other';
    sectionMap.get(groupId)!.push({ key, value: formatted });
  }

  return IMAGE_GROUPS.flatMap(({ id, label }) => {
    const entries = sectionMap.get(id)!;
    if (entries.length === 0) return [];
    return [{ id, label, entries }];
  });
}

// ─── PDF parser ───────────────────────────────────────────────────────────────

async function parsePdf(file: File): Promise<ExifSection[]> {
  const { PDFDocument } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const ptToMm = (pt: number) => (pt * 25.4) / 72;

  // Page size from first page
  let pageSizeStr = '';
  if (doc.getPageCount() > 0) {
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    pageSizeStr = `${ptToMm(width).toFixed(1)} × ${ptToMm(height).toFixed(1)} mm`;
  }

  const docEntries: ExifEntry[] = [
    { key: 'Page Count', value: String(doc.getPageCount()) },
    ...(pageSizeStr ? [{ key: 'Page Size', value: pageSizeStr }] : []),
  ];

  const metaEntries: ExifEntry[] = [];

  const fields: Array<[string, () => string | undefined]> = [
    ['Title', () => doc.getTitle()],
    ['Author', () => doc.getAuthor()],
    ['Subject', () => doc.getSubject()],
    ['Keywords', () => doc.getKeywords()],
    ['Creator', () => doc.getCreator()],
    ['Producer', () => doc.getProducer()],
    ['Creation Date', () => doc.getCreationDate()?.toISOString()],
    ['Modification Date', () => doc.getModificationDate()?.toISOString()],
  ];

  for (const [label, getter] of fields) {
    const val = getter();
    if (val) metaEntries.push({ key: label, value: val });
  }

  const sections: ExifSection[] = [
    { id: 'document', label: 'Document', entries: docEntries },
  ];
  if (metaEntries.length > 0) {
    sections.push({ id: 'metadata', label: 'Metadata', entries: metaEntries });
  }
  return sections;
}

// ─── file size formatter ──────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── MetaTable ────────────────────────────────────────────────────────────────

function MetaTable({ sections }: { sections: ExifSection[] }) {
  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map(({ id, label, entries }) => (
        <div key={id}>
          <h2 className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted">
            {label} <span className="opacity-50">({entries.length})</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]">
                  <th className="w-56 px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">
                    property
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">
                    value
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)] transition-colors"
                  >
                    <td className="w-56 px-4 py-3 align-top">
                      <span className="font-mono text-xs text-muted break-all">{entry.key}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="text-xs text-fg break-all">{entry.value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/tiff',
  'image/png',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/webp',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.tiff,.tif,.png,.heic,.heif,.avif,.webp,.pdf';

export default function ExifViewer() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = ACCEPTED_TYPES.filter((t) => t.startsWith('image/')).includes(file.type);

    if (!isPdf && !isImage) {
      setError(`Unsupported file type: ${file.type || file.name}`);
      return;
    }

    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const sections = isPdf ? await parsePdf(file) : await parseImage(file);
      setResult({ name: file.name, size: file.size, sections });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // reset so same file can be re-selected
      e.target.value = '';
    },
    [processFile],
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <a
          href="/"
          className="mb-6 inline-block font-mono text-xs text-muted transition-colors hover:text-fg"
        >
          ← back
        </a>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">EXIF Viewer</h1>
        <p className="mt-1 text-sm text-muted">
          View embedded metadata (EXIF, XMP, IPTC) from images and PDF documents. Files are
          processed entirely in your browser — nothing is uploaded.
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a file or click to select"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'mb-8 flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors select-none',
          isDragging
            ? 'border-[color-mix(in_srgb,var(--color-fg)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_6%,transparent)]'
            : 'border-[color-mix(in_srgb,var(--color-fg)_18%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_2%,transparent)] hover:border-[color-mix(in_srgb,var(--color-fg)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]',
        ].join(' ')}
      >
        <svg
          className="h-8 w-8 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-sm text-muted">
          Drop an image or PDF, or{' '}
          <span className="text-fg underline underline-offset-2">click to select</span>
        </p>
        <p className="font-mono text-xs text-muted opacity-60">
          JPEG · TIFF · PNG · HEIC · AVIF · WebP · PDF
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="sr-only"
          onChange={handleChange}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--color-fg)_20%,transparent)] border-t-muted" />
          Parsing metadata…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Result */}
      {result && !isLoading && (
        <div>
          {/* File info card */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] px-4 py-3 shadow-sm">
            <svg
              className="h-5 w-5 shrink-0 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm text-fg">{result.name}</p>
              <p className="font-mono text-xs text-muted">{formatFileSize(result.size)}</p>
            </div>
          </div>

          {result.sections.length === 0 ? (
            <p className="text-sm text-muted">No metadata found in this file.</p>
          ) : (
            <MetaTable sections={result.sections} />
          )}
        </div>
      )}
    </main>
  );
}
