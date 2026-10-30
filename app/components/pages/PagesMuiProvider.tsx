"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

/** Pages list visual tokens aligned with Shogun admin reference. */
export const pagesListTheme = createTheme({
  palette: {
    primary: {
      main: "#7c3aed",
    },
    text: {
      primary: "#212121",
      secondary: "#666666",
    },
    divider: "#E0E0E0",
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "inherit",
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.43,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.33,
      color: "#666666",
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#666666",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          borderColor: "#E0E0E0",
        },
        root: {
          borderColor: "#E0E0E0",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },
  },
});

export function PagesMuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={pagesListTheme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
