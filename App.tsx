import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Navigator from '@/navigation';
import supabase from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

const App: React.FC = () => {
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
          });
        } else if (event === 'SIGNED_OUT') {
          clearUser();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clearUser]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Navigator />
    </SafeAreaProvider>
  );
};

export default App;
