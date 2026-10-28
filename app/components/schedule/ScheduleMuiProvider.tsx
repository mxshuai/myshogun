"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

/** Match PreviewModal / media picker; above Puck sidebars. */
export const SCHEDULE_MODAL_Z_INDEX = 10000;

const scheduleTheme = createTheme({
  palette: {
    primary: {
      main: "#7c3aed",
    },
  },
  zIndex: {
    modal: SCHEDULE_MODAL_Z_INDEX,
  },
  typography: {
    fontFamily: "inherit",
  },
});

export function ScheduleMuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={scheduleTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
