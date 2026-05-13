import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";

export const Button: ComponentConfig<Components["Button"]> = {
  fields: {
    label: {
      type: "text",
      placeholder: "Lorem ipsum...",
      contentEditable: true,
    },
    href: { type: "text" },
    variant: {
      type: "radio",
      options: [
        { label: "primary", value: "primary" },
        { label: "secondary", value: "secondary" },
      ],
    },
  },
  defaultProps: {
    label: "Button",
    href: "#",
    variant: "primary",
  },
  render: ({ href, variant, label, puck }) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: "#0070f3",
        color: "#ffffff",
        border: "none",
      },
      secondary: {
        backgroundColor: "#6c757d",
        color: "#ffffff",
        border: "none",
      },
    };

    return (
      <div>
        <a
          href={puck.isEditing ? "#" : href}
          style={{
            display: "inline-block",
            padding: "16px 32px",
            ...variantStyles[variant],
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 500,
            cursor: puck.isEditing ? "default" : "pointer",
            transition: "all 0.2s ease",
          }}
          tabIndex={puck.isEditing ? -1 : undefined}
        >
          {label}
        </a>
      </div>
    );
  },
};
