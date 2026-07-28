import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'

export default function DashboardScreen() {
  const { user, logout, hasRole } = useAuth()
  const router = useRouter()

  const roleLabels: Record<string, string> = {
    team_manager: 'Team Manager',
    ward_sports_council_chair: 'Ward Sports Council Chair',
    subcounty_discipline_coordinator: 'Subcounty Discipline Coordinator',
    referee: 'Referee',
    competition_manager: 'Competition Manager',
    coordinator: 'Coordinator',
    admin: 'Administrator',
  }

  return (
    <ScrollView style={styles.container}>
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>
          Welcome, {user?.first_name || 'User'}!
        </Text>
        <Text style={styles.roleBadge}>
          {roleLabels[user?.role || ''] || user?.role}
        </Text>
        <Text style={styles.locationText}>
          {user?.ward && user?.sub_county
            ? `${user.ward} Ward — ${user.sub_county} Sub-County`
            : 'Makueni County'}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {hasRole('team_manager') && (
          <Link href="/(portal)/longlist" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>👥</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Player Longlist</Text>
                <Text style={styles.actionSubtitle}>
                  Manage your team's player registrations
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          </Link>
        )}

        {hasRole('ward_sports_council_chair') && (
          <Link href="/(portal)/wscc-longlists" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>📋</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Review Longlists</Text>
                <Text style={styles.actionSubtitle}>
                  Review and approve ward team longlists
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          </Link>
        )}

        {hasRole('referee') && (
          <Link href="/(portal)/appointments" asChild>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>🎖️</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>My Appointments</Text>
                <Text style={styles.actionSubtitle}>
                  View and manage your match appointments
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          The Ward Sports Council Chair (WSCC) reviews all ward teams directly — just keep your player list up to date.
        </Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await logout()
          router.replace('/')
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#124491',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#1e40af',
    color: '#e0e7ff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#93c5fd',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  actionArrow: {
    fontSize: 20,
    color: '#94a3b8',
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
})
