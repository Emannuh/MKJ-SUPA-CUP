import { Stack, Redirect } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { View, ActivityIndicator } from 'react-native'

export default function PortalLayout() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#124491" />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#124491' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="longlist" options={{ title: 'Player Longlist' }} />
    </Stack>
  )
}
