import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import { useSectionSpacing } from "./SectionSpacingContext";

export type SectionProps = {
  className?: string;
  children: ReactNode;
  maxWidth?: string;
  style?: CSSProperties;
  /** 覆盖 Layout 下发的 Section 样式 */
  sectionMarginTop?: string;
  sectionMarginRight?: string;
  sectionMarginBottom?: string;
  sectionMarginLeft?: string;
  sectionPaddingTop?: string;
  sectionPaddingRight?: string;
  sectionPaddingBottom?: string;
  sectionPaddingLeft?: string;
  sectionMinHeight?: string;
};

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  (
    {
      children,
      className,
      maxWidth: maxWidthProp,
      style = {},
      sectionMarginTop: mtProp,
      sectionMarginRight: mrProp,
      sectionMarginBottom: mbProp,
      sectionMarginLeft: mlProp,
      sectionPaddingTop: ptProp,
      sectionPaddingRight: prProp,
      sectionPaddingBottom: pbProp,
      sectionPaddingLeft: plProp,
      sectionMinHeight: minHProp,
    },
    ref
  ) => {
    const ctx = useSectionSpacing();
    const marginTop = mtProp ?? ctx.sectionMarginTop ?? "0";
    const marginRight = mrProp ?? ctx.sectionMarginRight ?? "0";
    const marginBottom = mbProp ?? ctx.sectionMarginBottom ?? "0";
    const marginLeft = mlProp ?? ctx.sectionMarginLeft ?? "0";
    const paddingTop = ptProp ?? ctx.sectionPaddingTop ?? "0";
    const paddingRight = prProp ?? ctx.sectionPaddingRight ?? "0";
    const paddingBottom = pbProp ?? ctx.sectionPaddingBottom ?? "0";
    const paddingLeft = plProp ?? ctx.sectionPaddingLeft ?? "0";
    const minHeight = minHProp ?? ctx.sectionMinHeight;
    const resolvedMaxWidth =
      maxWidthProp ??
      (ctx.sectionMaxWidth != null && ctx.sectionMaxWidth !== ""
        ? ctx.sectionMaxWidth
        : undefined) ??
      "1280px";

    return (
      <div
        className={className}
        style={{
          marginTop,
          marginRight,
          marginBottom,
          marginLeft,
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          ...(minHeight ? { minHeight } : {}),
          ...style,
        }}
        ref={ref}
      >
        <div
          style={{
            maxWidth: resolvedMaxWidth,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

Section.displayName = "Section";
