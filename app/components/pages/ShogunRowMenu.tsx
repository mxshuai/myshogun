"use client";

import { useEffect, useState } from "react";

import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export function ShogunRowMenu({
  busy,
  isOpen,
  onToggle,
  onClose,
  onPublish,
  onSchedule,
  onUnpublish,
  onDuplicate,
  onDelete,
}: {
  busy: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPublish: () => void;
  onSchedule: () => void;
  onUnpublish: (() => void) | null;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) setAnchorEl(null);
  }, [isOpen]);

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label="Page actions"
        aria-expanded={isOpen}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isOpen) {
            onClose();
          } else {
            setAnchorEl(e.currentTarget);
            onToggle();
          }
        }}
        sx={{ color: "text.secondary" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="6" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="18" r="2" />
        </svg>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={isOpen && Boolean(anchorEl)}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        <MenuItem onClick={() => run(onPublish)}>Publish</MenuItem>
        <MenuItem onClick={() => run(onSchedule)}>Schedule</MenuItem>
        {onUnpublish ? (
          <MenuItem onClick={() => run(onUnpublish)}>Unpublish</MenuItem>
        ) : null}
        <MenuItem onClick={() => run(onDuplicate)}>Duplicate page</MenuItem>
        <Divider />
        <MenuItem onClick={() => run(onDelete)} sx={{ color: "error.main", fontWeight: 600 }}>
          Delete page
        </MenuItem>
      </Menu>
    </>
  );
}
