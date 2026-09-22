import { data } from "react-router";

import type { Route } from "./+types/api.assets.dev-upload";
import { MAX_IMAGE_BYTES, isOwnedUploadKey } from "~/lib/server/assets.server";
import { requireShopSession } from "~/lib/server/auth.server";
import { writeDevUploadFile } from "~/lib/server/dev/assets.dev";

export async function action({ request, params }: Route.ActionArgs) {
  const session = requireShopSession(request);

  if (request.method !== "PUT") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const key = params["*"]?.trim() ?? "";
  if (!key || !isOwnedUploadKey(key, session.shopId)) {
    return data({ error: "Invalid upload key" }, { status: 403 });
  }

  try {
    const body = Buffer.from(await request.arrayBuffer());
    if (!body.length || body.length > MAX_IMAGE_BYTES) {
      return data({ error: "Image must be between 1 byte and 10 MB" }, { status: 400 });
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
