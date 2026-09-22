import type { Route } from "./+types/dev-uploads.splat";
import {
  guessContentType,
  readDevUploadFile,
} from "~/lib/server/dev/assets.dev";

export async function loader({ params }: Route.LoaderArgs) {
  const key = params["*"]?.trim() ?? "";
  if (!key) {
    throw new Response("Not Found", { status: 404 });
  }

  try {
    const body = await readDevUploadFile(key);
    if (!body) {
      throw new Response("Not Found", { status: 404 });
    }

    const filename = key.split("/").pop() ?? "file";
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": guessContentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    if (e instanceof Response) throw e;
    throw new Response("Not Found", { status: 404 });
  }
}
