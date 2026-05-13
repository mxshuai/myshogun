import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

const sizeOptions = [
  { value: "xxxl", label: "XXXL" },
  { value: "xxl", label: "XXL" },
  { value: "xl", label: "XL" },
  { value: "l", label: "L" },
  { value: "m", label: "M" },
  { value: "s", label: "S" },
  { value: "xs", label: "XS" },
];

const levelOptions = [
  { label: "", value: "" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
];

const HeadingInternal: ComponentConfig<Components["Heading"]> = {
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      options: sizeOptions,
    },
    level: {
      type: "select",
      options: levelOptions,
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
    layout: {
      padding: "8px",
    },
  },
  render: ({ align, text, size, level }) => {
    const sizeMap: Record<string, string> = {
      xxxl: "3.5rem",
      xxl: "3rem",
      xl: "2.5rem",
      l: "2rem",
      m: "1.5rem",
      s: "1.25rem",
      xs: "1rem",
    };

    const HeadingTag = `h${level || 2}` as keyof React.JSX.IntrinsicElements;

    return (
      <Section>
        <HeadingTag
          style={{
            fontSize: sizeMap[size],
            margin: 0,
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              display: "block",
              textAlign: align,
              width: "100%",
            }}
          >
            {text}
          </span>
        </HeadingTag>
      </Section>
    );
  },
};

export const Heading = withLayout(HeadingInternal);
