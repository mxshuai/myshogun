import React, { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ComponentConfig, DefaultComponentProps, ObjectField } from "@puckeditor/core";
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
  /** @deprecated 仅用于读取旧页面数据，已并入 sectionPadding */
  padding?: string;
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

/** 将已废弃的 layout.padding（仅上下）并入 sectionPadding，画布与导出共用 */
export function effectiveSectionSides(layout?: LayoutFieldProps): {
  margin: SectionSidesFields;
  padding: SectionSidesFields;
} {
  const m = layout?.sectionMargin;
  const p = layout?.sectionPadding;
  const legacy = (layout?.padding ?? "").trim();
  const legacyY =
    legacy && legacy !== "0" && legacy !== "0px" ? legacy : "";

  const top = normalizeSectionSide(p?.top);
  const bottom = normalizeSectionSide(p?.bottom);

  return {
    margin: {
      top: normalizeSectionSide(m?.top),
      right: normalizeSectionSide(m?.right),
      bottom: normalizeSectionSide(m?.bottom),
      left: normalizeSectionSide(m?.left),
    },
    padding: {
      top: top !== "0" ? top : legacyY || "0",
      right: normalizeSectionSide(p?.right),
      bottom: bottom !== "0" ? bottom : legacyY || "0",
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
    dimensions: dimensionsField,
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

const sectionSpacingFields = {
  sectionMargin: sectionSides("Section margin"),
  sectionPadding: sectionSides("Section padding"),
};

function layoutFieldsForParent(parentType: string | undefined) {
  if (parentType === "Columns" || parentType === "Grid") {
    return {
      spanCol: layoutField.objectFields.spanCol,
      spanRow: layoutField.objectFields.spanRow,
      dimensions: dimensionsField,
      ...sectionSpacingFields,
    };
  }
  if (parentType === "Flex") {
    return {
      grow: layoutField.objectFields.grow,
      dimensions: dimensionsField,
      ...sectionSpacingFields,
    };
  }
  return {
    dimensions: dimensionsField,
    ...sectionSpacingFields,
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
        grow: false,
        ...defaultLayoutSpacing,
        ...componentConfig.defaultProps?.layout,
      },
    },
    resolveFields: (data, params) => {
      let fields = originalResolveFields
        ? originalResolveFields(data, params)
        : { ...componentConfig.fields };

      if (
        params.parent?.type === "Columns" ||
        params.parent?.type === "Grid"
      ) {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: layoutFieldsForParent("Columns"),
          },
        } as any;
      } else if (params.parent?.type === "Flex") {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: layoutFieldsForParent("Flex"),
          },
        } as any;
      } else {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: layoutFieldsForParent(undefined),
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
