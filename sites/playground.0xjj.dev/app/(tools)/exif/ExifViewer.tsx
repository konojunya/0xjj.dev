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

type FileType = 'pdf' | 'jpeg' | 'image';

interface FileResult {
  name: string;
  size: number;
  type: FileType;
  sections: ExifSection[];
  rawMeta: Record<string, unknown>;
}

interface EditFieldDef {
  key: string;
  label: string;
  type: 'text' | 'datetime-local';
  /** Key used to look up the initial value from rawMeta (defaults to key). */
  rawKey?: string;
}

// ─── edit field definitions ───────────────────────────────────────────────────

const PDF_EDIT_FIELDS: EditFieldDef[] = [
  { key: 'Title', label: 'タイトル', type: 'text' },
  { key: 'Author', label: '著者', type: 'text' },
  { key: 'Subject', label: '件名', type: 'text' },
  { key: 'Keywords', label: 'キーワード', type: 'text' },
  { key: 'Creator', label: '作成者', type: 'text' },
  { key: 'Producer', label: 'プロデューサー', type: 'text' },
  { key: 'Creation Date', label: '作成日', type: 'datetime-local' },
  { key: 'Modification Date', label: '更新日', type: 'datetime-local' },
];

// JPEG editable fields (stored in IFD0 / Exif IFD)
const JPEG_EDIT_FIELDS: EditFieldDef[] = [
  { key: 'Description', label: '説明', type: 'text', rawKey: 'ImageDescription' },
  { key: 'Artist', label: 'アーティスト', type: 'text' },
  { key: 'Copyright', label: '著作権', type: 'text' },
  { key: 'Software', label: 'ソフトウェア', type: 'text' },
  { key: 'DateTime', label: '更新日時', type: 'datetime-local' },
  { key: 'DateTimeOriginal', label: '撮影日時', type: 'datetime-local' },
  { key: 'DateTimeDigitized', label: 'デジタル化日時', type: 'datetime-local' },
];

function getEditFields(type: FileType): EditFieldDef[] {
  if (type === 'pdf') return PDF_EDIT_FIELDS;
  if (type === 'jpeg') return JPEG_EDIT_FIELDS;
  return [];
}

// ─── image grouping ───────────────────────────────────────────────────────────

const IMAGE_GROUPS: Array<{ id: string; label: string; match: (k: string) => boolean }> = [
  {
    id: 'camera',
    label: 'カメラ',
    match: (k) =>
      ['Make', 'Model', 'Software', 'BodySerialNumber', 'LensMake', 'LensSerialNumber'].includes(k),
  },
  {
    id: 'image',
    label: '画像',
    match: (k) =>
      [
        'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
        'Orientation', 'ColorSpace', 'BitsPerSample',
        'XResolution', 'YResolution', 'ResolutionUnit',
        'PixelXDimension', 'PixelYDimension', 'Compression',
        'PhotometricInterpretation', 'SamplesPerPixel',
        'PlanarConfiguration', 'YCbCrSubSampling', 'YCbCrPositioning',
      ].includes(k),
  },
  {
    id: 'exposure',
    label: '露出',
    match: (k) =>
      [
        'ExposureTime', 'FNumber', 'ISO', 'ISOSpeedRatings',
        'ExposureProgram', 'ExposureMode', 'ExposureBiasValue', 'ExposureIndex',
        'Flash', 'FocalLength', 'FocalLengthIn35mmFormat',
        'LensModel', 'LensSpecification', 'MaxApertureValue',
        'MeteringMode', 'LightSource', 'SensingMethod',
        'SceneCaptureType', 'SceneType', 'CustomRendered',
        'WhiteBalance', 'DigitalZoomRatio', 'GainControl',
        'Contrast', 'Saturation', 'Sharpness', 'SubjectDistanceRange',
        'ShutterSpeedValue', 'ApertureValue', 'BrightnessValue',
      ].includes(k),
  },
  {
    id: 'datetime',
    label: '日時',
    match: (k) =>
      [
        'DateTime', 'DateTimeOriginal', 'DateTimeDigitized',
        'SubSecTime', 'SubSecTimeOriginal', 'SubSecTimeDigitized',
        'OffsetTime', 'OffsetTimeOriginal', 'OffsetTimeDigitized',
      ].includes(k),
  },
  {
    id: 'gps',
    label: 'GPS',
    match: (k) => k.startsWith('GPS') || k === 'latitude' || k === 'longitude' || k === 'altitude',
  },
  { id: 'other', label: 'その他', match: () => true },
];

// ─── value formatting ─────────────────────────────────────────────────────────

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Uint8Array) return `<binary ${value.byteLength} bytes>`;
  if (key === 'ExposureTime') {
    const n = Number(value);
    if (!isNaN(n) && n > 0 && n < 1) return `1/${Math.round(1 / n)}s`;
    return `${n}s`;
  }
  if (key === 'FNumber') return `f/${Number(value).toFixed(1)}`;
  if (key === 'FocalLength' || key === 'FocalLengthIn35mmFormat') return `${Number(value)}mm`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
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
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ─── date conversion utilities ────────────────────────────────────────────────

/** Convert ISO / EXIF date string or Date → datetime-local input value "YYYY-MM-DDTHH:MM". */
function dateToInputValue(raw: unknown): string {
  if (!raw) return '';
  const str = raw instanceof Date ? raw.toISOString() : String(raw);

  // Try standard Date parsing first (handles ISO 8601)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    // Shift to local time so the input shows the "wall clock" value
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const m = str.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;

  return '';
}

/** Convert datetime-local input value → EXIF date string "YYYY:MM:DD HH:MM:SS". */
function inputToExifDate(val: string): string {
  if (!val) return '';
  const [d, t = '00:00'] = val.split('T');
  const [y, mo, dd] = d.split('-');
  const [h, mi] = t.split(':');
  return `${y}:${mo}:${dd} ${h}:${mi}:00`;
}

// ─── binary utilities (for piexifjs) ─────────────────────────────────────────

function arrayBufferToBinaryString(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunks: string[] = [];
  // Chunk to avoid call-stack limits with large files
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...Array.from(bytes.subarray(i, i + 8192))));
  }
  return chunks.join('');
}

function binaryStringToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

// ─── download helper ──────────────────────────────────────────────────────────

function triggerDownload(data: Uint8Array<ArrayBuffer>, filename: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── file size formatter ──────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── initial edit value builder ───────────────────────────────────────────────

function buildEditValues(type: FileType, rawMeta: Record<string, unknown>): Record<string, string> {
  const fields = getEditFields(type);
  const values: Record<string, string> = {};
  for (const field of fields) {
    const raw = rawMeta[field.rawKey ?? field.key];
    values[field.key] =
      field.type === 'datetime-local' ? dateToInputValue(raw) : raw != null ? String(raw) : '';
  }
  return values;
}

// ─── parsers ──────────────────────────────────────────────────────────────────

async function parseImage(
  file: File,
): Promise<{ sections: ExifSection[]; rawMeta: Record<string, unknown> }> {
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

  if (!raw) return { sections: [], rawMeta: {} };

  const flat: Record<string, unknown> = {};
  for (const segment of Object.values(raw)) {
    if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
      Object.assign(flat, segment);
    }
  }

  const gps = await exifr.gps(file).catch(() => null);
  if (gps) {
    if (gps.latitude !== undefined) flat['latitude'] = gps.latitude;
    if (gps.longitude !== undefined) flat['longitude'] = gps.longitude;
  }

  const sectionMap = new Map<string, ExifEntry[]>();
  for (const g of IMAGE_GROUPS) sectionMap.set(g.id, []);

  for (const [key, val] of Object.entries(flat)) {
    const formatted = formatValue(key, val);
    if (!formatted) continue;
    const groupId = IMAGE_GROUPS.find((g) => g.match(key))?.id ?? 'other';
    sectionMap.get(groupId)!.push({ key, value: formatted });
  }

  const sections = IMAGE_GROUPS.flatMap(({ id, label }) => {
    const entries = sectionMap.get(id)!;
    return entries.length ? [{ id, label, entries }] : [];
  });

  return { sections, rawMeta: flat };
}

async function parsePdf(
  file: File,
): Promise<{ sections: ExifSection[]; rawMeta: Record<string, unknown> }> {
  const { PDFDocument } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const ptToMm = (pt: number) => (pt * 25.4) / 72;
  let pageSizeStr = '';
  if (doc.getPageCount() > 0) {
    const { width, height } = doc.getPage(0).getSize();
    pageSizeStr = `${ptToMm(width).toFixed(1)} × ${ptToMm(height).toFixed(1)} mm`;
  }

  const docEntries: ExifEntry[] = [
    { key: 'Page Count', value: String(doc.getPageCount()) },
    ...(pageSizeStr ? [{ key: 'Page Size', value: pageSizeStr }] : []),
  ];

  const rawMeta: Record<string, unknown> = {};
  const metaEntries: ExifEntry[] = [];

  const metaFields: Array<[string, () => string | undefined | null]> = [
    ['Title', () => doc.getTitle()],
    ['Author', () => doc.getAuthor()],
    ['Subject', () => doc.getSubject()],
    ['Keywords', () => doc.getKeywords()],
    ['Creator', () => doc.getCreator()],
    ['Producer', () => doc.getProducer()],
    ['Creation Date', () => doc.getCreationDate()?.toISOString()],
    ['Modification Date', () => doc.getModificationDate()?.toISOString()],
  ];

  for (const [label, getter] of metaFields) {
    const val = getter();
    if (val) {
      rawMeta[label] = val;
      metaEntries.push({ key: label, value: val });
    }
  }

  const sections: ExifSection[] = [
    { id: 'document', label: 'ドキュメント', entries: docEntries },
    ...(metaEntries.length ? [{ id: 'metadata', label: 'メタデータ', entries: metaEntries }] : []),
  ];

  return { sections, rawMeta };
}

// ─── savers ───────────────────────────────────────────────────────────────────

async function savePdf(file: File, values: Record<string, string>): Promise<void> {
  const { PDFDocument } = await import('pdf-lib');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  doc.setTitle(values['Title'] ?? '');
  doc.setAuthor(values['Author'] ?? '');
  doc.setSubject(values['Subject'] ?? '');
  doc.setKeywords(values['Keywords'] ? [values['Keywords']] : []);
  doc.setCreator(values['Creator'] ?? '');
  doc.setProducer(values['Producer'] ?? '');
  if (values['Creation Date']) doc.setCreationDate(new Date(values['Creation Date']));
  if (values['Modification Date']) doc.setModificationDate(new Date(values['Modification Date']));

  const bytes = await doc.save();
  triggerDownload(new Uint8Array(bytes), file.name, 'application/pdf');
}

async function saveJpeg(file: File, values: Record<string, string>): Promise<void> {
  // piexifjs is CommonJS; access via .default after dynamic import
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const piexifModule = await import('piexifjs');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const piexif = ((piexifModule as any).default ?? piexifModule) as any;

  const buffer = await file.arrayBuffer();
  const binaryStr = arrayBufferToBinaryString(buffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exifObj: Record<string, Record<number, any>>;
  try {
    exifObj = piexif.load(binaryStr);
  } catch {
    exifObj = { '0th': {}, 'Exif': {}, 'GPS': {} };
  }
  if (!exifObj['0th']) exifObj['0th'] = {};
  if (!exifObj['Exif']) exifObj['Exif'] = {};

  const IFD0 = piexif.ImageIFD;
  const ExifIFD = piexif.ExifIFD;

  exifObj['0th'][IFD0.ImageDescription] = values['Description'] ?? '';
  exifObj['0th'][IFD0.Artist] = values['Artist'] ?? '';
  exifObj['0th'][IFD0.Copyright] = values['Copyright'] ?? '';
  exifObj['0th'][IFD0.Software] = values['Software'] ?? '';
  if (values['DateTime'])
    exifObj['0th'][IFD0.DateTime] = inputToExifDate(values['DateTime']);
  if (values['DateTimeOriginal'])
    exifObj['Exif'][ExifIFD.DateTimeOriginal] = inputToExifDate(values['DateTimeOriginal']);
  if (values['DateTimeDigitized'])
    exifObj['Exif'][ExifIFD.DateTimeDigitized] = inputToExifDate(values['DateTimeDigitized']);

  const exifBytes = piexif.dump(exifObj);
  const newBinaryStr = piexif.insert(exifBytes, binaryStr);
  triggerDownload(binaryStringToUint8Array(newBinaryStr), file.name, 'image/jpeg');
}

// ─── MetaTable (read-only view) ───────────────────────────────────────────────

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
                    プロパティ
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">
                    値
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

// ─── EditForm ─────────────────────────────────────────────────────────────────

function EditForm({
  fields,
  values,
  onChange,
  onSave,
  isSaving,
}: {
  fields: EditFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_3%,transparent)] shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--color-fg)_8%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_4%,transparent)]">
              <th className="w-44 px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">
                フィールド
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium text-muted">
                値
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr
                key={field.key}
                className="border-b border-[color-mix(in_srgb,var(--color-fg)_6%,transparent)] last:border-0"
              >
                <td className="w-44 px-4 py-2.5 align-middle">
                  <label
                    htmlFor={`edit-${field.key}`}
                    className="font-mono text-xs text-muted whitespace-nowrap"
                  >
                    {field.label}
                  </label>
                </td>
                <td className="px-3 py-2 align-middle">
                  <input
                    id={`edit-${field.key}`}
                    type={field.type}
                    value={values[field.key] ?? ''}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full rounded-lg border border-[color-mix(in_srgb,var(--color-fg)_15%,transparent)] bg-[color-mix(in_srgb,var(--color-fg)_5%,transparent)] px-3 py-1.5 font-mono text-xs text-fg outline-none placeholder:text-muted focus:border-[color-mix(in_srgb,var(--color-fg)_40%,transparent)] transition-colors"
                    style={{ fontSize: 13 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-muted">
          元のファイルは変更されません — 修正されたコピーがダウンロードされます。
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="shrink-0 rounded-lg bg-fg px-5 py-2.5 font-mono text-sm font-medium text-bg shadow-sm transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
              保存中...
            </span>
          ) : (
            '修正ファイルをダウンロード'
          )}
        </button>
      </div>
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

type Tab = 'view' | 'edit';

export default function ExifViewer() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileResult | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>('view');

  // Keep a reference to the original File so the save function can re-read it
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isJpeg =
      file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
    const isImage = ACCEPTED_TYPES.filter((t) => t.startsWith('image/')).includes(file.type);

    if (!isPdf && !isImage) {
      setError(`Unsupported file type: ${file.type || file.name}`);
      return;
    }

    setError(null);
    setResult(null);
    setEditValues({});
    setActiveTab('view');
    setIsLoading(true);
    fileRef.current = file;

    try {
      const fileType: FileType = isPdf ? 'pdf' : isJpeg ? 'jpeg' : 'image';
      const { sections, rawMeta } = isPdf
        ? await parsePdf(file)
        : await parseImage(file);

      setResult({ name: file.name, size: file.size, type: fileType, sections, rawMeta });
      setEditValues(buildEditValues(fileType, rawMeta));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!result || !fileRef.current) return;
    setIsSaving(true);
    try {
      if (result.type === 'pdf') {
        await savePdf(fileRef.current, editValues);
      } else if (result.type === 'jpeg') {
        await saveJpeg(fileRef.current, editValues);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [result, editValues]);

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

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile],
  );

  const canEdit = result?.type === 'pdf' || result?.type === 'jpeg';
  const editFields = result ? getEditFields(result.type) : [];

  return (
    <main className=" py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">EXIF Viewer</h1>
        <p className="mt-1 text-sm text-muted">
          画像やPDFのメタデータ（EXIF・XMP・IPTC）を表示・編集します。ファイルはすべてブラウザ内で処理され、アップロードされません。
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="ファイルをドロップまたはクリックして選択"
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
          画像またはPDFをドロップ、または{' '}
          <span className="text-fg underline underline-offset-2">クリックして選択</span>
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
          メタデータを解析中...
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

          {/* Tabs */}
          <div className="mb-6 flex border-b border-[color-mix(in_srgb,var(--color-fg)_12%,transparent)]">
            {(
              [
                { id: 'view', label: 'メタデータ' },
                ...(canEdit ? [{ id: 'edit', label: '編集' }] : []),
              ] as { id: Tab; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={[
                  'px-4 py-2.5 font-mono text-sm transition-colors',
                  activeTab === id
                    ? 'border-b-2 border-fg text-fg -mb-px'
                    : 'text-muted hover:text-fg',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'view' && (
            <>
              {result.sections.length === 0 ? (
                <p className="text-sm text-muted">このファイルにメタデータは見つかりませんでした。</p>
              ) : (
                <MetaTable sections={result.sections} />
              )}
              {!canEdit && (
                <p className="mt-6 font-mono text-xs text-muted">
                  メタデータの編集はPDFとJPEGファイルのみ対応しています。
                </p>
              )}
            </>
          )}

          {activeTab === 'edit' && canEdit && (
            <div>
              <p className="mb-4 font-mono text-xs text-muted uppercase tracking-widest">
                編集可能なメタデータ{' '}
                <span className="normal-case opacity-60">
                  ({result.type === 'pdf' ? 'PDF' : 'JPEG'})
                </span>
              </p>
              <EditForm
                fields={editFields}
                values={editValues}
                onChange={(key, value) =>
                  setEditValues((prev) => ({ ...prev, [key]: value }))
                }
                onSave={handleSave}
                isSaving={isSaving}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
