import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

import { config } from "../../visbuild.config";

export function VisbuildRender({ data }: { data: Data }) {
  return <Render config={config} data={data} />;
}
