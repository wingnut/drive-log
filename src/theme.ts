import { createTheme } from '@mui/material/styles'

// Palette inspired by odometer dials and Swedish road signage:
// deep steel-navy body, a warning-amber accent for validation issues,
// and a muted highway-green for confirmed/valid state.
const NAVY = '#1F3A52'
const NAVY_DARK = '#132433'
const STEEL = '#5B7C99'
const AMBER = '#C77B1E'
const GREEN = '#2E6E52'
const PAPER = '#F6F7F5'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: NAVY, dark: NAVY_DARK, light: STEEL, contrastText: '#fff' },
    secondary: { main: AMBER, contrastText: '#fff' },
    success: { main: GREEN },
    error: { main: '#A23B2E' },
    background: { default: PAPER, paper: '#FFFFFF' },
    text: { primary: '#1A2733', secondary: '#4B5B68' },
    divider: 'rgba(31,58,82,0.14)',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Roboto", sans-serif', fontWeight: 700 },
    h6: { fontWeight: 600, letterSpacing: 0.2 },
    subtitle2: { fontFamily: '"Roboto Mono", monospace', letterSpacing: 0.4 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: NAVY_DARK },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#4B5B68',
          backgroundColor: '#EEF1EE',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})
