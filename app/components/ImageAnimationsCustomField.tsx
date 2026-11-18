"use client";

import { AutoField, type CustomField } from "@puckeditor/core";
import { useState } from "react";

import { InlineSwitch } from "./ui/inline-number-field";
import "./ui/inline-number-field.css";
import {
  defaultImageAnimationAdvanced,
  imageAnimationDelayOptions,
  imageAnimationDurationOptions,
  imageAnimationIterationOptions,
  mouseOverAnimationOptions,
  normalizeImageAnimations,
  scrollInViewAnimationOptions,
  type ImageAnimationAdvanced,
  type ImageAnimationDelay,
  type ImageAnimationDuration,
  type ImageAnimationIteration,
  type ImageAnimationsGroup,
} from "./image-animation-config";
import type { Components } from "./types";

function puckSelectField(
  label: string,
  options: readonly { label: string; value: string }[],
) {
  return {
    type: "select" as const,
    label,
    options: [...options],
  };
}

function AnimationSelect({
  label,
  options,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  options: readonly { label: string; value: string }[];
  value: string;
  readOnly?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <AutoField
      field={puckSelectField(label, options)}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  );
}

function AdvancedSettings({
  value,
  readOnly,
  onChange,
}: {
  value?: ImageAnimationAdvanced;
  readOnly?: boolean;
  onChange: (next: ImageAnimationAdvanced) => void;
}) {
  const [open, setOpen] = useState(false);
  const adv = { ...defaultImageAnimationAdvanced, ...value };

  const setAdv = (patch: Partial<ImageAnimationAdvanced>) => {
    onChange({ ...adv, ...patch });
  };

  return (
    <details
      className="visbuild-collapsible-object"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="visbuild-collapsible-object__summary">
        <span className="visbuild-collapsible-object__chevron" aria-hidden="true" />
        Advanced settings
      </summary>
      <div className="visbuild-collapsible-object__body visbuild-image-animations-field__advanced">
        <SelectRow
          label="Delay"
          options={imageAnimationDelayOptions}
          value={adv.delay}
          readOnly={readOnly}
          onChange={(delay) => setAdv({ delay: delay as ImageAnimationDelay })}
        />
        <SelectRow
          label="Duration"
          options={imageAnimationDurationOptions}
          value={adv.duration}
          readOnly={readOnly}
          onChange={(duration) =>
            setAdv({ duration: duration as ImageAnimationDuration })
          }
        />
        <SelectRow
          label="Iteration Count"
          options={imageAnimationIterationOptions}
          value={adv.iterationCount}
          readOnly={readOnly}
          onChange={(iterationCount) =>
            setAdv({ iterationCount: iterationCount as ImageAnimationIteration })
          }
        />
        <InlineSwitch
          label="Trigger once"
          checked={adv.triggerOnce}
          readOnly={readOnly}
          onChange={(triggerOnce) => setAdv({ triggerOnce })}
        />
      </div>
    </details>
  );
}

function SelectRow({
  label,
  options,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  options: readonly { label: string; value: string }[];
  value: string;
  readOnly?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <AutoField
      field={puckSelectField(label, options)}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  );
}

function ImageAnimationsEditor({
  value,
  onChange,
  readOnly,
}: {
  value: Components["Image"]["animations"];
  onChange: (value: Components["Image"]["animations"]) => void;
  readOnly?: boolean;
}) {
  const v = normalizeImageAnimations(value);

  const patch = (partial: Partial<ImageAnimationsGroup>) => {
    onChange({ ...v, ...partial });
  };

  return (
    <div className="visbuild-image-animations-field">
      <AnimationSelect
        label="Scroll in View"
        options={scrollInViewAnimationOptions}
        value={v.scrollInViewAnimation}
        readOnly={readOnly}
        onChange={(scrollInViewAnimation) => {
          patch({
            scrollInViewAnimation,
            scrollInViewAdvanced:
              scrollInViewAnimation === "none"
                ? undefined
                : { ...defaultImageAnimationAdvanced, ...v.scrollInViewAdvanced },
          });
        }}
      />
      {v.scrollInViewAnimation !== "none" ? (
        <AdvancedSettings
          value={v.scrollInViewAdvanced}
          readOnly={readOnly}
          onChange={(scrollInViewAdvanced) => patch({ scrollInViewAdvanced })}
        />
      ) : null}
      <AnimationSelect
        label="Mouse Over"
        options={mouseOverAnimationOptions}
        value={v.mouseOverAnimation}
        readOnly={readOnly}
        onChange={(mouseOverAnimation) => {
          patch({
            mouseOverAnimation,
            mouseOverAdvanced:
              mouseOverAnimation === "none"
                ? undefined
                : { ...defaultImageAnimationAdvanced, ...v.mouseOverAdvanced },
          });
        }}
      />
      {v.mouseOverAnimation !== "none" ? (
        <AdvancedSettings
          value={v.mouseOverAdvanced}
          readOnly={readOnly}
          onChange={(mouseOverAdvanced) => patch({ mouseOverAdvanced })}
        />
      ) : null}
    </div>
  );
}

export const imageAnimationsCustomField: CustomField<
  Components["Image"]["animations"]
> = {
  type: "custom",
  label: "Animations",
  render: ImageAnimationsEditor,
};