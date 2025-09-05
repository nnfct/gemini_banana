import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../ui';
import { tryOnHistory } from '../../../services/tryon_history.service';
import type { TryOnInputHistoryItem, TryOnOutputHistoryItem } from '../../../services/tryon_history.service';
import { FullScreenImage } from '../common/FullScreenImage';

export const MyPage: React.FC = () => {
  const [inputs, setInputs] = useState<TryOnInputHistoryItem[]>(tryOnHistory.inputs());
  const [outputs, setOutputs] = useState<TryOnOutputHistoryItem[]>(tryOnHistory.outputs());
  const [view, setView] = useState<string | null>(null);

  useEffect(() => {
    const unsub = tryOnHistory.subscribe(() => {
      setInputs(tryOnHistory.inputs());
      setOutputs(tryOnHistory.outputs());
    });
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.includes('app:tryon:history')) {
        setInputs(tryOnHistory.inputs());
        setOutputs(tryOnHistory.outputs());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => { unsub(); window.removeEventListener('storage', onStorage); };
  }, []);

  const inputThumb = (item: TryOnInputHistoryItem) => {
    const first = item.personImage || item.topImage || item.pantsImage || item.shoesImage;
    return first || '';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto w-full max-w-screen-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-10 items-start">
          <Card className="space-y-4 p-6 xl:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">입력 히스토리</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setInputs(tryOnHistory.inputs())}>새로고침</Button>
                <Button size="sm" variant="ghost" onClick={() => { tryOnHistory.clearInputs(); setInputs([]); }}>비우기</Button>
              </div>
            </div>
            {inputs.length === 0 ? (
              <div className="text-center text-gray-500 py-12">기록이 없습니다.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {inputs.map((it) => (
                  <button key={it.id} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-transparent hover:ring-blue-200" onClick={() => it.personImage && setView(it.personImage!)}>
                    {inputThumb(it) ? (
                      <img src={inputThumb(it)} alt="input" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">-</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-6 xl:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">결과 히스토리</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setOutputs(tryOnHistory.outputs())}>새로고침</Button>
                <Button size="sm" variant="ghost" onClick={() => { tryOnHistory.clearOutputs(); setOutputs([]); }}>비우기</Button>
              </div>
            </div>
            {outputs.length === 0 ? (
              <div className="text-center text-gray-500 py-12">기록이 없습니다.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {outputs.map((o) => (
                  <button key={o.id} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 ring-1 ring-transparent hover:ring-blue-200" onClick={() => setView(o.image)}>
                    <img src={o.image} alt="result" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {view && <FullScreenImage src={view} onClose={() => setView(null)} />}
    </div>
  );
};

export default MyPage;

