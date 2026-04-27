export type TableThemeId = 'blue' | 'green' | 'brown' | 'red';

export const TABLE_THEME_STORAGE_KEY = 'golf:table-theme';

export interface TableThemeDefinition {
  id: TableThemeId;
  name: string;
  description: string;
  accent: string;
  optionBackground: string;
  optionBorder: string;
  optionGlow: string;
  previewBackground: string;
  screenBackground: string;
  patternDot: string;
  feltBackground: string;
  feltBorder: string;
}

export const TABLE_THEMES: TableThemeDefinition[] = [
  {
    id: 'blue',
    name: 'Blue Table',
    description: 'Original classic game look',
    accent: '#6fb6ff',
    optionBackground: 'linear-gradient(145deg, rgba(16,61,124,0.96), rgba(8,24,48,0.94))',
    optionBorder: 'rgba(111,182,255,0.34)',
    optionGlow: 'rgba(111,182,255,0.22)',
    previewBackground: 'radial-gradient(circle at 32% 28%, rgba(130,177,255,0.28), transparent 42%), linear-gradient(145deg, #1e5fb8, #0d2137)',
    screenBackground: 'radial-gradient(ellipse at 50% 40%, #1565C0 0%, #0D47A1 25%, #0D2137 65%, #060D1B 100%)',
    patternDot: 'rgba(255,255,255,0.025)',
    feltBackground: 'radial-gradient(ellipse, rgba(27,94,32,0.25) 0%, rgba(27,94,32,0.08) 60%, transparent 100%)',
    feltBorder: 'rgba(27,94,32,0.2)',
  },
  {
    id: 'green',
    name: 'Green Felt',
    description: 'Classic card-table look',
    accent: '#71d48a',
    optionBackground: 'linear-gradient(145deg, rgba(18,84,47,0.96), rgba(12,41,28,0.94))',
    optionBorder: 'rgba(113,212,138,0.34)',
    optionGlow: 'rgba(113,212,138,0.24)',
    previewBackground: 'radial-gradient(circle at 32% 28%, rgba(136,229,154,0.36), transparent 42%), linear-gradient(145deg, #19693c, #0d3325)',
    screenBackground: 'radial-gradient(ellipse at 50% 38%, #1f7a45 0%, #145c34 28%, #0f2d24 66%, #071018 100%)',
    patternDot: 'rgba(255,255,255,0.03)',
    feltBackground: 'radial-gradient(ellipse, rgba(113,212,138,0.22) 0%, rgba(27,94,32,0.10) 58%, transparent 100%)',
    feltBorder: 'rgba(113,212,138,0.18)',
  },
  {
    id: 'brown',
    name: 'Brown Table',
    description: 'Warm casino wood tone',
    accent: '#d8a56d',
    optionBackground: 'linear-gradient(145deg, rgba(104,64,35,0.96), rgba(30,19,14,0.94))',
    optionBorder: 'rgba(216,165,109,0.34)',
    optionGlow: 'rgba(216,165,109,0.22)',
    previewBackground: 'radial-gradient(circle at 32% 28%, rgba(255,214,170,0.28), transparent 42%), linear-gradient(145deg, #7b4a29, #2f1b14)',
    screenBackground: 'radial-gradient(ellipse at 50% 38%, #80502e 0%, #5d3c24 26%, #251914 66%, #090c12 100%)',
    patternDot: 'rgba(255,248,235,0.03)',
    feltBackground: 'radial-gradient(ellipse, rgba(216,165,109,0.20) 0%, rgba(94,62,35,0.10) 58%, transparent 100%)',
    feltBorder: 'rgba(216,165,109,0.16)',
  },
  {
    id: 'red',
    name: 'Red Table',
    description: 'Bold casino room vibe',
    accent: '#ff8f8f',
    optionBackground: 'linear-gradient(145deg, rgba(123,28,42,0.96), rgba(34,13,19,0.94))',
    optionBorder: 'rgba(255,143,143,0.34)',
    optionGlow: 'rgba(255,143,143,0.22)',
    previewBackground: 'radial-gradient(circle at 32% 28%, rgba(255,205,205,0.26), transparent 42%), linear-gradient(145deg, #a12d3f, #34121a)',
    screenBackground: 'radial-gradient(ellipse at 50% 38%, #9c2f41 0%, #711f2e 26%, #241019 66%, #090c12 100%)',
    patternDot: 'rgba(255,245,245,0.028)',
    feltBackground: 'radial-gradient(ellipse, rgba(255,143,143,0.18) 0%, rgba(113,31,46,0.10) 58%, transparent 100%)',
    feltBorder: 'rgba(255,143,143,0.16)',
  },
];

export function getStoredTableThemeId(): TableThemeId {
  if (typeof window === 'undefined') return 'blue';

  const savedTheme = window.localStorage.getItem(TABLE_THEME_STORAGE_KEY);
  if (savedTheme === 'blue' || savedTheme === 'green' || savedTheme === 'brown' || savedTheme === 'red') {
    return savedTheme;
  }

  return 'blue';
}

export function setStoredTableThemeId(themeId: TableThemeId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TABLE_THEME_STORAGE_KEY, themeId);
}

export function getTableTheme(themeId: TableThemeId): TableThemeDefinition {
  return TABLE_THEMES.find(theme => theme.id === themeId) ?? TABLE_THEMES[0];
}
