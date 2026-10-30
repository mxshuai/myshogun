import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import {
  heroButtonStyle,
  heroShellStyle,
  heroSubtitleStyle,
  heroTitleStyle,
} from "./hero-styles";

export const Hero: ComponentConfig<Components["Hero"]> = {
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
        title: {
          type: "text",
          label: "Title",
          contentEditable: true,
        },
        subtitle: {
          type: "textarea",
          label: "Subtitle",
          contentEditable: true,
        },
        buttonText: {
          type: "text",
          label: "Button text",
          contentEditable: true,
        },
        buttonHref: {
          type: "text",
          label: "Button url",
        },
        backgroundImage: {
          type: "text",
          label: "Background image",
        },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
        },
      },
    },
  },
  defaultProps: {
    main: {
      title: "Welcome to Our Website",
      subtitle: "We provide the best products and services to help you achieve your goals. Start exploring now!",
      buttonText: "Learn More",
      buttonHref: "#",
      backgroundImage: "",
      align: "center",
    },
  },
  render: (props) => {
    const {
      title,
      subtitle,
      buttonText,
      buttonHref,
      backgroundImage,
      align,
    } = props.main ?? {
      title: "Welcome to Our Website",
      subtitle: "",
      buttonText: "Learn More",
      buttonHref: "#",
      backgroundImage: "",
      align: "center" as const,
    };
    return (
      <Section>
        <div
          className="visbuild-hero"
          style={heroShellStyle(align, backgroundImage ?? "")}
        >
          <h1 style={heroTitleStyle}>{title}</h1>
          <p style={heroSubtitleStyle}>{subtitle}</p>
          <a
            href={buttonHref}
            style={heroButtonStyle}
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
