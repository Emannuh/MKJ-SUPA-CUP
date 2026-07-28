import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { publicAPI } from '../../src/api/client'

interface Fixture {
  id: number
  competition_name: string
  home_team: string
  away_team: string
  venue: string
  match_date: string
  match_time: string
  status: string
}

export default function FixturesScreen() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchFixtures = useCallback(async () => {
    try {
      const response = await publicAPI.getFixtures()
      setFixtures(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch fixtures:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFixtures()
  }, [fetchFixtures])

  const onRefresh = () => {
    setRefreshing(true)
    fetchFixtures()
  }

  const renderFixture = ({ item }: { item: Fixture }) => (
    <View style={styles.fixtureCard}>
      <Text style={styles.competitionName}>{item.competition_name}</Text>
      <View style={styles.teamsContainer}>
        <Text style={styles.teamName}>{item.home_team}</Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.teamName}>{item.away_team}</Text>
      </View>
      <View style={styles.fixtureDetails}>
        <Text style={styles.detailText}>📍 {item.venue}</Text>
        <Text style={styles.detailText}>
          📅 {item.match_date} at {item.match_time}
        </Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#124491" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {fixtures.length > 0 ? (
        <FlatList
          data={fixtures}
          renderItem={renderFixture}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#124491']} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No fixtures available</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for upcoming matches
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  fixtureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  competitionName: {
    fontSize: 12,
    color: '#124491',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  vs: {
    fontSize: 14,
    color: '#94a3b8',
    marginHorizontal: 8,
  },
  fixtureDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
})
