import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

const CardInternal: ComponentConfig<Components["Card"]> = {
  fields: {
    title: {
      type: "text",
      contentEditable: true,
    },
    description: {
      type: "textarea",
      contentEditable: true,
    },
    imageUrl: {
      type: "text",
    },
    href: {
      type: "text",
    },
  },
  defaultProps: {
    title: "Title",
    description: "Description",
    imageUrl: "",
    href: "",
  },
  render: ({ title, description, imageUrl, href }) => {
    const CardContent = (
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          height: "100%",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
            }}
          />
        )}
        <div style={{ padding: "20px" }}>
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#333",
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "#666",
            }}
          >
            {description}
          </p>
        </div>
      </div>
    );

    if (href) {
      return (
        <Section>
          <a
            href={href}
            style={{
              textDecoration: "none",
              display: "block",
            }}
          >
            {CardContent}
          </a>
        </Section>
      );
    }

    return (
      <Section>
        {CardContent}
      </Section>
    );
  },
};

export const Card = withLayout(CardInternal);
