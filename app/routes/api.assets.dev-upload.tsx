import { data } from "react-router";

import { resolveImageContentType } from "~/lib/image-mime";
import type { Route } from "./+types/api.assets.dev-upload";
import {
  MAX_IMAGE_BYTES,
  assertAllowedImageUpload,
  isOwnedUploadKey,
} from "~/lib/server/assets.server";
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
    const filename = key.split("/").pop() ?? "upload";
    const headerType = request.headers.get("Content-Type");
    const contentType = resolveImageContentType(filename, headerType);

    assertAllowedImageUpload({ contentType, size: body.length });

    if (!body.length || body.length > MAX_IMAGE_BYTES) {
      return data({ error: "Image must be between 1 byte and 10 MB" }, { status: 400 });
    }

    await writeDevUploadFile(key, body);
    return data({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return data({ error: message }, { status: 400 });
  }
}
