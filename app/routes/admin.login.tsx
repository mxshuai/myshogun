import { Form, redirect, useSearchParams } from "react-router";

import type { Route } from "./+types/admin.login";
import { adminLoginResponse } from "~/lib/server/auth.server";
import { getAdminApiKey } from "~/lib/server/env";

export async function loader() {
  if (!getAdminApiKey()) {
    throw redirect("/admin/shops");
  }
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const key = String(form.get("apiKey") ?? "");
  const next = String(form.get("next") ?? "/admin/shops");
  return adminLoginResponse(key, next);
}

export default function AdminLogin() {
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/admin/shops";

  return (
    <div style={{ maxWidth: 420, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Admin login</h1>
      <Form method="post">
        <input type="hidden" name="next" value={next} />
        <label style={{ display: "block", marginBottom: 8 }}>
          API key
          <input
            name="apiKey"
            type="password"
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <button type="submit">Sign in</button>
      </Form>
    </div>
  );
}
