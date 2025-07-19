// Theme management utility
export const initializeTheme = () => {
  const theme = localStorage.getItem('theme') || 'system';
  const accentColor = localStorage.getItem('accentColor') || 'blue';
  
  // Apply theme
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // System theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
  
  // Apply accent color
  const colors = {
    blue: { primary: 'hsl(243, 75%, 59%)', primaryForeground: 'hsl(0, 0%, 98%)' },
    purple: { primary: 'hsl(271, 81%, 56%)', primaryForeground: 'hsl(0, 0%, 98%)' },
    green: { primary: 'hsl(142, 76%, 36%)', primaryForeground: 'hsl(0, 0%, 98%)' },
    orange: { primary: 'hsl(25, 95%, 53%)', primaryForeground: 'hsl(0, 0%, 98%)' },
    red: { primary: 'hsl(346, 87%, 43%)', primaryForeground: 'hsl(0, 0%, 98%)' },
    pink: { primary: 'hsl(330, 81%, 60%)', primaryForeground: 'hsl(0, 0%, 98%)' }
  };
  
  const selectedColors = colors[accentColor as keyof typeof colors] || colors.blue;
  root.style.setProperty('--primary', selectedColors.primary);
  root.style.setProperty('--primary-foreground', selectedColors.primaryForeground);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    if (localStorage.getItem('theme') === 'system') {
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };
  
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  return () => {
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  };
};