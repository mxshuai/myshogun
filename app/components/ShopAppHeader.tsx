"use client";

import { useNavigate } from "react-router";

import { shopPagesPath } from "~/lib/shop-url";
import { HIDE_SHOPIFY_ADMIN_UI, isShopHiddenFromSwitcher } from "~/lib/ui-flags";

export type ShopHeaderOption = {
  domain: string;
  name: string;
};

export function ShopAppHeader({
  currentDomain,
  shops,
}: {
  currentDomain: string;
  shops: ShopHeaderOption[];
}) {
  const navigate = useNavigate();
  const currentHidden = isShopHiddenFromSwitcher(currentDomain);
  const switcherShops = shops.filter((s) => !isShopHiddenFromSwitcher(s.domain));

  const selectStyle = {
    maxWidth: 320,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    fontSize: "0.875rem",
    background: "#fff",
  } as const;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: "0.875rem",
        color: "#334155",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontWeight: 600, color: "#64748b" }}>Shop</span>
        {currentHidden ? (
          <>
            <span style={{ fontWeight: 500 }}>{currentDomain}</span>
            {switcherShops.length > 0 ? (
              <select
                defaultValue=""
                onChange={(e) => {
                  const domain = e.target.value;
                  if (domain) navigate(shopPagesPath(domain));
                }}
                aria-label="Switch shop"
                style={selectStyle}
              >
                <option value="" disabled>
                  Switch to…
                </option>
                {switcherShops.map((s) => (
                  <option key={s.domain} value={s.domain}>
                    {s.domain}
                    {s.name && s.name !== s.domain ? ` (${s.name})` : ""}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        ) : (
          <select
            value={currentDomain}
            onChange={(e) => {
              const domain = e.target.value;
              if (domain && domain !== currentDomain) {
                navigate(shopPagesPath(domain));
              }
            }}
            aria-label="Switch shop"
            style={selectStyle}
          >
            {switcherShops.map((s) => (
              <option key={s.domain} value={s.domain}>
                {s.domain}
                {s.name && s.name !== s.domain ? ` (${s.name})` : ""}
              </option>
            ))}
            {!switcherShops.some((s) => s.domain === currentDomain) ? (
              <option value={currentDomain}>{currentDomain}</option>
            ) : null}
          </select>
        )}
      </div>
      {!HIDE_SHOPIFY_ADMIN_UI ? (
      <a
        href={`/auth/shopify/start?next=${encodeURIComponent(shopPagesPath(currentDomain))}`}
        style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}
      >
        Connect another shop
      </a>
      ) : null}
    </header>
  );
}
