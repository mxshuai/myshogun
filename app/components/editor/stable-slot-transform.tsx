import type { CSSProperties, ElementType, ReactNode } from "react";
import { DropZone, type FieldTransforms } from "@puckeditor/core";

type SlotHostProps = {
  allow?: string[];
  disallow?: string[];
  zone?: string;
  className?: string;
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"] | number;
  collisionAxis?: "x" | "y" | "dynamic";
  as?: ElementType;
};

type SlotSnapshot = {
  zone: string;
  allow?: string[];
  disallow?: string[];
};

type StableSlotComponent = {
  (props?: SlotHostProps): ReactNode;
  displayName?: string;
};

type SlotHost = {
  Component: StableSlotComponent;
  snapshot: SlotSnapshot;
};

/**
 * Puck 默认会在每次重算字段时 new 一个 Slot 函数。
 * 子组件放在别的组件 Slot 里时，输入一个字就会换掉这个函数，
 * React 把整棵 Slot 卸掉再挂上，画布输入框因此失焦。
 * 同一个 zone 始终返回同一个组件，内容仍从编辑器 store 读取。
 */
const hosts = new Map<string, SlotHost>();

function getStableSlot(key: string, snapshot: SlotSnapshot) {
  let host = hosts.get(key);
  if (!host) {
    host = {
      snapshot,
      Component(props?: SlotHostProps) {
        const snap = host!.snapshot;
        const { allow, disallow, zone: _zone, ...rest } = props ?? {};
        return (
          <DropZone
            {...rest}
            zone={snap.zone}
            allow={allow ?? snap.allow}
            disallow={disallow ?? snap.disallow}
          />
        );
      },
    };
    host.Component.displayName = "StableSlot";
    hosts.set(key, host);
  } else {
    host.snapshot = snapshot;
  }
  return host.Component;
}

export const stableSlotFieldTransforms: FieldTransforms = {
  slot: ({ componentId, propPath, field }) => {
    const slotField = field as { allow?: string[]; disallow?: string[] };
    return getStableSlot(`${componentId}:${propPath}`, {
      zone: propPath,
      allow: slotField.allow ? [...slotField.allow] : undefined,
      disallow: slotField.disallow ? [...slotField.disallow] : undefined,
    });
  },
};
