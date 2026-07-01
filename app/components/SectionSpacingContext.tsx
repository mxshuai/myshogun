import { createContext, useContext, type ReactNode } from "react";

/** Section 外边距 / 内边距四边 + 尺寸（与 Layout 下发一致） */
export type SectionSpacingValue = {
  sectionMarginTop?: string;
  sectionMarginRight?: string;
  sectionMarginBottom?: string;
  sectionMarginLeft?: string;
  sectionPaddingTop?: string;
  sectionPaddingRight?: string;
  sectionPaddingBottom?: string;
  sectionPaddingLeft?: string;
  /** 外层 min-height，有值时才应用 */
  sectionMinHeight?: string;
  /** 内层 max-width，有值时才应用 */
  sectionMaxWidth?: string;
};

const SectionSpacingContext = createContext<SectionSpacingValue>({});

export function SectionSpacingProvider({
  value,
  children,
}: {
  value: SectionSpacingValue;
  children: ReactNode;
}) {
  return (
    <SectionSpacingContext.Provider value={value}>
      {children}
    </SectionSpacingContext.Provider>
  );
}

export function useSectionSpacing() {
  return useContext(SectionSpacingContext);
}
