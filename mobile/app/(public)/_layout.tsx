import { Stack } from 'expo-router'

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#124491' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="fixtures" options={{ title: 'Fixtures' }} />
      <Stack.Screen name="standings" options={{ title: 'Standings' }} />
      <Stack.Screen name="results" options={{ title: 'Results' }} />
    </Stack>
  )
}
