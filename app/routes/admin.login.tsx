import { Form, redirect, useLoaderData, useSearchParams } from "react-router";

import type { Route } from "./+types/admin.login";
import { adminLoginResponse } from "~/lib/server/auth.server";
import { getAdminApiKey } from "~/lib/server/env";

export async function loader() {
  // 未配置 ADMIN_API_KEY 时也允许打开登录页，避免在生产环境出现循环跳转到其他管理页。
  getAdminApiKey();
  const legacy = process.env.ADMIN_AUTH_MODE?.trim().toLowerCase() === "legacy";
  if (!legacy) {
    return redirect("/auth/shopify/start?next=%2Fadmin%2Fshops");
  }
  return {
    legacy,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const key = String(form.get("apiKey") ?? "").trim();
  const next = String(form.get("next") ?? "/admin/shops");
  return adminLoginResponse(key, next);
}

export default function AdminLogin() {
  const { legacy } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/admin/shops";

  if (!legacy) return null;

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
