import React, { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ComponentConfig, DefaultComponentProps } from "@puckeditor/core";
import {
  SectionSpacingProvider,
  type SectionSpacingValue,
} from "./SectionSpacingContext";
import { layoutSidebarField } from "./ui/layout-sidebar-fields";

function normalizeSectionSide(v: string | undefined): string {
  const raw = (v ?? "").trim() || "0";
  if (raw === "0") return "0";
  if (/^-?\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  return raw;
}

export type SectionSidesFields = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
};

export type LayoutDimensionsFields = {
  minHeight?: number;
  maxWidth?: number;
};

/** Puck layout 字段（嵌套分组：Dimensions、Section margin/padding） */
export type LayoutFieldProps = {
  spanCol?: number;
  spanRow?: number;
  grow?: boolean;
  dimensions?: LayoutDimensionsFields;
  sectionMargin?: SectionSidesFields;
  sectionPadding?: SectionSidesFields;
};

export type WithLayout<Props extends DefaultComponentProps> = Props & {
  layout?: LayoutFieldProps;
};

/** 读取 section margin / padding。空值规范为 "0"。 */
export function effectiveSectionSides(layout?: LayoutFieldProps): {
  margin: SectionSidesFields;
  padding: SectionSidesFields;
} {
  const m = layout?.sectionMargin;
  const p = layout?.sectionPadding;

  return {
    margin: {
      top: normalizeSectionSide(m?.top),
      right: normalizeSectionSide(m?.right),
      bottom: normalizeSectionSide(m?.bottom),
      left: normalizeSectionSide(m?.left),
    },
    padding: {
      top: normalizeSectionSide(p?.top),
      right: normalizeSectionSide(p?.right),
      bottom: normalizeSectionSide(p?.bottom),
      left: normalizeSectionSide(p?.left),
    },
  };
}

function resolveSectionLayout(layout?: LayoutFieldProps): SectionSpacingValue {
  const { margin, padding } = effectiveSectionSides(layout);
  const dim = layout?.dimensions;
  const maxW =
    dim?.maxWidth != null && dim.maxWidth > 0 ? `${dim.maxWidth}px` : undefined;
  const minH =
    dim?.minHeight != null && dim.minHeight > 0 ? `${dim.minHeight}px` : undefined;

  return {
    sectionMarginTop: margin.top!,
    sectionMarginRight: margin.right!,
    sectionMarginBottom: margin.bottom!,
    sectionMarginLeft: margin.left!,
    sectionPaddingTop: padding.top!,
    sectionPaddingRight: padding.right!,
    sectionPaddingBottom: padding.bottom!,
    sectionPaddingLeft: padding.left!,
    sectionMinHeight: minH,
    sectionMaxWidth: maxW,
  };
}

const defaultSectionSides = {
  top: "0",
  right: "0",
  bottom: "0",
  left: "0",
} satisfies SectionSidesFields;

/** 供各组件 defaultProps.layout 与 withLayout 合并 */
export const defaultLayoutSpacing = {
  dimensions: { minHeight: 0 },
  sectionMargin: { ...defaultSectionSides },
  sectionPadding: { ...defaultSectionSides },
} satisfies Partial<LayoutFieldProps>;

type LayoutProps = WithLayout<{
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}>;

export const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ children, className, layout, style }, ref) => {
    const sectionValue = resolveSectionLayout(layout);

    return (
      <div
        className={className}
        style={{
          gridColumn: layout?.spanCol
            ? `span ${Math.max(Math.min(layout.spanCol, 12), 1)}`
            : undefined,
          gridRow: layout?.spanRow
            ? `span ${Math.max(Math.min(layout.spanRow, 12), 1)}`
            : undefined,
          flex: layout?.grow ? "1 1 0" : undefined,
          ...style,
        }}
        ref={ref}
      >
        <SectionSpacingProvider value={sectionValue}>{children}</SectionSpacingProvider>
      </div>
    );
  }
);

Layout.displayName = "Layout";

export function withLayout<
  ThisComponentConfig extends ComponentConfig<any> = ComponentConfig
>(componentConfig: ThisComponentConfig): ThisComponentConfig {
  const originalResolveFields = componentConfig.resolveFields;

  return {
    ...componentConfig,
    fields: {
      ...componentConfig.fields,
      layout: layoutSidebarField,
    },
    defaultProps: {
      ...componentConfig.defaultProps,
      layout: {
        spanCol: 1,
        spanRow: 1,
        grow: false,
        ...defaultLayoutSpacing,
        ...componentConfig.defaultProps?.layout,
      },
    },
    resolveFields: (data, params) => {
      const fields = originalResolveFields
        ? originalResolveFields(data, params)
        : { ...componentConfig.fields };

      return {
        ...fields,
        layout: layoutSidebarField,
      };
    },
    inline: true,
    render: (props: any) => (
      <Layout
        className="Layout"
        layout={props.layout as LayoutFieldProps}
        ref={props.puck?.dragRef}
      >
        {componentConfig.render(props)}
      </Layout>
    ),
  } as ThisComponentConfig;
}
