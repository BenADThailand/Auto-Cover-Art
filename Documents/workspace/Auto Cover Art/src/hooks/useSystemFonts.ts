import { useState, useCallback, useEffect } from 'react';

interface FontOption {
  label: string;
  value: string;
}

const FALLBACK_FONTS: FontOption[] = [
  { label: 'SimSun (宋体)', value: 'SimSun, serif' },
  { label: 'Microsoft YaHei (微软雅黑)', value: '"Microsoft YaHei", sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'KaiTi (楷体)', value: 'KaiTi, serif' },
  { label: 'FangSong (仿宋)', value: 'FangSong, serif' },
];

const fallbackValues = new Set(FALLBACK_FONTS.map((f) => f.value));

export function useSystemFonts() {
  const [fonts, setFonts] = useState<FontOption[]>(FALLBACK_FONTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const isSupported = typeof window !== 'undefined' && 'queryLocalFonts' in window;

  const loadFonts = useCallback(async () => {
    if (!window.queryLocalFonts) return;
    try {
      const fontDataList = await window.queryLocalFonts();
      const familySet = new Set<string>();
      for (const fd of fontDataList) {
        familySet.add(fd.family);
      }

      const systemFonts: FontOption[] = [];
      for (const family of [...familySet].sort((a, b) => a.localeCompare(b))) {
        const value = `"${family}", sans-serif`;
        if (!fallbackValues.has(value)) {
          systemFonts.push({ label: family, value });
        }
      }

      setFonts([...FALLBACK_FONTS, ...systemFonts]);
      setIsLoaded(true);
    } catch {
      // permission denied or API error — keep fallback fonts
    }
  }, []);

  useEffect(() => {
    if (isSupported) {
      loadFonts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { fonts, isSupported, isLoaded, loadFonts };
}
