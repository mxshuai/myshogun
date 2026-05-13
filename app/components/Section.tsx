import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";

export type SectionProps = {
  className?: string;
  children: ReactNode;
  maxWidth?: string;
  style?: CSSProperties;
};

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ children, className, maxWidth = "1280px", style = {} }, ref) => {
    return (
      <div
        className={className}
        style={{
          paddingLeft: "16px",
          paddingRight: "16px",
          ...style,
        }}
        ref={ref}
      >
        <div style={{ maxWidth, margin: "0 auto", width: "100%" }}>
          {children}
        </div>
      </div>
    );
  }
);

Section.displayName = "Section";
