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

interface Standing {
  position: number
  team_name: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

export default function StandingsScreen() {
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStandings = useCallback(async () => {
    try {
      // For demo, using mock data - in production, fetch from API
      const mockStandings: Standing[] = [
        { position: 1, team_name: 'Wote Ward FC', played: 5, won: 4, drawn: 1, lost: 0, goals_for: 12, goals_against: 3, goal_difference: 9, points: 13 },
        { position: 2, team_name: 'Mavindini United', played: 5, won: 3, drawn: 2, lost: 0, goals_for: 10, goals_against: 4, goal_difference: 6, points: 11 },
        { position: 3, team_name: 'Kathonzweni Stars', played: 5, won: 3, drawn: 1, lost: 1, goals_for: 8, goals_against: 5, goal_difference: 3, points: 10 },
        { position: 4, team_name: 'Nzaui Youth', played: 5, won: 2, drawn: 1, lost: 2, goals_for: 6, goals_against: 6, goal_difference: 0, points: 7 },
        { position: 5, team_name: 'Mbitini FC', played: 5, won: 1, drawn: 2, lost: 2, goals_for: 4, goals_against: 7, goal_difference: -3, points: 5 },
      ]
      setStandings(mockStandings)
    } catch (error) {
      console.error('Failed to fetch standings:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStandings()
  }, [fetchStandings])

  const onRefresh = () => {
    setRefreshing(true)
    fetchStandings()
  }

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.positionCell]}>#</Text>
      <Text style={[styles.headerCell, styles.teamCell]}>Team</Text>
      <Text style={[styles.headerCell, styles.statCell]}>P</Text>
      <Text style={[styles.headerCell, styles.statCell]}>W</Text>
      <Text style={[styles.headerCell, styles.statCell]}>D</Text>
      <Text style={[styles.headerCell, styles.statCell]}>L</Text>
      <Text style={[styles.headerCell, styles.statCell]}>GD</Text>
      <Text style={[styles.headerCell, styles.statCell, styles.pointsCell]}>Pts</Text>
    </View>
  )

  const renderStanding = ({ item }: { item: Standing }) => (
    <View style={[styles.tableRow, item.position <= 2 && styles.topRow]}>
      <Text style={[styles.tableCell, styles.positionCell]}>{item.position}</Text>
      <Text style={[styles.tableCell, styles.teamCell]} numberOfLines={1}>
        {item.team_name}
      </Text>
      <Text style={[styles.tableCell, styles.statCell]}>{item.played}</Text>
      <Text style={[styles.tableCell, styles.statCell]}>{item.won}</Text>
      <Text style={[styles.tableCell, styles.statCell]}>{item.drawn}</Text>
      <Text style={[styles.tableCell, styles.statCell]}>{item.lost}</Text>
      <Text style={[styles.tableCell, styles.statCell]}>
        {item.goal_difference > 0 ? `+${item.goal_difference}` : item.goal_difference}
      </Text>
      <Text style={[styles.tableCell, styles.statCell, styles.pointsCell, styles.points]}>
        {item.points}
      </Text>
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
      <FlatList
        data={standings}
        renderItem={renderStanding}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#124491']} />
        }
      />
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#124491',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 4,
  },
  headerCell: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topRow: {
    backgroundColor: '#f0fdf4',
  },
  tableCell: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  positionCell: {
    width: 32,
  },
  teamCell: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  statCell: {
    width: 32,
  },
  pointsCell: {
    fontWeight: '600',
  },
  points: {
    color: '#124491',
  },
})
