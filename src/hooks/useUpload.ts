import { useState } from 'react';
import { toast } from 'sonner';

export function useUpload(endpoint: string = '/api/upload') {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        toast.error(`${err.error || res.status}`);
        return null;
      }

      const { publicUrl } = await res.json();

      if (!publicUrl) {
        toast.error('R2_PUBLIC_URL-ի վերբեռնումը ձախողվեց');
        return null;
      }

      return publicUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Վերբեռնումը ձախողվեց: ${msg}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
