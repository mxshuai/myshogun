import React, { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ComponentConfig, DefaultComponentProps, ObjectField } from "@puckeditor/core";
import { spacingOptions } from "./options";

// Layout 字段类型
export type LayoutFieldProps = {
  padding?: string;
  spanCol?: number;
  spanRow?: number;
  grow?: boolean;
};

// WithLayout 类型包装
export type WithLayout<Props extends DefaultComponentProps> = Props & {
  layout?: LayoutFieldProps;
};

// Layout 组件字段定义
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
  },
};

// Layout 包装组件
type LayoutProps = WithLayout<{
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}>;

export const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ children, className, layout, style }, ref) => {
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
        {children}
      </div>
    );
  }
);

Layout.displayName = "Layout";

// withLayout 高阶组件
export function withLayout<
  ThisComponentConfig extends ComponentConfig<any> = ComponentConfig
>(componentConfig: ThisComponentConfig): ThisComponentConfig {
  // 保存原始的 resolveFields 函数（如果存在）
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
        ...componentConfig.defaultProps?.layout,
      },
    },
    resolveFields: (data, params) => {
      // 首先调用原始的 resolveFields（如果存在）
      let fields = originalResolveFields ? originalResolveFields(data, params) : { ...componentConfig.fields };
      
      // 然后根据父组件类型添加/修改 layout 字段
      if (params.parent?.type === "Grid") {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: {
              spanCol: layoutField.objectFields.spanCol,
              spanRow: layoutField.objectFields.spanRow,
              padding: layoutField.objectFields.padding,
            },
          },
        } as any;
      } else if (params.parent?.type === "Flex") {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: {
              grow: layoutField.objectFields.grow,
              padding: layoutField.objectFields.padding,
            },
          },
        } as any;
      } else {
        fields = {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: {
              padding: layoutField.objectFields.padding,
            },
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
