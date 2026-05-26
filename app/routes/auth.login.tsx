import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";

import { redirectEmbeddedLoginToApp } from "~/lib/shopify-embedded-context.server";
import { loginWithEmbeddedExitIframe } from "~/lib/shopify-login-redirect.server";
import { login } from "~/shopify.server";
import { loginErrorMessage } from "~/routes/auth.login.error.server";

function enrichRequestWithFormParams(
  request: Request,
  formData: FormData,
): Request {
  const url = new URL(request.url);
  for (const key of ["shop", "host", "embedded", "locale"] as const) {
    const value = formData.get(key);
    if (typeof value === "string" && value) {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString(), request);
}

async function runLogin(request: Request) {
  const result = await loginWithEmbeddedExitIframe(request, login);
  return loginErrorMessage(result as Awaited<ReturnType<typeof login>> | null);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  redirectEmbeddedLoginToApp(request);

  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    const errors = await runLogin(request);
    return {
      apiKey,
      errors,
      hiddenFields: hiddenFieldsFromUrl(url),
    };
  }

  return {
    apiKey,
    errors: {},
    hiddenFields: hiddenFieldsFromUrl(url),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const formData = await request.formData();
  const loginRequest = enrichRequestWithFormParams(request, formData);

  redirectEmbeddedLoginToApp(loginRequest);

  const errors = await runLogin(loginRequest);
  return {
    apiKey,
    errors,
    hiddenFields: hiddenFieldsFromUrl(new URL(loginRequest.url)),
  };
}

function hiddenFieldsFromUrl(url: URL): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of ["host", "embedded", "locale"] as const) {
    const value = url.searchParams.get(key);
    if (value) {
      fields[key] = value;
    }
  }
  return fields;
}

export default function AuthLogin() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const data = actionData ?? loaderData;
  const [shop, setShop] = useState("");
  const { apiKey, errors, hiddenFields } = data;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <s-section heading="Log in">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            />
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
