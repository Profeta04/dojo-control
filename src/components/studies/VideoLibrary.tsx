import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fixedVideos } from "@/data/fixedStudyContent";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play, Video } from "lucide-react";

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?#]+)/);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "";
}

export function VideoLibrary() {
  const { profile } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  const { data: dbVideos = [] } = useQuery({
    queryKey: ["study-videos", profile?.dojo_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_videos")
        .select("*")
        .eq("martial_art", "judo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const allVideos = [
    ...fixedVideos.map(v => ({ ...v, isFixed: true })),
    ...dbVideos.map((v: any) => ({ ...v, isFixed: false })),
  ];

  return (
    <div className="space-y-4">
      {allVideos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum vídeo disponível ainda.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {allVideos.map((video) => {
          const thumbnail = video.thumbnail_url || getYouTubeThumbnail(video.video_url);
          return (
            <Card
              key={video.id}
              className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video bg-muted">
                {thumbnail ? (
                  <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-primary/90 rounded-full p-3">
                    <Play className="h-6 w-6 text-primary-foreground fill-current" />
                  </div>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="mb-1">
                  <h3 className="text-sm font-semibold leading-tight line-clamp-2">{video.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {video.isFixed && (
                    <Badge variant="secondary" className="text-[10px]">Oficial</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize">{video.source}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Video player dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-base">{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {selectedVideo && getYouTubeId(selectedVideo.video_url) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(selectedVideo.video_url)}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={selectedVideo.title}
              />
            ) : selectedVideo ? (
              <video
                src={selectedVideo.video_url}
                className="w-full h-full"
                controls
                autoPlay
              />
            ) : null}
          </div>
          {selectedVideo?.description && (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{selectedVideo.description}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
