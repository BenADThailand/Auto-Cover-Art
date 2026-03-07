import { useState, useEffect, useCallback } from 'react';
import { getSharedAssets, uploadSharedAsset, deleteSharedAsset } from '../firebase';
import type { SharedAsset } from '../types';

export function useSharedAssets() {
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getSharedAssets();
      setAssets(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = async (file: File, userId: string, tags?: string[]): Promise<SharedAsset> => {
    const asset = await uploadSharedAsset(file, userId, tags);
    await refresh();
    return asset;
  };

  const remove = async (asset: SharedAsset): Promise<void> => {
    await deleteSharedAsset(asset);
    await refresh();
  };

  return { assets, loading, upload, remove, refresh };
}
