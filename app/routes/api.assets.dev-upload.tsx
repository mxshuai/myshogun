import { data } from "react-router";

import type { Route } from "./+types/api.assets.dev-upload";
import { requireShopSession } from "~/lib/server/auth.server";
import { writeDevUploadFile } from "~/lib/server/dev/assets.dev";

export async function action({ request, params }: Route.ActionArgs) {
  requireShopSession(request);

  if (request.method !== "PUT") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const key = params["*"]?.trim() ?? "";
  if (!key) {
    return data({ error: "Missing upload key" }, { status: 400 });
  }

  try {
    const body = Buffer.from(await request.arrayBuffer());
    if (!body.length) {
      return data({ error: "Empty upload body" }, { status: 400 });
    }
    await writeDevUploadFile(key, body);
    return data({ ok: true });
  } catch (e) {
    return data(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
