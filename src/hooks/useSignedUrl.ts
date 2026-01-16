import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to generate signed URLs for private storage buckets.
 * Returns a function to get signed URLs with caching to avoid unnecessary requests.
 */
export function useSignedUrl() {
  const [loading, setLoading] = useState(false);
  const [cache] = useState<Map<string, { url: string; expires: number }>>(new Map());

  const getSignedUrl = async (
    bucket: string, 
    path: string, 
    expiresInSeconds = 3600 // 1 hour default
  ): Promise<string | null> => {
    if (!path) return null;
    
    // Extract the path from the full URL if necessary
    let storagePath = path;
    
    // Check if it's a full URL and extract the path
    if (path.includes('/storage/v1/object/')) {
      const match = path.match(/\/storage\/v1\/object\/(?:public|sign)\/([^?]+)/);
      if (match) {
        storagePath = match[1].replace(`${bucket}/`, '');
      }
    }
    
    // Check cache
    const cacheKey = `${bucket}:${storagePath}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.url;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }

      // Cache the URL (expire 1 minute before actual expiry)
      cache.set(cacheKey, {
        url: data.signedUrl,
        expires: Date.now() + (expiresInSeconds - 60) * 1000,
      });

      return data.signedUrl;
    } catch (error) {
      console.error("Error in getSignedUrl:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getSignedUrl, loading };
}
