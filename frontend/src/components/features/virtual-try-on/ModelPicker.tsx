import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '../../ui';
import type { UploadedImage } from '../../../types';
import { imageProxy } from '../../../services/imageProxy.service';

interface ModelPickerProps {
  onPick: (img: UploadedImage) => void;
}

const MODEL_FILES = [
  { id: 'male1', label: '남자 1' },
  { id: 'male2', label: '남자 2' },
  { id: 'male3', label: '남자 3' },
  { id: 'female1', label: '여자 1' },
  { id: 'female2', label: '여자 2' },
  { id: 'female3', label: '여자 3' },
];

const EXTS = ['png','jpg','jpeg','webp'];

function nameVariants(id: string): string[] {
  // male1 -> [male1, male-1, male_1, male 1]
  const m = id.match(/^(male|female)(\d)$/i);
  if (!m) return [id];
  const base = m[1];
  const num = m[2];
  return [
    `${base}${num}`,
    `${base}-${num}`,
    `${base}_${num}`,
    `${base} ${num}`,
  ];
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ onPick }) => {
  const candidates = useMemo(() => MODEL_FILES.map(m => {
    const names = nameVariants(m.id);
    const folders = ['models','model']; // support both public/models and public/model
    const urls: string[] = [];
    for (const folder of folders) {
      for (const n of names) {
        for (const ext of EXTS) {
          urls.push(`/${folder}/${n}.${ext}`);
        }
      }
    }
    return { ...m, urls };
  }), []);

  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const pick = (urls: string[]) => new Promise<string | null>((resolve) => {
      const tryNext = (i: number) => {
        if (i >= urls.length) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(urls[i]);
        img.onerror = () => tryNext(i + 1);
        img.src = urls[i];
      };
      tryNext(0);
    });
    (async () => {
      const entries: Record<string, string> = {};
      for (const m of candidates) {
        const ok = await pick(m.urls);
        if (ok) entries[m.id] = ok;
      }
      if (!cancelled) setPreviewMap(entries);
    })();
    return () => { cancelled = true; };
  }, [candidates]);

  const handlePick = async (urls: string[], label: string, id?: string) => {
    let lastErr: any;
    // Prefer the URL that actually loaded during preload
    const ordered = id && previewMap[id] ? [previewMap[id]!, ...urls.filter(u => u !== previewMap[id])] : urls;
    for (const u of ordered) {
      try {
        const img = await imageProxy.toUploadedImage(u, label);
        onPick(img);
        return;
      } catch (e) { lastErr = e; }
    }
    console.warn('Failed to load any model image', lastErr);
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">AI 모델 선택(상반신)</h3>
        <span className="text-xs text-gray-500">frontend/public/models 에 이미지 배치</span>
      </div>
      <div className="overflow-x-auto whitespace-nowrap flex gap-4 pb-1">
        {candidates.map(m => (
          <div key={m.id} className="inline-block w-32">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              {previewMap[m.id] ? (
                <img src={previewMap[m.id]} alt={m.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">이미지 없음</div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-700 truncate text-center">{m.label}</p>
            <div className="mt-1 text-center">
              <Button size="sm" onClick={() => handlePick(m.urls, m.id, m.id)}>사용</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ModelPicker;
