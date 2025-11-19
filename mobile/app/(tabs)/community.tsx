import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Heart, MessageCircle, Flame, Trophy, Award, Medal, Plus, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { useCommunity, PrayerRequest, TopUser } from '@/hooks/useCommunity';

export default function CommunityScreen() {
  const { t } = useLanguage();
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRequest, setNewRequest] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const { prayerRequests, topUsers, loading, addPrayerRequest, sendPrayer } = useCommunity();

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const displayedRequests = showAllRequests ? prayerRequests : prayerRequests.slice(0, 3);

  const handleAddRequest = () => {
    if (newRequest.trim()) {
      addPrayerRequest(newRequest, t.community.youName || 'You');
      setNewRequest('');
      setShowAddModal(false);
    }
  };

  const handleSendPrayer = (requestId: string) => {
    sendPrayer(requestId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>{t.community.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.titleRow}>
            <Users size={32} color="#92400e" strokeWidth={2} />
            <Text style={styles.title}>{t.nav.community}</Text>
          </View>
          <Text style={styles.subtitle}>{t.community.subtitle}</Text>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Trophy size={20} color="#92400e" />
              <Text style={styles.sectionTitle}>{t.community.topCommunityMembers}</Text>
            </View>

            {topUsers.map((user) => (
              <View key={user.id}>
                <TopUserCard user={user} />
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Heart size={20} color="#92400e" />
              <Text style={styles.sectionTitle}>{t.community.recentPrayerRequests}</Text>
              <Pressable
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color="#ffffff" />
              </Pressable>
            </View>

            {displayedRequests.map((request) => (
              <View key={request.id}>
                <PrayerRequestCard request={request} onSendPrayer={handleSendPrayer} />
              </View>
            ))}

            {prayerRequests.length > 3 && (
              <Pressable
                style={styles.showMoreButton}
                onPress={() => setShowAllRequests(!showAllRequests)}
              >
                <LinearGradient
                  colors={['#fef3c7', '#fde68a']}
                  style={styles.showMoreGradient}
                >
                  {showAllRequests ? (
                    <>
                      <ChevronUp size={18} color="#92400e" />
                      <Text style={styles.showMoreText}>{t.community.showLess}</Text>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={18} color="#92400e" />
                      <Text style={styles.showMoreText}>
                        {t.community.showMore} ({prayerRequests.length - 3})
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>

        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.community.addRequestTitle}</Text>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <X size={24} color="#78716c" />
                </Pressable>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder={t.community.requestPlaceholder}
                placeholderTextColor="#a8a29e"
                multiline
                numberOfLines={4}
                value={newRequest}
                onChangeText={setNewRequest}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.modalButton, !newRequest.trim() && styles.modalButtonDisabled]}
                onPress={handleAddRequest}
                disabled={!newRequest.trim()}
              >
                <LinearGradient
                  colors={newRequest.trim() ? ['#16a34a', '#15803d'] : ['#a3a3a3', '#737373']}
                  style={styles.modalButtonGradient}
                >
                  <Heart size={18} color="#ffffff" />
                  <Text style={styles.modalButtonText}>{t.community.addPrayerButton}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

function TopUserCard({ user }: { user: TopUser }) {
  const { t } = useLanguage();
  const getRankColors = (rank: number) => {
    if (rank === 1) return { gradient: ['#fbbf24', '#f59e0b'] as const, badge: '#f59e0b' };
    if (rank === 2) return { gradient: ['#d1d5db', '#9ca3af'] as const, badge: '#9ca3af' };
    if (rank === 3) return { gradient: ['#fcd34d', '#fbbf24'] as const, badge: '#fbbf24' };
    return { gradient: ['#ffffff', '#fafaf9'] as const, badge: '#e7e5e4' };
  };

  const colors = getRankColors(user.rank);
  const RankIcon = user.rank === 1 ? Trophy : user.rank === 2 ? Medal : Award;

  return (
    <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.topUserCard}>
      <LinearGradient
        colors={colors.gradient}
        style={styles.rankBadge}
      >
        <RankIcon size={20} color={user.rank <= 3 ? '#ffffff' : '#78716c'} />
      </LinearGradient>
      
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.rankTag}>
            <Text style={styles.rankTagText}>#{user.rank}</Text>
          </View>
        </View>
        
        <View style={styles.userStats}>
          <View style={styles.userStat}>
            <View style={styles.statIconContainer}>
              <Trophy size={14} color="#92400e" />
            </View>
            <Text style={styles.userStatValue}>{user.points}</Text>
            <Text style={styles.userStatLabel}>{t.community.pts}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.userStat}>
            <Flame size={14} color="#dc2626" />
            <Text style={styles.userStatValue}>{user.streak}</Text>
            <Text style={styles.userStatLabel}>{t.community.dayStreak}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

function PrayerRequestCard({ request, onSendPrayer }: { request: PrayerRequest; onSendPrayer: (id: string) => void }) {
  const { t } = useLanguage();
  const [hasPrayed, setHasPrayed] = useState(false);
  
  const handlePrayerPress = () => {
    if (!hasPrayed) {
      setHasPrayed(true);
      onSendPrayer(request.id);
    }
  };

  return (
    <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{request.user.charAt(0)}</Text>
        </View>
        <View style={styles.requestUserInfo}>
          <Text style={styles.requestUser}>{request.user}</Text>
          <Text style={styles.requestTime}>{request.time}</Text>
        </View>
      </View>
      
      <Text style={styles.requestText}>{request.request}</Text>
      
      <View style={styles.requestFooter}>
        <Pressable style={styles.prayButton} onPress={handlePrayerPress} disabled={hasPrayed}>
          <LinearGradient
            colors={hasPrayed ? ['#d1fae5', '#a7f3d0'] : ['#fee2e2', '#fecaca']}
            style={styles.prayButtonGradient}
          >
            <Heart size={16} color={hasPrayed ? '#16a34a' : '#dc2626'} fill={hasPrayed ? '#16a34a' : 'none'} />
            <Text style={[styles.prayButtonText, hasPrayed && styles.prayButtonTextSent]}>
              {hasPrayed ? `✓ ${t.community.sent}` : t.community.sendPrayer}
            </Text>
          </LinearGradient>
        </Pressable>
        
        <View style={styles.prayerCount}>
          <Heart size={14} color="#dc2626" fill="#dc2626" />
          <Text style={styles.prayerCountText}>{request.prayers}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716c',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  topUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  rankTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#44403c',
  },
  userStatLabel: {
    fontSize: 12,
    color: '#78716c',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e7e5e4',
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  requestUserInfo: {
    flex: 1,
  },
  requestUser: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#78716c',
  },
  requestText: {
    fontSize: 15,
    color: '#44403c',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  prayButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  prayButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  prayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  prayButtonTextSent: {
    color: '#16a34a',
  },
  prayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  prayerCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  showMoreButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  showMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  modalInput: {
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1c1917',
    minHeight: 120,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});