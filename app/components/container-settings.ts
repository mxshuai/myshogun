import { normalizeImageValue } from "./editor/media/types";

export type ContainerMain = {
  entireContainerClickable: boolean;
  containerUrl: string;
  openInNewWindow: boolean;
  verticalAlign: "top" | "middle" | "bottom";
};

export type ContainerBackgroundImage =
  | string
  | {
      url: string;
      filename?: string;
      size?: number | null;
      width?: number | null;
      height?: number | null;
    }
  | null;

export type ContainerBackground = {
  backgroundType: "color" | "image" | "video";
  backgroundImage: ContainerBackgroundImage;
  backgroundColor: string;
  backgroundVideo: string;
  /** 开 = 有声。旧数据里的 videoMuted 为 true 时等于 sound false。 */
  sound: boolean;
  backgroundSize: "cover" | "contain" | "custom";
  backgroundWidth?: number;
  backgroundHeight?: number;
  backgroundRepeat: "no-repeat" | "repeat";
  horizontalPosition: "left" | "center" | "right" | "custom";
  horizontalPositionValue: number;
  verticalPosition: "top" | "center" | "bottom" | "custom";
  verticalPositionValue: number;
  responsiveImage: boolean;
  loading: "eager" | "lazy" | "auto";
  parallaxEffect: boolean;
};

export const defaultContainerMain: ContainerMain = {
  entireContainerClickable: false,
  containerUrl: "",
  openInNewWindow: false,
  verticalAlign: "middle",
};

export const defaultContainerBackground: ContainerBackground = {
  backgroundType: "image",
  backgroundImage: null,
  backgroundColor: "#ffffff",
  backgroundVideo: "",
  sound: false,
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  horizontalPosition: "center",
  horizontalPositionValue: 0,
  verticalPosition: "center",
  verticalPositionValue: 0,
  responsiveImage: true,
  loading: "auto",
  parallaxEffect: false,
};

const MAIN_KEYS = [
  "entireContainerClickable",
  "containerUrl",
  "openInNewWindow",
  "verticalAlign",
] as const;

const BACKGROUND_KEYS = [
  "backgroundType",
  "backgroundImage",
  "backgroundColor",
  "backgroundVideo",
  "backgroundSize",
  "backgroundWidth",
  "backgroundHeight",
  "backgroundRepeat",
  "horizontalPosition",
  "horizontalPositionValue",
  "verticalPosition",
  "verticalPositionValue",
  "responsiveImage",
  "loading",
  "parallaxEffect",
] as const;

function pick<T>(nested: T | undefined, flat: T | undefined, fallback: T): T {
  if (nested !== undefined) return nested;
  if (flat !== undefined) return flat;
  return fallback;
}

export function containerBackgroundImageUrl(value: unknown): string {
  return normalizeImageValue(value)?.url ?? "";
}

export function readContainerSettings(props: Record<string, any> | undefined): {
  main: ContainerMain;
  background: ContainerBackground;
} {
  const source = props ?? {};
  const nestedMain = source.main ?? {};
  const nestedBackground = source.background ?? {};
  const sound = pick(
    nestedBackground.sound,
    source.videoMuted === undefined && nestedBackground.videoMuted === undefined
      ? undefined
      : !(nestedBackground.videoMuted ?? source.videoMuted),
    defaultContainerBackground.sound,
  );

  return {
    main: {
      entireContainerClickable: pick(
        nestedMain.entireContainerClickable,
        source.entireContainerClickable,
        defaultContainerMain.entireContainerClickable,
      ),
      containerUrl: pick(
        nestedMain.containerUrl,
        source.containerUrl,
        defaultContainerMain.containerUrl,
      ),
      openInNewWindow: pick(
        nestedMain.openInNewWindow,
        source.openInNewWindow,
        defaultContainerMain.openInNewWindow,
      ),
      verticalAlign: pick(
        nestedMain.verticalAlign,
        source.verticalAlign,
        defaultContainerMain.verticalAlign,
      ),
    },
    background: {
      backgroundType: pick(
        nestedBackground.backgroundType,
        source.backgroundType,
        defaultContainerBackground.backgroundType,
      ),
      backgroundImage: pick(
        nestedBackground.backgroundImage,
        source.backgroundImage,
        defaultContainerBackground.backgroundImage,
      ),
      backgroundColor: pick(
        nestedBackground.backgroundColor,
        source.backgroundColor,
        defaultContainerBackground.backgroundColor,
      ),
      backgroundVideo: pick(
        nestedBackground.backgroundVideo,
        source.backgroundVideo,
        defaultContainerBackground.backgroundVideo,
      ),
      sound,
      backgroundSize: pick(
        nestedBackground.backgroundSize,
        source.backgroundSize,
        defaultContainerBackground.backgroundSize,
      ),
      backgroundWidth: pick(
        nestedBackground.backgroundWidth,
        source.backgroundWidth,
        undefined,
      ),
      backgroundHeight: pick(
        nestedBackground.backgroundHeight,
        source.backgroundHeight,
        undefined,
      ),
      backgroundRepeat: pick(
        nestedBackground.backgroundRepeat,
        source.backgroundRepeat,
        defaultContainerBackground.backgroundRepeat,
      ),
      horizontalPosition: pick(
        nestedBackground.horizontalPosition,
        source.horizontalPosition,
        defaultContainerBackground.horizontalPosition,
      ),
      horizontalPositionValue: pick(
        nestedBackground.horizontalPositionValue,
        source.horizontalPositionValue,
        defaultContainerBackground.horizontalPositionValue,
      ),
      verticalPosition: pick(
        nestedBackground.verticalPosition,
        source.verticalPosition,
        defaultContainerBackground.verticalPosition,
      ),
      verticalPositionValue: pick(
        nestedBackground.verticalPositionValue,
        source.verticalPositionValue,
        defaultContainerBackground.verticalPositionValue,
      ),
      responsiveImage: pick(
        nestedBackground.responsiveImage,
        source.responsiveImage,
        defaultContainerBackground.responsiveImage,
      ),
      loading: pick(
        nestedBackground.loading,
        source.loading,
        defaultContainerBackground.loading,
      ),
      parallaxEffect: pick(
        nestedBackground.parallaxEffect,
        source.parallaxEffect,
        defaultContainerBackground.parallaxEffect,
      ),
    },
  };
}

export function containerNeedsNesting(props: Record<string, any> | undefined): boolean {
  if (!props?.main || !props?.background) return true;
  if (props.background.sound === undefined) return true;
  return false;
}

/** 把根上的旧字段收进 main / background。已嵌套的值优先。 */
export function nestContainerProps<T extends Record<string, any>>(props: T): T {
  const { main, background } = readContainerSettings(props);
  const next: Record<string, any> = { ...props, main, background };
  for (const key of MAIN_KEYS) next[key] = undefined;
  for (const key of BACKGROUND_KEYS) next[key] = undefined;
  next.videoMuted = undefined;
  if (next.background && "videoMuted" in next.background) {
    const { videoMuted: _muted, ...rest } = next.background;
    next.background = rest;
  }
  return next as T;
}
