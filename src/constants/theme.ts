/**
 * Colores, tamaños de letra y espaciado de la app.
 * Centralizarlos aquí mantiene la interfaz consistente:
 * ningún componente escribe un color o un tamaño "a mano".
 */
export const colors = {
  background: '#F6F5FB',
  surface: '#FFFFFF',
  primary: '#6256D9',
  primaryDisabled: '#AAA4E6',
  primarySoft: '#F0EFFF',
  primarySelected: '#EAE8FB',
  primaryText: '#554ACB',
  progress: '#7569E2',
  success: '#58A58F',
  saved: '#42A98C',
  danger: '#D14B5A',
  dangerSoft: '#FDEEF0',
  text: '#28263A',
  textBody: '#39374B',
  textMuted: '#6B6980',
  textSubtle: '#8B879C',
  placeholder: '#A09EAF',
  border: '#EAE8F2',
  borderSoft: '#EEECF3',
  track: '#EFEDF7',
  white: '#FFFFFF',
} as const;

/** Tamaños de letra. El mínimo es 11 para que todo sea legible en un teléfono. */
export const fontSize = {
  kicker: 11,
  small: 12,
  body: 14,
  input: 15,
  task: 15,
  emphasis: 18,
  section: 24,
  hero: 49,
} as const;

/** Tamaño mínimo de cualquier zona tocable (recomendación de Android: 48). */
export const touchTarget = 44;

export const radius = {
  sm: 10,
  md: 15,
  lg: 20,
} as const;

/** Sombra suave compartida por las tarjetas. */
export const cardShadow = {
  shadowColor: '#322C5E',
  shadowOpacity: 0.04,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
} as const;
