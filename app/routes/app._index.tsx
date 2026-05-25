import { redirect } from "react-router";

import type { Route } from "./+types/app._index";

export async function loader(_args: Route.LoaderArgs) {
  throw redirect("/app/pages");
}
