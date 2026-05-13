import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";

export const Hero: ComponentConfig<Components["Hero"]> = {
  fields: {
    title: {
      type: "text",
      contentEditable: true,
    },
    subtitle: {
      type: "textarea",
      contentEditable: true,
    },
    buttonText: {
      type: "text",
      contentEditable: true,
    },
    buttonHref: {
      type: "text",
    },
    backgroundImage: {
      type: "text",
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
      ],
    },
  },
  defaultProps: {
    title: "Welcome to Our Website",
    subtitle: "We provide the best products and services to help you achieve your goals. Start exploring now!",
    buttonText: "Learn More",
    buttonHref: "#",
    backgroundImage: "",
    align: "center",
  },
  render: ({ title, subtitle, buttonText, buttonHref, backgroundImage, align }) => {
    return (
      <Section>
        <div
          style={{
            padding: "80px 20px",
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            textAlign: align,
            color: "#ffffff",
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: align === "center" ? "center" : "flex-start",
          }}
        >
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              margin: "0 0 20px 0",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: "1.25rem",
              margin: "0 0 32px 0",
              lineHeight: 1.6,
              opacity: 0.95,
            }}
          >
            {subtitle}
          </p>
          <a
            href={buttonHref}
            style={{
              display: "inline-block",
              padding: "16px 32px",
              backgroundColor: "#ffffff",
              color: "#667eea",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "1.125rem",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {buttonText}
          </a>
        </div>
      </Section>
    );
  },
};
