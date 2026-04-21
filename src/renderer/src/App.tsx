import { ContainersScreen } from '@gui/screens/ContainersScreen/ContainersScreen';
import { useThemeStore } from '@gui/stores/themeStore';
import React, { useEffect } from 'react';

export function App(): React.JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <ContainersScreen />;
}
