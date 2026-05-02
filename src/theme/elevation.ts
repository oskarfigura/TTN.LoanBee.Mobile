import { colours } from './colours';

export const elevation = {
  level1: {
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  level2: {
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 5,
  },
  nav: {
    shadowColor: colours.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
