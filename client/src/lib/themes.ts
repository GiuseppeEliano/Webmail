export interface Theme {
  id: string;
  name: string;
  cssVars: {
    [key: string]: string;
  };
}

export const themes: Theme[] = [
  {
    id: "default",
    name: "Default Dark",
    cssVars: {
      "--background": "222.2 84% 4.9%",
      "--foreground": "210 40% 98%",
      "--card": "222.2 84% 4.9%",
      "--card-foreground": "210 40% 98%",
      "--popover": "222.2 84% 4.9%",
      "--popover-foreground": "210 40% 98%",
      "--primary": "217.2 91.2% 59.8%",
      "--primary-foreground": "222.2 84% 4.9%",
      "--secondary": "217.2 32.6% 17.5%",
      "--secondary-foreground": "210 40% 98%",
      "--muted": "217.2 32.6% 17.5%",
      "--muted-foreground": "215 20.2% 65.1%",
      "--accent": "217.2 32.6% 17.5%",
      "--accent-foreground": "210 40% 98%",
      "--destructive": "0 62.8% 30.6%",
      "--destructive-foreground": "210 40% 98%",
      "--border": "217.2 32.6% 17.5%",
      "--input": "217.2 32.6% 17.5%",
      "--ring": "217.2 91.2% 59.8%",
    }
  },
  {
    id: "light",
    name: "Light",
    cssVars: {
      "--background": "0 0% 100%",
      "--foreground": "222.2 84% 4.9%",
      "--card": "0 0% 100%",
      "--card-foreground": "222.2 84% 4.9%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "222.2 84% 4.9%",
      "--primary": "217.2 91.2% 59.8%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 40% 96%",
      "--secondary-foreground": "222.2 84% 4.9%",
      "--muted": "210 40% 96%",
      "--muted-foreground": "215.4 16.3% 46.9%",
      "--accent": "210 40% 96%",
      "--accent-foreground": "222.2 84% 4.9%",
      "--destructive": "0 84.2% 60.2%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "214.3 31.8% 91.4%",
      "--input": "214.3 31.8% 91.4%",
      "--ring": "217.2 91.2% 59.8%",
    }
  },
  {
    id: "obsidian",
    name: "Obsidian",
    cssVars: {
      "--background": "240 10% 8%",
      "--foreground": "0 0% 95%",
      "--card": "240 10% 8%",
      "--card-foreground": "0 0% 95%",
      "--popover": "240 10% 8%",
      "--popover-foreground": "0 0% 95%",
      "--primary": "263 70% 50%",
      "--primary-foreground": "0 0% 98%",
      "--secondary": "240 5% 15%",
      "--secondary-foreground": "0 0% 95%",
      "--muted": "240 5% 15%",
      "--muted-foreground": "240 5% 65%",
      "--accent": "240 5% 15%",
      "--accent-foreground": "0 0% 95%",
      "--destructive": "0 75% 60%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "240 5% 15%",
      "--input": "240 5% 15%",
      "--ring": "263 70% 50%",
    }
  },
  {
    id: "gradient-blue",
    name: "Gradient Blue",
    cssVars: {
      "--background": "220 100% 4%",
      "--foreground": "210 40% 98%",
      "--card": "220 100% 4%",
      "--card-foreground": "210 40% 98%",
      "--popover": "220 100% 4%",
      "--popover-foreground": "210 40% 98%",
      "--primary": "200 100% 50%",
      "--primary-foreground": "220 100% 4%",
      "--secondary": "220 50% 10%",
      "--secondary-foreground": "210 40% 98%",
      "--muted": "220 50% 10%",
      "--muted-foreground": "215 20% 65%",
      "--accent": "220 50% 10%",
      "--accent-foreground": "210 40% 98%",
      "--destructive": "0 75% 60%",
      "--destructive-foreground": "210 40% 98%",
      "--border": "220 50% 10%",
      "--input": "220 50% 10%",
      "--ring": "200 100% 50%",
    }
  },
  {
    id: "green-forest",
    name: "Green Forest",
    cssVars: {
      "--background": "120 20% 8%",
      "--foreground": "120 10% 95%",
      "--card": "120 20% 8%",
      "--card-foreground": "120 10% 95%",
      "--popover": "120 20% 8%",
      "--popover-foreground": "120 10% 95%",
      "--primary": "142 76% 36%",
      "--primary-foreground": "120 20% 8%",
      "--secondary": "120 10% 15%",
      "--secondary-foreground": "120 10% 95%",
      "--muted": "120 10% 15%",
      "--muted-foreground": "120 5% 65%",
      "--accent": "120 10% 15%",
      "--accent-foreground": "120 10% 95%",
      "--destructive": "0 75% 60%",
      "--destructive-foreground": "120 10% 95%",
      "--border": "120 10% 15%",
      "--input": "120 10% 15%",
      "--ring": "142 76% 36%",
    }
  },
  {
    id: "purple-night",
    name: "Purple Night",
    cssVars: {
      "--background": "270 20% 6%",
      "--foreground": "270 10% 95%",
      "--card": "270 20% 6%",
      "--card-foreground": "270 10% 95%",
      "--popover": "270 20% 6%",
      "--popover-foreground": "270 10% 95%",
      "--primary": "270 95% 65%",
      "--primary-foreground": "270 20% 6%",
      "--secondary": "270 10% 12%",
      "--secondary-foreground": "270 10% 95%",
      "--muted": "270 10% 12%",
      "--muted-foreground": "270 5% 65%",
      "--accent": "270 10% 12%",
      "--accent-foreground": "270 10% 95%",
      "--destructive": "0 75% 60%",
      "--destructive-foreground": "270 10% 95%",
      "--border": "270 10% 12%",
      "--input": "270 10% 12%",
      "--ring": "270 95% 65%",
    }
  },
  {
    id: "warm-orange",
    name: "Warm Orange",
    cssVars: {
      "--background": "20 30% 8%",
      "--foreground": "20 10% 95%",
      "--card": "20 30% 8%",
      "--card-foreground": "20 10% 95%",
      "--popover": "20 30% 8%",
      "--popover-foreground": "20 10% 95%",
      "--primary": "24 100% 58%",
      "--primary-foreground": "20 30% 8%",
      "--secondary": "20 15% 12%",
      "--secondary-foreground": "20 10% 95%",
      "--muted": "20 15% 12%",
      "--muted-foreground": "20 5% 65%",
      "--accent": "20 15% 12%",
      "--accent-foreground": "20 10% 95%",
      "--destructive": "0 75% 60%",
      "--destructive-foreground": "20 10% 95%",
      "--border": "20 15% 12%",
      "--input": "20 15% 12%",
      "--ring": "24 100% 58%",
    }
  }
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  // Remove any existing theme classes
  root.classList.remove('dark', 'light');
  
  // Add theme class
  if (theme.id === 'light') {
    root.classList.add('light');
  } else {
    root.classList.add('dark');
  }
  
  // Apply CSS variables
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, `hsl(${value})`);
  });
}

export function getCurrentTheme(): string {
  return localStorage.getItem('eliano-theme') || 'default';
}

export function setCurrentTheme(themeId: string) {
  localStorage.setItem('eliano-theme', themeId);
  const theme = themes.find(t => t.id === themeId);
  if (theme) {
    applyTheme(theme);
  }
}