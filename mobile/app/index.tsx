import { Link } from 'expo-router'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useEffect } from 'react'

export default function HomeScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check auth status after mount
    const checkAuth = async () => {
      try {
        // For now, default to not authenticated
        // Auth will be checked when user tries to login
        setIsAuthenticated(false)
        setUser(null)
      } catch (e) {
        // Ignore errors
      }
    }
    checkAuth()
  }, [])

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>MKJ Supa Cup</Text>
        <Text style={styles.heroSubtitle}>
          Governor Mutula Kilonzo Junior Supa Cup
        </Text>
        <Text style={styles.heroTagline}>
          Makueni County's Premier Youth Sports Championship
        </Text>
      </View>

      {/* Sports Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sports</Text>
        <View style={styles.sportsGrid}>
          {['Football', 'Volleyball', 'Basketball', 'Handball'].map((sport) => (
            <View key={sport} style={styles.sportCard}>
              <Text style={styles.sportName}>{sport}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <View style={styles.linksGrid}>
          <Link href="/(public)/fixtures" asChild>
            <TouchableOpacity style={styles.linkCard}>
              <Text style={styles.linkText}>📅 Fixtures</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/(public)/standings" asChild>
            <TouchableOpacity style={styles.linkCard}>
              <Text style={styles.linkText}>🏆 Standings</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/(public)/results" asChild>
            <TouchableOpacity style={styles.linkCard}>
              <Text style={styles.linkText}>📊 Results</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Auth Section */}
      <View style={styles.section}>
        {isAuthenticated ? (
          <View style={styles.authCard}>
            <Text style={styles.welcomeText}>
              Welcome, {user?.first_name || 'User'}!
            </Text>
            <Link href="/(portal)" asChild>
              <TouchableOpacity style={styles.portalButton}>
                <Text style={styles.portalButtonText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Login to Portal</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hero: {
    backgroundColor: '#124491',
    padding: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginBottom: 8,
  },
  heroTagline: {
    fontSize: 12,
    color: '#93c5fd',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sportCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sportName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  linksGrid: {
    gap: 12,
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  authCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  portalButton: {
    backgroundColor: '#124491',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  portalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#124491',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
