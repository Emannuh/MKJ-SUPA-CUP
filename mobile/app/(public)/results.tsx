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

interface Result {
  id: number
  competition_name: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  venue: string
  match_date: string
  status: string
}

export default function ResultsScreen() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchResults = useCallback(async () => {
    try {
      // For demo, using mock data - in production, fetch from API
      const mockResults: Result[] = [
        {
          id: 1,
          competition_name: 'Football - Makueni Sub-County',
          home_team: 'Wote Ward FC',
          away_team: 'Mavindini United',
          home_score: 2,
          away_score: 1,
          venue: 'Wote Primary',
          match_date: '2025-01-15',
          status: 'completed',
        },
        {
          id: 2,
          competition_name: 'Volleyball - Kaiti Sub-County',
          home_team: 'Ukia Spikers',
          away_team: 'Kee Volleyball',
          home_score: 3,
          away_score: 0,
          venue: 'Ukia Grounds',
          match_date: '2025-01-14',
          status: 'completed',
        },
        {
          id: 3,
          competition_name: 'Basketball - Mbooni Sub-County',
          home_team: 'Mbooni Giants',
          away_team: 'Tulimani Hawks',
          home_score: 48,
          away_score: 52,
          venue: 'Mbooni Court',
          match_date: '2025-01-13',
          status: 'completed',
        },
      ]
      setResults(mockResults)
    } catch (error) {
      console.error('Failed to fetch results:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const onRefresh = () => {
    setRefreshing(true)
    fetchResults()
  }

  const renderResult = ({ item }: { item: Result }) => (
    <View style={styles.resultCard}>
      <Text style={styles.competitionName}>{item.competition_name}</Text>
      <View style={styles.scoreContainer}>
        <Text style={styles.teamName}>{item.home_team}</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>{item.home_score}</Text>
          <Text style={styles.scoreDivider}>-</Text>
          <Text style={styles.score}>{item.away_score}</Text>
        </View>
        <Text style={styles.teamName}>{item.away_team}</Text>
      </View>
      <View style={styles.resultDetails}>
        <Text style={styles.detailText}>📍 {item.venue}</Text>
        <Text style={styles.detailText}>📅 {item.match_date}</Text>
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
      {results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#124491']} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No results available</Text>
          <Text style={styles.emptySubtitle}>
            Match results will appear here
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
  resultCard: {
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
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#124491',
  },
  scoreDivider: {
    fontSize: 20,
    color: '#94a3b8',
    marginHorizontal: 8,
  },
  resultDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
