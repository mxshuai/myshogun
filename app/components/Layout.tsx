import React, { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ComponentConfig, DefaultComponentProps, ObjectField } from "@puckeditor/core";
import { spacingOptions } from "./options";
import {
  SectionSpacingProvider,
  type SectionSpacingValue,
} from "./SectionSpacingContext";

function normalizeSectionSide(v: string | undefined): string {
  return (v ?? "").trim() || "0";
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
  padding?: string;
  spanCol?: number;
  spanRow?: number;
  grow?: boolean;
  dimensions?: LayoutDimensionsFields;
  /** false：侧边栏仅显示开关；true：展开 margin / padding 四边编辑 */
  sectionSpacingAdvanced?: boolean;
  sectionMargin?: SectionSidesFields;
  sectionPadding?: SectionSidesFields;
};

export type WithLayout<Props extends DefaultComponentProps> = Props & {
  layout?: LayoutFieldProps;
};

const dimensionsField = {
  type: "object" as const,
  label: "Dimensions",
  objectFields: {
    minHeight: {
      type: "number" as const,
      label: "Min Height (px)",
      min: 0,
    },
    maxWidth: {
      type: "number" as const,
      label: "Max Width (px)",
      min: 0,
    },
  },
};

const sectionSpacingToggleField = {
  type: "radio" as const,
  label: "Section spacing",
  options: [
    { label: "Default (0)", value: false },
    { label: "Custom margins & padding", value: true },
  ],
};

const sectionSides = (label: string) =>
  ({
    type: "object" as const,
    label,
    objectFields: {
      top: { type: "text" as const, label: "Top" },
      right: { type: "text" as const, label: "Right" },
      bottom: { type: "text" as const, label: "Bottom" },
      left: { type: "text" as const, label: "Left" },
    },
  }) satisfies ObjectField<SectionSidesFields>;

function resolveSectionLayout(layout?: LayoutFieldProps): SectionSpacingValue {
  const m = layout?.sectionMargin;
  const p = layout?.sectionPadding;
  const dim = layout?.dimensions;
  const maxW =
    dim?.maxWidth != null && dim.maxWidth > 0 ? `${dim.maxWidth}px` : undefined;
  const minH =
    dim?.minHeight != null && dim.minHeight > 0 ? `${dim.minHeight}px` : undefined;

  return {
    sectionMarginTop: normalizeSectionSide(m?.top),
    sectionMarginRight: normalizeSectionSide(m?.right),
    sectionMarginBottom: normalizeSectionSide(m?.bottom),
    sectionMarginLeft: normalizeSectionSide(m?.left),
    sectionPaddingTop: normalizeSectionSide(p?.top),
    sectionPaddingRight: normalizeSectionSide(p?.right),
    sectionPaddingBottom: normalizeSectionSide(p?.bottom),
    sectionPaddingLeft: normalizeSectionSide(p?.left),
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
  dimensions: { minHeight: 0, maxWidth: 1280 },
  sectionSpacingAdvanced: false,
  sectionMargin: { ...defaultSectionSides },
  sectionPadding: { ...defaultSectionSides },
} satisfies Partial<LayoutFieldProps>;

export const layoutField: ObjectField<LayoutFieldProps> = {
  type: "object",
  objectFields: {
    spanCol: {
      label: "Grid Columns",
      type: "number",
      min: 1,
      max: 12,
    },
    spanRow: {
      label: "Grid Rows",
      type: "number",
      min: 1,
      max: 12,
    },
    grow: {
      label: "Flex Grow",
      type: "radio",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
    padding: {
      type: "select",
      label: "Vertical Padding",
      options: [{ label: "0px", value: "0px" }, ...spacingOptions],
    },
    dimensions: dimensionsField,
    sectionSpacingAdvanced: sectionSpacingToggleField,
    sectionMargin: sectionSides("Section margin"),
    sectionPadding: sectionSides("Section padding"),
  },
};

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
          paddingTop: layout?.padding,
          paddingBottom: layout?.padding,
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

function layoutFieldsForParent(
  parentType: string | undefined,
  showSpacingSides: boolean
) {
  const spacingBlocks = showSpacingSides
    ? {
        sectionMargin: sectionSides("Section margin"),
        sectionPadding: sectionSides("Section padding"),
      }
    : {};

  if (parentType === "Grid") {
    return {
      spanCol: layoutField.objectFields.spanCol,
      spanRow: layoutField.objectFields.spanRow,
      padding: layoutField.objectFields.padding,
      dimensions: dimensionsField,
      sectionSpacingAdvanced: sectionSpacingToggleField,
      ...spacingBlocks,
    };
  }
  if (parentType === "Flex") {
    return {
      grow: layoutField.objectFields.grow,
      padding: layoutField.objectFields.padding,
      dimensions: dimensionsField,
      sectionSpacingAdvanced: sectionSpacingToggleField,
      ...spacingBlocks,
    };
  }
  return {
    padding: layoutField.objectFields.padding,
    dimensions: dimensionsField,
    sectionSpacingAdvanced: sectionSpacingToggleField,
    ...spacingBlocks,
  };
}

export function withLayout<
  ThisComponentConfig extends ComponentConfig<any> = ComponentConfig
>(componentConfig: ThisComponentConfig): ThisComponentConfig {
  const originalResolveFields = componentConfig.resolveFields;

  return {
    ...componentConfig,
    fields: {
      ...componentConfig.fields,
      layout: layoutField,
    },
    defaultProps: {
      ...componentConfig.defaultProps,
      layout: {
        spanCol: 1,
        spanRow: 1,
        padding: "0px",
        grow: false,
        ...defaultLayoutSpacing,
        ...componentConfig.defaultProps?.layout,
      },
    },
    resolveFields: (data, params) => {
      let fields = originalResolveFields
        ? originalResolveFields(data, params)
        : { ...componentConfig.fields };

      const layoutState = (data as { props?: { layout?: LayoutFieldProps } }).props
        ?.layout;
      const showSides = layoutState?.sectionSpacingAdvanced === true;

      if (params.parent?.type === "Grid") {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: layoutFieldsForParent("Grid", showSides),
          },
        } as any;
      } else if (params.parent?.type === "Flex") {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: layoutFieldsForParent("Flex", showSides),
          },
        } as any;
      } else {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: layoutFieldsForParent(undefined, showSides),
          },
        } as any;
      }

      return fields;
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
