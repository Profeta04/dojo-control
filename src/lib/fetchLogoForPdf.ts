import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a dojo logo from the dojo-logos bucket and returns it as a base64 data URL.
 * Tries public URL first, then signed URL as fallback.
 * Returns null if logo cannot be loaded.
 */
export async function fetchLogoAsBase64(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;

  try {
    // Extract storage path from URL if it's a supabase storage URL
    let imageUrl = logoUrl;

    // If it's a relative path or storage path, build the public URL
    if (!logoUrl.startsWith("http")) {
      const { data } = supabase.storage.from("dojo-logos").getPublicUrl(logoUrl);
      imageUrl = data.publicUrl;
    }

    // Fetch the image
    const response = await fetch(imageUrl, { mode: "cors" });
    if (!response.ok) {
      // Try signed URL as fallback
      let storagePath = logoUrl;
      if (logoUrl.includes("/storage/v1/object/")) {
        const match = logoUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/dojo-logos\/([^?]+)/);
        if (match) storagePath = match[1];
      }

      const { data: signedData } = await supabase.storage
        .from("dojo-logos")
        .createSignedUrl(storagePath, 300);

      if (!signedData?.signedUrl) return null;

      const signedResponse = await fetch(signedData.signedUrl);
      if (!signedResponse.ok) return null;

      const blob = await signedResponse.blob();
      return blobToBase64(blob);
    }

    const blob = await response.blob();
    return blobToBase64(blob);
  } catch (error) {
    console.error("Failed to fetch dojo logo for PDF:", error);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
