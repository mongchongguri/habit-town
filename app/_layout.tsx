import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../src/features/i18n';
import { StartupSplash } from '../src/features/startup/components/StartupSplash';
import { runAppStartup } from '../src/features/startup/runAppStartup';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // The native splash may already be hidden during fast refresh.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Galmuri11: require('../assets/fonts/Galmuri11.ttf'),
  });
  const [isStartupComplete, setIsStartupComplete] = useState(false);
  const [startupProgress, setStartupProgress] = useState(0.08);
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (!fontsReady) {
      return;
    }

    let isMounted = true;

    void runAppStartup((nextProgress) => {
      if (isMounted) {
        setStartupProgress(nextProgress.progress);
      }
    }).then((errors) => {
      if (!isMounted) {
        return;
      }

      if (errors.length > 0) {
        console.warn('Some startup data could not be preloaded.', errors);
      }

      setIsStartupComplete(true);
    });

    return () => {
      isMounted = false;
    };
  }, [fontsReady]);

  const handleSplashLayout = useCallback(() => {
    if (!fontsReady) {
      return;
    }

    void SplashScreen.hideAsync().catch(() => {
      // The native splash may already be hidden on web or during fast refresh.
    });
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  if (!isStartupComplete) {
    return <StartupSplash onLayout={handleSplashLayout} progress={startupProgress} />;
  }

  return (
    <GestureHandlerRootView onLayout={handleSplashLayout} style={{ flex: 1 }}>
      <I18nProvider>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#f6f7f2' },
              headerShown: false,
            }}
          />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
