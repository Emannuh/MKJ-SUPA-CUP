import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { teamManagerAPI } from '../../src/api/client'
import { useAuth } from '../../src/hooks/useAuth'

interface Player {
  id: number
  first_name: string
  last_name: string
  national_id_number: string
  date_of_birth: string
  age: number
  position: string
  photo?: string
  id_document?: string
  birth_certificate?: string
}

export default function LonglistScreen() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)
  const { user } = useAuth()
  const router = useRouter()

  const fetchLonglist = useCallback(async () => {
    try {
      const response = await teamManagerAPI.getLonglist()
      setPlayers(response.data.players || [])
      setPlayerCount(response.data.player_count || 0)
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load player longlist')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchLonglist()
  }, [fetchLonglist])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLonglist()
  }

  const handleDeletePlayer = async (playerId: number, playerName: string) => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to remove ${playerName} from the longlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teamManagerAPI.deletePlayer(String(playerId))
              Alert.alert('Success', `${playerName} removed from the longlist`)
              fetchLonglist()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete player')
            }
          },
        },
      ]
    )
  }

  const handleAddPlayer = () => {
    // Navigate to add player screen
    router.push('/(portal)/add-player')
  }

  const handleEditPlayer = (playerId: number) => {
    // Navigate to edit player screen
    router.push(`/(portal)/edit-player/${playerId}`)
  }

  const renderPlayer = ({ item }: { item: Player }) => {
    const hasDocs = item.id_document || item.birth_certificate
    
    return (
      <View style={styles.playerCard}>
        <View style={styles.playerHeader}>
          <View style={styles.playerPhoto}>
            {item.photo ? (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {item.first_name[0]}{item.last_name[0]}
                </Text>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {item.first_name[0]}{item.last_name[0]}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.playerDetail}>
              {item.position || 'No position'} • Age {item.age || '?'}
            </Text>
            <Text style={styles.playerId}>ID: {item.national_id_number}</Text>
          </View>
          <View style={styles.playerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPlayer(item.id)}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeletePlayer(item.id, `${item.first_name} ${item.last_name}`)}
            >
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.playerFooter}>
          {hasDocs ? (
            <Text style={styles.docsOk}>✓ Docs OK</Text>
          ) : (
            <Text style={styles.docsMissing}>⚠ Missing Docs</Text>
          )}
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#124491" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          ℹ️ No submission needed. The WSCC reviews all ward teams directly — just keep your player list up to date.
        </Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{playerCount} players registered</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPlayer}>
          <Text style={styles.addButtonText}>+ Add Player</Text>
        </TouchableOpacity>
      </View>

      {/* Player List */}
      {players.length > 0 ? (
        <FlatList
          data={players}
          renderItem={renderPlayer}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#124491']} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No players yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first player to get started
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddPlayer}>
            <Text style={styles.emptyButtonText}>Add First Player</Text>
          </TouchableOpacity>
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
  infoBanner: {
    backgroundColor: '#dbeafe',
    padding: 12,
    paddingHorizontal: 16,
  },
  infoBannerText: {
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 18,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statsText: {
    fontSize: 14,
    color: '#64748b',
  },
  addButton: {
    backgroundColor: '#124491',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  playerHeader: {
    flexDirection: 'row',
    padding: 12,
  },
  playerPhoto: {
    marginRight: 12,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#124491',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  playerDetail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  playerId: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
  playerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 10,
    paddingHorizontal: 12,
  },
  docsOk: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  docsMissing: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#124491',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
