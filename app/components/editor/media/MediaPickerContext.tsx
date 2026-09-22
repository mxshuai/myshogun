"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { MediaPickerModal } from "./MediaPickerModal";
import type { ImageValue } from "./types";

type MediaPickerContextValue = {
  shopDomain: string;
  openPicker: (onSelect: (value: ImageValue) => void) => void;
};

const MediaPickerContext = createContext<MediaPickerContextValue | null>(null);

export function MediaPickerProvider({
  shopDomain,
  children,
}: {
  shopDomain: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [onSelectRef, setOnSelectRef] = useState<
    ((value: ImageValue) => void) | null
  >(null);

  const value = useMemo<MediaPickerContextValue>(
    () => ({
      shopDomain,
      openPicker: (onSelect) => {
        setOnSelectRef(() => onSelect);
        setOpen(true);
      },
    }),
    [shopDomain],
  );

  return (
    <MediaPickerContext.Provider value={value}>
      {children}
      {open && onSelectRef ? (
        <MediaPickerModal
          shopDomain={shopDomain}
          onSelect={(next) => {
            onSelectRef(next);
            setOpen(false);
            setOnSelectRef(null);
          }}
          onClose={() => {
            setOpen(false);
            setOnSelectRef(null);
          }}
        />
      ) : null}
    </MediaPickerContext.Provider>
  );
}

export function useMediaPicker(): MediaPickerContextValue {
  const ctx = useContext(MediaPickerContext);
  if (!ctx) {
    throw new Error("useMediaPicker must be used within MediaPickerProvider");
  }
  return ctx;
}
