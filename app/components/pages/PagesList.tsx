"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useFetcher,
  useNavigate,
  useRevalidator,
} from "react-router";

import type { ShopPageSummary } from "~/lib/server/page-service.server";
import type { ShopifyPageRow } from "~/lib/shopify-pages.server";
import { formatPublishesIn } from "~/lib/relative-time";
import type { VersionDisplayStatus } from "~/lib/schedule-window";
import { canonicalPagePath, slugFromTitle } from "~/lib/page-path";
import { shopEditPath } from "~/lib/shop-url";
import { HIDE_SHOPIFY_ADMIN_UI } from "~/lib/ui-flags";
import {
  PageActionConfirmDialog,
  type PageActionConfirmState,
} from "~/components/pages/PageActionConfirmDialog";
import { CreatePageDialog } from "~/components/pages/CreatePageDialog";
import { PagesMuiProvider } from "~/components/pages/PagesMuiProvider";
import { ShogunRowMenu } from "~/components/pages/ShogunRowMenu";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import type { SelectChangeEvent } from "@mui/material/Select";

const ScheduledVersionsDialog = lazy(() =>
  import("~/components/schedule/ScheduledVersionsDialog").then((m) => ({
    default: m.ScheduledVersionsDialog,
  })),
);
const ScheduleWindowDialog = lazy(() =>
  import("~/components/schedule/ScheduleWindowDialog").then((m) => ({
    default: m.ScheduleWindowDialog,
  })),
);

const accent = "#7c3aed";

function statusLabel(s: VersionDisplayStatus): string {
  switch (s) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "scheduled":
      return "Scheduled";
    case "outdated":
      return "Outdated";
    case "unpublished":
      return "Unpublished";
    default:
      return s;
  }
}

function statusDotColor(s: VersionDisplayStatus): string {
  switch (s) {
    case "draft":
      return accent;
    case "published":
      return "#16a34a";
    case "scheduled":
      return "#14b8a6";
    case "outdated":
      return "#dc2626";
    case "unpublished":
      return "#64748b";
    default:
      return "#94a3b8";
  }
}

type ShogunRow = ShopPageSummary & { editedRelative: string };

type FetcherData = {
  ok?: boolean;
  newPath?: string;
  error?: string;
};

export function PagesList({
  shopDomain,
  pagesAction,
  shogunPages,
  shopifyPages,
}: {
  shopDomain: string;
  pagesAction: string;
  shogunPages: ShogunRow[];
  shopifyPages: ShopifyPageRow[];
}) {
  const editHref = (pagePath: string) => shopEditPath(shopDomain, pagePath);
  const [tab, setTab] = useState<"shogun" | "shopify">("shogun");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ShogunRow | null>(null);
  const [scheduleListOpen, setScheduleListOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [shopifyFilter, setShopifyFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPagePath, setNewPagePath] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pageConfirm, setPageConfirm] = useState<PageActionConfirmState | null>(null);
  const [shogunSort, setShogunSort] = useState<
    "recent" | "name" | "path"
  >("recent");

  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  const busy = fetcher.state !== "idle";
  /** 同一轮 fetcher 成功响应只处理一次，避免 revalidate 触发重渲染后无限请求 pages.data */
  const handledFetcherDataRef = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.state === "submitting" || fetcher.state === "loading") {
      handledFetcherDataRef.current = null;
    }
  }, [fetcher.state]);

  useEffect(() => {
    const d = fetcher.data as FetcherData | undefined;
    if (fetcher.state !== "idle" || !d) return;
    if (handledFetcherDataRef.current === d) return;
    handledFetcherDataRef.current = d;

    if (d.ok && d.newPath) {
      setCreateOpen(false);
      setCreateError(null);
      navigate(editHref(d.newPath));
      return;
    }

    if (scheduleTarget) {
      if (d.ok === true) {
        setScheduleError(null);
        setScheduleFormOpen(false);
        setScheduleListOpen(false);
        setScheduleTarget(null);
        setEditingVersionId(null);
        revalidate();
        return;
      }
      if (d.ok === false && typeof d.error === "string") {
        setScheduleError(d.error);
        return;
      }
    }

    if (createOpen && d.ok === false && typeof d.error === "string") {
      setCreateError(d.error);
      return;
    }

    if (d.ok === false && typeof d.error === "string") {
      setActionError(d.error);
      return;
    }

    if (d.ok) {
      setActionError(null);
      revalidate();
    }
  }, [fetcher.state, fetcher.data, navigate, revalidate, scheduleTarget, createOpen]);

  const pathKeys = useMemo(() => shogunPages.map((r) => r.path), [shogunPages]);

  const sortedShogunPages = useMemo(() => {
    const rows = [...shogunPages];
    switch (shogunSort) {
      case "name":
        return rows.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
      case "path":
        return rows.sort((a, b) =>
          a.displayPath.localeCompare(b.displayPath, undefined, {
            sensitivity: "base",
          })
        );
      case "recent":
      default:
        return rows.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  }, [shogunPages, shogunSort]);

  const allSelected =
    pathKeys.length > 0 && pathKeys.every((p) => selected.has(p));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pathKeys));
    }
  };

  const toggleRow = (p: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const submitBulkPublish = () => {
    if (selected.size === 0) return;
    fetcher.submit(
      {
        intent: "bulkPublish",
        paths: JSON.stringify(Array.from(selected)),
      },
      { method: "post", action: pagesAction }
    );
    setSelected(new Set());
  };

  const submitIntent = (intent: string, payload: Record<string, string>) => {
    fetcher.submit({ intent, ...payload }, { method: "post", action: pagesAction });
    setMenuPath(null);
  };

  const visibleSchedules = (row: ShogunRow) =>
    row.schedules.filter(
      (schedule) =>
        schedule.status === "pending" ||
        schedule.status === "live" ||
        schedule.status === "ended" ||
        schedule.status === "failed",
    );

  const openSchedule = (row: ShogunRow) => {
    setScheduleTarget(row);
    setEditingVersionId(null);
    setScheduleError(null);
    setScheduleFormOpen(visibleSchedules(row).length === 0);
    setScheduleListOpen(visibleSchedules(row).length > 0);
    setMenuPath(null);
  };

  const submitSchedule = (
    publishAt: string,
    unpublishAt: string | null,
    versionId?: string,
  ) => {
    if (!scheduleTarget) return;
    setScheduleError(null);
    fetcher.submit(
      {
        intent: "schedule",
        pagePath: scheduleTarget.path,
        publishAt,
        unpublishAt: unpublishAt ?? "",
        versionId: versionId ?? "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      { method: "post", action: pagesAction },
    );
  };

  const confirmDelete = (pagePath: string) => {
    setMenuPath(null);
    setPageConfirm({ kind: "delete", pagePath });
  };

  const confirmUnpublish = (row: ShogunRow) => {
    const future = row.schedules.filter((schedule) => schedule.status === "pending");
    setMenuPath(null);
    setPageConfirm({
      kind: "unpublish",
      pagePath: row.path,
      pendingSchedules: future.map((schedule) => ({
        title: schedule.title,
        versionNumber: schedule.versionNumber,
        publishAt: schedule.publishAt,
      })),
    });
  };

  const runPageConfirm = () => {
    if (!pageConfirm) return;
    if (pageConfirm.kind === "delete") {
      submitIntent("delete", { pagePath: pageConfirm.pagePath });
    } else {
      submitIntent("unpublish", { pagePath: pageConfirm.pagePath });
    }
    setPageConfirm(null);
  };

  const submitCreate = () => {
    const pagePath = canonicalPagePath(newPagePath);
    if (!pagePath) {
      setCreateError("Invalid URL path");
      return;
    }
    setCreateError(null);
    setNewPagePath(pagePath.slice(1));
    fetcher.submit(
      {
        intent: "createPage",
        pageTitle: newPageTitle,
        pagePath,
      },
      { method: "post", action: pagesAction }
    );
  };

  const filteredShopify = useMemo(() => {
    return shopifyPages.filter(
      (r) => shopifyFilter === "all" || r.filterType === shopifyFilter
    );
  }, [shopifyPages, shopifyFilter]);

  const filterTypes = useMemo(() => {
    const s = new Set(shopifyPages.map((r) => r.filterType));
    return ["all", ...Array.from(s)];
  }, [shopifyPages]);

  return (
    <PagesMuiProvider>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 3, pb: 6, px: { xs: 2.5, sm: 2.5 } }}>
          {actionError ? (
            <Alert
              severity="error"
              onClose={() => setActionError(null)}
              sx={{ mb: 2 }}
            >
              {actionError}
            </Alert>
          ) : null}

          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 2.5,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "1.5rem" }}>
              Pages
            </Typography>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              {!HIDE_SHOPIFY_ADMIN_UI ? (
                <Button
                  component={Link}
                  to="/admin/shops"
                  variant="outlined"
                  sx={{
                    borderColor: "primary.main",
                    color: "primary.main",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    px: 1.75,
                    py: 1.25,
                  }}
                >
                  Shopify admin
                </Button>
              ) : null}
              <Button
                variant="contained"
                onClick={() => {
                  setCreateOpen(true);
                  setCreateError(null);
                  setNewPageTitle("");
                  setNewPagePath("");
                }}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  px: 2.25,
                  py: 1.25,
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none" },
                }}
              >
                New page
              </Button>
            </Stack>
          </Stack>

          {!HIDE_SHOPIFY_ADMIN_UI ? (
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                minHeight: 48,
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  minHeight: 48,
                  px: 0.5,
                  mr: 3.5,
                },
              }}
            >
              <Tab label="Shogun" value="shogun" />
              <Tab label="Shopify" value="shopify" />
            </Tabs>
          ) : null}

          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            {HIDE_SHOPIFY_ADMIN_UI || tab === "shogun" ? (
              <>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5,
                    px: 2,
                    py: 1.75,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                      disabled={pathKeys.length === 0 || busy}
                      slotProps={{ input: { "aria-label": "Select all pages" } }}
                      size="small"
                    />
                    <Button
                      variant="outlined"
                      onClick={submitBulkPublish}
                      disabled={selected.size === 0 || busy}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        fontSize: "0.875rem",
                        py: 1,
                        px: 1.75,
                        bgcolor:
                          selected.size === 0 ? "action.hover" : "background.paper",
                      }}
                    >
                      Bulk publish pages
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Sort
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <Select
                        value={shogunSort}
                        onChange={(e: SelectChangeEvent) =>
                          setShogunSort(e.target.value as "recent" | "name" | "path")
                        }
                        sx={{ fontSize: "0.875rem", color: "text.primary" }}
                      >
                        <MenuItem value="recent">Recently Edited</MenuItem>
                        <MenuItem value="name">Page name (A–Z)</MenuItem>
                        <MenuItem value="path">URL path (A–Z)</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ pl: 2, width: 48 }} />
                        <TableCell>Page</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Edited</TableCell>
                        <TableCell align="right" sx={{ pr: 2, width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedShogunPages.map((row) => (
                        <TableRow key={row.path} hover>
                          <TableCell padding="checkbox" sx={{ pl: 2, verticalAlign: "middle" }}>
                            <Checkbox
                              checked={selected.has(row.path)}
                              onChange={() => toggleRow(row.path)}
                              disabled={busy}
                              slotProps={{
                                input: { "aria-label": `Select ${row.title}` },
                              }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "middle" }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 1,
                                  bgcolor: "#f5f3ff",
                                  border: "1px solid #ede9fe",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                                aria-hidden
                              >
                                <svg
                                  width="22"
                                  height="22"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={accent}
                                  strokeWidth="1.8"
                                >
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                </svg>
                              </Box>
                              <Box>
                                <Typography
                                  component={Link}
                                  to={editHref(row.path)}
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    color: "text.primary",
                                    textDecoration: "none",
                                    "&:hover": { textDecoration: "underline" },
                                  }}
                                >
                                  {row.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                                >
                                  {row.displayPath}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "middle" }}>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 1,
                                  fontSize: "0.875rem",
                                  color:
                                    row.status === "outdated" ? "#dc2626" : "text.primary",
                                  fontWeight: row.status === "outdated" ? 600 : 400,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: statusDotColor(row.status),
                                    flexShrink: 0,
                                  }}
                                />
                                {statusLabel(row.latestVersion?.status ?? row.status)}
                              </Box>
                              {row.latestVersion ? (
                                <Typography
                                  variant="caption"
                                  sx={{ ml: 2, lineHeight: 1.3, color: "text.secondary" }}
                                >
                                  Version {row.latestVersion.versionNumber}
                                  {row.latestVersion.status === "scheduled"
                                    ? (() => {
                                        const publishAt = row.schedules.find(
                                          (schedule) =>
                                            schedule.versionId === row.latestVersion?.versionId,
                                        )?.publishAt;
                                        return publishAt
                                          ? ` · ${formatPublishesIn(publishAt)}`
                                          : "";
                                      })()
                                    : ""}
                                </Typography>
                              ) : null}
                            </Box>
                          </TableCell>
                          <TableCell
                            sx={{
                              verticalAlign: "middle",
                              fontSize: "0.875rem",
                              color: "text.secondary",
                            }}
                          >
                            {row.editedRelative}
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 2, verticalAlign: "middle" }}>
                            <ShogunRowMenu
                              busy={busy}
                              isOpen={menuPath === row.path}
                              onToggle={() =>
                                setMenuPath((m) => (m === row.path ? null : row.path))
                              }
                              onClose={() => setMenuPath(null)}
                              onPublish={() => submitIntent("publish", { pagePath: row.path })}
                              onSchedule={() => openSchedule(row)}
                              onUnpublish={
                                row.canUnpublish ? () => confirmUnpublish(row) : null
                              }
                              onDuplicate={() =>
                                submitIntent("duplicate", { pagePath: row.path })
                              }
                              onDelete={() => confirmDelete(row.path)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {shogunPages.length === 0 ? (
                  <Typography
                    align="center"
                    sx={{ py: 5, color: "text.secondary" }}
                  >
                    No editor pages yet.
                  </Typography>
                ) : null}
              </>
            ) : (
              <>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "flex-end",
                    px: 2,
                    py: 1.75,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={shopifyFilter}
                      onChange={(e: SelectChangeEvent) => setShopifyFilter(e.target.value)}
                      sx={{ fontSize: "0.875rem" }}
                    >
                      {filterTypes.map((f) => (
                        <MenuItem key={f} value={f}>
                          {f === "all" ? "All types" : f}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Page Name</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredShopify.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ verticalAlign: "middle" }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                              <Box
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 1,
                                  bgcolor: "#f5f3ff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {row.isHome ? (
                                  <Box component="span" sx={{ color: "primary.main", fontSize: "1.1rem" }}>
                                    ⌂
                                  </Box>
                                ) : (
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={accent}
                                    strokeWidth="1.8"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 2v6h6" />
                                  </svg>
                                )}
                              </Box>
                              <Box>
                                <Typography
                                  sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.primary" }}
                                >
                                  {row.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                                >
                                  {row.handle}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ verticalAlign: "middle" }}>
                            {row.imported ? (
                              <Typography sx={{ fontSize: "0.875rem", color: "#16a34a" }}>
                                Imported
                              </Typography>
                            ) : (
                              <Button
                                variant="contained"
                                disabled={busy}
                                onClick={() =>
                                  fetcher.submit(
                                    {
                                      intent: "importShopify",
                                      shopifyId: row.id,
                                    },
                                    { method: "post", action: pagesAction },
                                  )
                                }
                                sx={{
                                  bgcolor: "#ede9fe",
                                  color: "primary.main",
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  boxShadow: "none",
                                  "&:hover": { bgcolor: "#ddd6fe", boxShadow: "none" },
                                }}
                              >
                                Import page
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {filteredShopify.length === 0 ? (
                  <Typography align="center" sx={{ py: 5, color: "text.secondary" }}>
                    No Shopify pages in this filter.
                  </Typography>
                ) : null}
              </>
            )}
          </Paper>

          {busy ? (
            <>
              <LinearProgress sx={{ mt: 1.5 }} />
              <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                Working…
              </Typography>
            </>
          ) : null}
        </Container>

        <CreatePageDialog
        open={createOpen}
        busy={busy}
        pageTitle={newPageTitle}
        pagePath={newPagePath}
        error={createError}
        onPageTitleChange={(value) => {
          setNewPageTitle(value);
          setNewPagePath(slugFromTitle(value));
          setCreateError(null);
        }}
        onPagePathChange={(value) => {
          setNewPagePath(value);
          setCreateError(null);
        }}
        onPagePathBlur={() => {
          const canonical = canonicalPagePath(newPagePath);
          setNewPagePath(canonical ? canonical.slice(1) : "");
        }}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={submitCreate}
      />

      {scheduleListOpen && scheduleTarget ? (
        <Suspense fallback={null}>
          <ScheduledVersionsDialog
            pageTitle={scheduleTarget.title}
            schedules={scheduleTarget.schedules}
            onClose={() => {
              setScheduleListOpen(false);
              setScheduleTarget(null);
            }}
            onEdit={(versionId) => {
              setEditingVersionId(versionId);
              setScheduleListOpen(false);
              setScheduleFormOpen(true);
            }}
          />
        </Suspense>
      ) : null}
      {scheduleFormOpen && scheduleTarget ? (
        <Suspense fallback={null}>
          <ScheduleWindowDialog
          key={editingVersionId ?? "new"}
          schedules={scheduleTarget.schedules}
          excludeVersionId={editingVersionId}
          initialPublishAt={
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.publishAt
          }
          initialUnpublishAt={
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.unpublishAt
          }
          publishLocked={
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.status === "live"
          }
          canClear={["pending", "failed"].includes(
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.status ?? "",
          )}
          busy={busy}
          error={scheduleError}
          onClose={() => {
            setScheduleFormOpen(false);
            setScheduleError(null);
            if (editingVersionId) setScheduleListOpen(true);
            else setScheduleTarget(null);
          }}
          onClear={() => {
            if (!editingVersionId) return;
            fetcher.submit(
              {
                intent: "unschedule",
                pagePath: scheduleTarget.path,
                versionId: editingVersionId,
              },
              { method: "post", action: pagesAction },
            );
          }}
          onConfirm={(value) =>
            submitSchedule(value.publishAt, value.unpublishAt, editingVersionId ?? undefined)
          }
        />
        </Suspense>
      ) : null}

      <PageActionConfirmDialog
        pending={pageConfirm}
        busy={busy}
        onClose={() => setPageConfirm(null)}
        onConfirm={runPageConfirm}
      />
      </Box>
    </PagesMuiProvider>
  );
}
