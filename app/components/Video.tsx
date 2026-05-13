import { useEffect, useMemo, useState } from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

type ParsedVideo =
  | { kind: "youtube"; embedUrl: string; watchUrl: string }
  | { kind: "vimeo"; embedUrl: string; watchUrl: string }
  | { kind: "direct"; src: string; watchUrl: string }
  | { kind: "invalid" };

function parseVideoUrl({
  videoUrl,
  loop,
  autoplay,
  muteAudio,
  relatedVideosFromOtherChannels,
}: {
  videoUrl: string;
  loop: boolean;
  autoplay: boolean;
  muteAudio: boolean;
  relatedVideosFromOtherChannels: boolean;
}): ParsedVideo {
  const trimmed = videoUrl.trim();
  if (!trimmed) return { kind: "invalid" };

  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/i;
  const youtubeMatch = trimmed.match(youtubeRegex);
  if (youtubeMatch) {
    const youtubeId = youtubeMatch[1];
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      mute: muteAudio ? "1" : "0",
      loop: loop ? "1" : "0",
      rel: relatedVideosFromOtherChannels ? "1" : "0",
      playsinline: "1",
    });

    // YouTube 循环播放需要 playlist 参数
    if (loop) {
      params.set("playlist", youtubeId);
    }

    return {
      kind: "youtube",
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`,
      watchUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/i;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch) {
    const vimeoId = vimeoMatch[1];
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      muted: muteAudio ? "1" : "0",
      loop: loop ? "1" : "0",
    });
    return {
      kind: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`,
      watchUrl: `https://vimeo.com/${vimeoId}`,
    };
  }

  const directVideoRegex = /\.(mp4|webm|ogg)(\?.*)?$/i;
  if (directVideoRegex.test(trimmed)) {
    return {
      kind: "direct",
      src: trimmed,
      watchUrl: trimmed,
    };
  }

  return { kind: "invalid" };
}

const VideoInternal: ComponentConfig<Components["Video"]> = {
  fields: {
    videoUrl: {
      type: "text",
      label: "Video URL",
    },
    aspectRatio: {
      type: "radio",
      label: "Aspect Ratio",
      options: [
        { label: "16 x 9", value: "16:9" },
        { label: "4 x 3", value: "4:3" },
      ],
    },
    loading: {
      type: "radio",
      label: "Loading",
      options: [
        { label: "Eager", value: "eager" },
        { label: "Lazy", value: "lazy" },
        { label: "Auto", value: "auto" },
      ],
    },
    loop: {
      type: "radio",
      label: "Loop",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
    autoplay: {
      type: "radio",
      label: "Autoplay",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
    muteAudio: {
      type: "radio",
      label: "Mute audio",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
    relatedVideosFromOtherChannels: {
      type: "radio",
      label: "Related videos from other channels",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
  },
  defaultProps: {
    videoUrl: "",
    aspectRatio: "16:9",
    loading: "auto",
    loop: false,
    autoplay: false,
    muteAudio: false,
    relatedVideosFromOtherChannels: true,
    layout: {
      padding: "0px",
    },
  },
  render: ({
    videoUrl,
    aspectRatio,
    loading,
    loop,
    autoplay,
    muteAudio,
    relatedVideosFromOtherChannels,
  }) => {
    const [iframeLoadFailed, setIframeLoadFailed] = useState(false);
    const parsed = parseVideoUrl({
      videoUrl,
      loop,
      autoplay,
      muteAudio,
      relatedVideosFromOtherChannels,
    });

    const ratioPadding = aspectRatio === "4:3" ? "75%" : "56.25%";
    const loadingMode = loading === "auto" ? undefined : loading;
    const allowValue = autoplay
      ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      : "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    const containerStyle = useMemo(
      () => ({
        position: "relative" as const,
        width: "100%",
        paddingTop: ratioPadding,
        backgroundColor: "#000",
        borderRadius: "8px",
        overflow: "hidden",
      }),
      [ratioPadding]
    );

    useEffect(() => {
      setIframeLoadFailed(false);
    }, [videoUrl, aspectRatio, loading, loop, autoplay, muteAudio, relatedVideosFromOtherChannels]);

    if (!videoUrl.trim()) {
      return (
        <Section>
          <div
            style={{
              border: "1px dashed #d0d0d0",
              borderRadius: "8px",
              padding: "16px",
              color: "#666",
              fontSize: "14px",
            }}
          >
            Youtube or Vimeo link
          </div>
        </Section>
      );
    }

    if (parsed.kind === "invalid") {
      return (
        <Section>
          <div
            style={{
              border: "1px solid #ffeeba",
              backgroundColor: "#fff3cd",
              borderRadius: "8px",
              padding: "16px",
              color: "#856404",
              fontSize: "14px",
            }}
          >
            Invalid video URL. Please use YouTube, Vimeo, or direct .mp4/.webm/.ogg
            link.
          </div>
        </Section>
      );
    }

    return (
      <Section>
        <div style={containerStyle}>
          {parsed.kind === "direct" ? (
            <video
              src={parsed.src}
              controls
              autoPlay={autoplay}
              muted={muteAudio}
              loop={loop}
              playsInline
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <iframe
              src={parsed.embedUrl}
              title="Video player"
              loading={loadingMode}
              allow={allowValue}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onError={() => {
                setIframeLoadFailed(true);
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: "8px",
                display: iframeLoadFailed ? "none" : "block",
              }}
            />
          )}

          {parsed.kind !== "direct" && iframeLoadFailed ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#111",
                color: "#fff",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <a
                href={parsed.watchUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#fff",
                  textDecoration: "underline",
                  fontSize: "14px",
                }}
              >
                Open video in new tab
              </a>
            </div>
          ) : null}
        </div>
      </Section>
    );
  },
};

export const Video = withLayout(VideoInternal);

