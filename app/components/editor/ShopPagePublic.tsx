"use client";

import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

import { config } from "../../../visbuild.config";

function stripPublicRootProps(data: Data): Data {
  const props = { ...(data.root?.props as Record<string, unknown>) };
  delete props.pagePath;
  return {
    ...data,
    root: { ...data.root, props },
  };
}

export function ShopPagePublic({ data }: { data: Data }) {
  return <Render config={config} data={stripPublicRootProps(data)} />;
}
