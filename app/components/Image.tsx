import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

const ImageInternal: ComponentConfig<Components["Image"]> = {
  fields: {
    src: {
      type: "text",
    },
    alt: {
      type: "text",
    },
    width: {
      type: "text",
    },
    height: {
      type: "text",
    },
  },
  defaultProps: {
    src: "https://via.placeholder.com/800x400",
    alt: "Example image",
    width: "100%",
    height: "auto",
  },
  render: ({ src, alt, width, height }) => {
    return (
      <Section>
        <img
          src={src}
          alt={alt}
          style={{
            width: width || "100%",
            height: height || "auto",
            display: "block",
            borderRadius: "8px",
          }}
        />
      </Section>
    );
  },
};

export const Image = withLayout(ImageInternal);
