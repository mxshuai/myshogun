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
  /** 开 = 有声。默认 false，即静音。 */
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

function pick<T>(nested: T | undefined, fallback: T): T {
  if (nested !== undefined) return nested;
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

  return {
    main: {
      entireContainerClickable: pick(
        nestedMain.entireContainerClickable,
        defaultContainerMain.entireContainerClickable,
      ),
      containerUrl: pick(
        nestedMain.containerUrl,
        defaultContainerMain.containerUrl,
      ),
      openInNewWindow: pick(
        nestedMain.openInNewWindow,
        defaultContainerMain.openInNewWindow,
      ),
      verticalAlign: pick(
        nestedMain.verticalAlign,
        defaultContainerMain.verticalAlign,
      ),
    },
    background: {
      backgroundType: pick(
        nestedBackground.backgroundType,
        defaultContainerBackground.backgroundType,
      ),
      backgroundImage: pick(
        nestedBackground.backgroundImage,
        defaultContainerBackground.backgroundImage,
      ),
      backgroundColor: pick(
        nestedBackground.backgroundColor,
        defaultContainerBackground.backgroundColor,
      ),
      backgroundVideo: pick(
        nestedBackground.backgroundVideo,
        defaultContainerBackground.backgroundVideo,
      ),
      sound: pick(nestedBackground.sound, defaultContainerBackground.sound),
      backgroundSize: pick(
        nestedBackground.backgroundSize,
        defaultContainerBackground.backgroundSize,
      ),
      backgroundWidth: nestedBackground.backgroundWidth,
      backgroundHeight: nestedBackground.backgroundHeight,
      backgroundRepeat: pick(
        nestedBackground.backgroundRepeat,
        defaultContainerBackground.backgroundRepeat,
      ),
      horizontalPosition: pick(
        nestedBackground.horizontalPosition,
        defaultContainerBackground.horizontalPosition,
      ),
      horizontalPositionValue: pick(
        nestedBackground.horizontalPositionValue,
        defaultContainerBackground.horizontalPositionValue,
      ),
      verticalPosition: pick(
        nestedBackground.verticalPosition,
        defaultContainerBackground.verticalPosition,
      ),
      verticalPositionValue: pick(
        nestedBackground.verticalPositionValue,
        defaultContainerBackground.verticalPositionValue,
      ),
      responsiveImage: pick(
        nestedBackground.responsiveImage,
        defaultContainerBackground.responsiveImage,
      ),
      loading: pick(
        nestedBackground.loading,
        defaultContainerBackground.loading,
      ),
      parallaxEffect: pick(
        nestedBackground.parallaxEffect,
        defaultContainerBackground.parallaxEffect,
      ),
    },
  };
}
