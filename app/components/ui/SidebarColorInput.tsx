import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  formatSidebarColor,
  hsvToRgb,
  parseSidebarColor,
  rgbToHsv,
  type ParsedSidebarColor,
} from "./sidebar-color-utils";

import "./sidebar-color-input.css";

export type SidebarColorInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  /** 无法解析时的回退色 */
  fallback?: string;
  disabled?: boolean;
  /** 可选前缀标签，如 Text 的 Ab / 背景桶图标位 */
  prefix?: ReactNode;
  /** 同一字段在重新渲染后保持弹框打开 */
  fieldKey?: string;
};

let openColorFieldKey: string | null = null;

type PickerState = {
  h: number;
  s: number;
  v: number;
  a: number;
};

function toPickerState(color: ParsedSidebarColor): PickerState {
  const hsv = rgbToHsv(color.r, color.g, color.b);
  return { ...hsv, a: color.a };
}

function pickerRgb(state: PickerState) {
  return { ...hsvToRgb(state.h, state.s, state.v), a: state.a };
}

function ColorPickerPopover({
  value,
  fallback,
  anchor,
  anchorRef,
  onChange,
  onClose,
}: {
  value?: string | null;
  fallback: string;
  anchor: DOMRect;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const parsed = parseSidebarColor(value, fallback);
  const [state, setState] = useState<PickerState>(() => toPickerState(parsed));
  const [hexDraft, setHexDraft] = useState(parsed.hex.toUpperCase());
  const dragging = useRef(false);

  useEffect(() => {
    if (dragging.current) return;
    const next = parseSidebarColor(value, fallback);
    setState(toPickerState(next));
    setHexDraft(next.hex.toUpperCase());
  }, [value, fallback]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath();
      if (panelRef.current && path.includes(panelRef.current)) return;
      if (anchorRef.current && path.includes(anchorRef.current)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const apply = (next: PickerState, hex?: string) => {
    setState(next);
    const rgb = pickerRgb(next);
    setHexDraft((hex ?? formatSidebarColor({ ...rgb, a: 100 }).slice(1)).toUpperCase());
    onChange(formatSidebarColor(rgb));
  };

  const drag = (
    event: ReactPointerEvent<HTMLElement>,
    update: (clientX: number, clientY: number, rect: DOMRect) => void,
  ) => {
    const target = event.currentTarget;
    const move = (clientX: number, clientY: number) => {
      update(clientX, clientY, target.getBoundingClientRect());
    };
    dragging.current = true;
    target.setPointerCapture(event.pointerId);
    move(event.clientX, event.clientY);
    const onMove = (pointerEvent: PointerEvent) => {
      move(pointerEvent.clientX, pointerEvent.clientY);
    };
    const stop = () => {
      dragging.current = false;
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
  };

  const rgb = pickerRgb(state);
  const hueColor = `hsl(${state.h} 100% 50%)`;
  const solid = `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
  const top = Math.min(anchor.bottom + 8, window.innerHeight - 340);
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - 268);

  return createPortal(
    <div
      ref={panelRef}
      className="visbuild-color-popover"
      style={{ top, left }}
      role="dialog"
      aria-label="Color picker"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className="visbuild-color-popover__sv"
        style={{ backgroundColor: hueColor }}
        onPointerDown={(event) => {
          event.preventDefault();
          drag(event, (clientX, clientY, rect) => {
            const s = clamp01((clientX - rect.left) / rect.width);
            const v = 1 - clamp01((clientY - rect.top) / rect.height);
            apply({ ...state, s, v });
          });
        }}
      >
        <span
          className="visbuild-color-popover__sv-thumb"
          style={{ left: `${state.s * 100}%`, top: `${(1 - state.v) * 100}%` }}
        />
      </div>
      <div
        className="visbuild-color-popover__hue"
        onPointerDown={(event) => {
          event.preventDefault();
          drag(event, (clientX, _clientY, rect) => {
            const h = clamp01((clientX - rect.left) / rect.width) * 360;
            apply({ ...state, h });
          });
        }}
      >
        <span
          className="visbuild-color-popover__bar-thumb"
          style={{ left: `${(state.h / 360) * 100}%` }}
        />
      </div>
      <div className="visbuild-color-popover__alpha-row">
        <div
          className="visbuild-color-popover__alpha"
          onPointerDown={(event) => {
            event.preventDefault();
            drag(event, (clientX, _clientY, rect) => {
              const a = Math.round(clamp01((clientX - rect.left) / rect.width) * 100);
              apply({ ...state, a });
            });
          }}
        >
          <span
            className="visbuild-color-popover__alpha-fill"
            style={{
              background: `linear-gradient(to right, transparent, ${solid})`,
            }}
          />
          <span
            className="visbuild-color-popover__bar-thumb"
            style={{ left: `${state.a}%` }}
          />
        </div>
        <span className="visbuild-color-popover__preview">
          <span
            className="visbuild-color-popover__preview-fill"
            style={{ backgroundColor: formatSidebarColor(rgb) }}
          />
        </span>
      </div>
      <div className="visbuild-color-popover__fields">
        <label>
          <input
            value={hexDraft}
            spellCheck={false}
            aria-label="Hex"
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
              setHexDraft(raw.toUpperCase());
              if (/^[0-9a-fA-F]{6}$/.test(raw)) {
                const next = parseSidebarColor(`#${raw}`, fallback);
                const hsv = rgbToHsv(next.r, next.g, next.b);
                apply({ ...hsv, a: state.a }, raw);
              }
            }}
          />
          <span>Hex</span>
        </label>
        {(
          [
            ["R", rgb.r],
            ["G", rgb.g],
            ["B", rgb.b],
          ] as const
        ).map(([label, channel]) => (
          <label key={label}>
            <input
              inputMode="numeric"
              aria-label={label}
              value={String(channel)}
              onChange={(event) => {
                const raw = event.target.value.replace(/\D/g, "");
                if (raw === "") return;
                const next = Math.max(0, Math.min(255, Number(raw)));
                const rgbNext = {
                  r: label === "R" ? next : rgb.r,
                  g: label === "G" ? next : rgb.g,
                  b: label === "B" ? next : rgb.b,
                };
                const hsv = rgbToHsv(rgbNext.r, rgbNext.g, rgbNext.b);
                apply({ ...hsv, a: state.a });
              }}
            />
            <span>{label}</span>
          </label>
        ))}
        <label>
          <input
            inputMode="numeric"
            aria-label="A"
            value={String(state.a)}
            onChange={(event) => {
              const raw = event.target.value.replace(/\D/g, "");
              if (raw === "") return;
              apply({ ...state, a: Math.max(0, Math.min(100, Number(raw))) });
            }}
          />
          <span>A</span>
        </label>
      </div>
    </div>,
    document.body,
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function SidebarColorInput({
  value,
  onChange,
  fallback = "#000000",
  disabled = false,
  prefix,
  fieldKey,
}: SidebarColorInputProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(() => fieldKey != null && openColorFieldKey === fieldKey);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const labelId = useId();
  const parsed = parseSidebarColor(value, fallback);

  useEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor(rect);
  }, [open]);

  const close = () => {
    if (fieldKey != null && openColorFieldKey === fieldKey) openColorFieldKey = null;
    setOpen(false);
  };

  const toggle = () => {
    if (disabled) return;
    if (open) {
      close();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (fieldKey != null) openColorFieldKey = fieldKey;
    setAnchor(rect);
    setOpen(true);
  };

  return (
    <div className="visbuild-sidebar-color">
      {prefix ? (
        <span className="visbuild-sidebar-color__prefix">{prefix}</span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        className="visbuild-sidebar-color__picker"
        disabled={disabled}
        aria-label="Color picker"
        aria-expanded={open}
        aria-controls={labelId}
        onClick={toggle}
      >
        <span className="visbuild-sidebar-color__swatch">
          <span
            className="visbuild-sidebar-color__swatch-fill"
            style={{ backgroundColor: formatSidebarColor(parsed) }}
          />
        </span>
      </button>
      {open && anchor && typeof document !== "undefined" ? (
        <ColorPickerPopover
          value={value}
          fallback={fallback}
          anchor={anchor}
          anchorRef={buttonRef}
          onChange={onChange}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

/** Text 等场景：文字色 + 背景色并排 */
export function SidebarColorPair({
  textValue,
  backgroundValue,
  onTextChange,
  onBackgroundChange,
  textFallback = "#374151",
  backgroundFallback = "#ffffff",
  disabled = false,
}: {
  textValue?: string | null;
  backgroundValue?: string | null;
  onTextChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
  textFallback?: string;
  backgroundFallback?: string;
  disabled?: boolean;
}) {
  return (
    <div className="visbuild-sidebar-color-pair">
      <SidebarColorInput
        value={textValue}
        onChange={onTextChange}
        fallback={textFallback}
        disabled={disabled}
        prefix={<span className="visbuild-sidebar-color__abbr">Ab</span>}
      />
      <SidebarColorInput
        value={backgroundValue}
        onChange={onBackgroundChange}
        fallback={backgroundFallback}
        disabled={disabled}
        prefix={
          <span
            className="visbuild-sidebar-color__abbr visbuild-sidebar-color__abbr--bg"
            title="Background"
          >
            Bg
          </span>
        }
      />
    </div>
  );
}
