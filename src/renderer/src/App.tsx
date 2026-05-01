import { ContainersScreen } from '@gui/screens/ContainersScreen/ContainersScreen';
import { useThemeStore } from '@gui/stores/themeStore';
import { useUpdateStore } from '@gui/stores/updateStore';
import React, { useEffect } from 'react';

export function App(): React.JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const hydrateUpdates = useUpdateStore((state) => state.hydrate);
  const subscribeToUpdates = useUpdateStore((state) => state.subscribeToUpdates);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    void hydrateUpdates();
    return subscribeToUpdates();
  }, [hydrateUpdates, subscribeToUpdates]);

  return <ContainersScreen />;
}
