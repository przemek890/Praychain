import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Image, Dimensions, StatusBar, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ArrowRight, Coins, RefreshCw, ArrowLeft, Info, Users, Target, X, TrendingUp, Trophy, Crown, Building2, Tag } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useCharity, CharityAction, useCharityDonors } from '@/hooks/useCharity';
import { useTokens } from '@/hooks/useTokens';
import { useFocusEffect } from 'expo-router';
import { useUserDataRefresh } from '@/contexts/UserDataContext';
import { useUserData } from '@/hooks/useUserData';

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    health: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
    education: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' },
    environment: { bg: '#d1fae5', border: '#10b981', text: '#047857' },
    humanitarian: { bg: '#fce7f3', border: '#db2777', text: '#9f1239' },
    animals: { bg: '#fed7aa', border: '#ea580c', text: '#9a3412' },
    children: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },
  };
  return colors[category] || { bg: '#f3f4f6', border: '#6b7280', text: '#374151' };
};


export default function TokensScreen() {
  const { t } = useLanguage();
  const { userData, loading: userDataLoading } = useUserData();
  const userId = userData?.id || '';
  
  const { balance: userTokens, loading: tokensLoading, refresh: refreshTokens } = useTokens(userId);
  const { charities, loading: charitiesLoading, error, donateToCharity, refresh: refreshCharities } = useCharity();
  const [selectedCharity, setSelectedCharity] = useState<CharityAction | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [selectedMultiplier, setSelectedMultiplier] = useState<number | null>(null);
  const [donating, setDonating] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [supportersModalVisible, setSupportersModalVisible] = useState(false);
  const { donors, loading: donorsLoading } = useCharityDonors(selectedCharity?._id || null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { triggerRefresh } = useUserDataRefresh();

  useFocusEffect(
    useCallback(() => {
      console.log('Tokens tab focused - refreshing balance');
      if (userId) {
        refreshTokens();
      }
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }, [userId, refreshTokens])
  );

  useEffect(() => {
    if (!tokensLoading && !charitiesLoading && !userDataLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [tokensLoading, charitiesLoading, userDataLoading]);

  const handleSelectCharity = (charity: CharityAction) => {
    setSelectedCharity(charity);
    setDonationAmount('');
    setSelectedMultiplier(null);
    setAmountError(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    
    // Trigger animation after a short delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);
  };

  const validateAmount = (text: string) => {
    setDonationAmount(text);
    setSelectedMultiplier(null);
    
    if (!text || text === '') {
      setAmountError(null);
      return;
    }
    
    const amount = parseInt(text);
    
    if (isNaN(amount) || amount <= 0) {
      setAmountError('Please enter a valid amount');
      return;
    }
    
    if (selectedCharity && amount < selectedCharity.cost_tokens) {
      setAmountError(`Minimum ${selectedCharity.cost_tokens} tokens required`);
      return;
    }
    
    if (amount > userTokens) {
      setAmountError(`Insufficient balance. You have ${userTokens} PRAY tokens`);
      return;
    }
    
    setAmountError(null);
  };

  const handleDonate = async () => {
    if (!selectedCharity || !donationAmount || amountError || !userId) return;

    const amount = parseInt(donationAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setAmountError('Please enter a valid amount');
      return;
    }

    if (amount < selectedCharity.cost_tokens) {
      setAmountError(`Minimum ${selectedCharity.cost_tokens} tokens required`);
      return;
    }

    if (amount > userTokens) {
      setAmountError(`Insufficient balance. You have ${userTokens} PRAY tokens`);
      return;
    }

    try {
      setDonating(true);
      await donateToCharity(userId, selectedCharity._id, amount);
      
      await Promise.all([refreshTokens(), refreshCharities()]);
      
      console.log('Donation completed - triggering refresh');
      triggerRefresh();
      
      setSelectedCharity(null);
      setDonationAmount('');
      setAmountError(null);
    } catch (err: any) {
      console.error('Donation failed:', err);
      setAmountError(err.message || 'Donation failed');
    } finally {
      setDonating(false);
    }
  };

  const loading = tokensLoading || charitiesLoading || userDataLoading;

  if (!userId && !userDataLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#78350f20', '#44403c30', '#78350f25']}
          style={styles.gradient}
        >
          <View style={styles.centerContent}>
            <View style={styles.loginPromptCard}>
              <LinearGradient
                colors={['#ffffff', '#fafaf9']}
                style={styles.loginPromptGradient}
              >
                <Coins size={48} color="#92400e" strokeWidth={2} />
                <Text style={styles.loginPromptTitle}>{t.tokens.pleaseLogin}</Text>
                <Text style={styles.loginPromptSubtitle}>
                  {t.bibleReader.checkConnection}
                </Text>
                <Pressable 
                  style={styles.retryButtonError} 
                  onPress={() => {
                    refreshTokens();
                    refreshCharities();
                  }}
                >
                  <LinearGradient colors={['#92400e', '#78350f']} style={styles.retryButtonGradient}>
                    <RefreshCw size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>{t.tokens.retry}</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>{t.tokens.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{t.tokens.error}</Text>
        <Pressable 
          style={styles.retryButton} 
          onPress={() => {
            refreshTokens();
            refreshCharities();
          }}
        >
          <RefreshCw size={20} color="#92400e" />
          <Text style={styles.retryText}>{t.tokens.retry}</Text>
        </Pressable>
      </View>
    );
  }

  // ...existing code...

if (selectedCharity) {
  const amount = parseInt(donationAmount) || 0;
  const isValidAmount = amount >= selectedCharity.cost_tokens && amount <= userTokens && !amountError;
  const progress = selectedCharity.goal_tokens 
    ? (selectedCharity.total_tokens_raised / selectedCharity.goal_tokens) * 100 
    : 0;
  
  const categoryColors = getCategoryColor(selectedCharity.category);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.detailContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section with Image */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          {selectedCharity.image_url && (
            <Image
              source={{ uri: selectedCharity.image_url }}
              style={styles.heroImage}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          />
          
          {/* Back Button */}
          <Pressable
            style={styles.backButton}
            onPress={() => {
              setSelectedCharity(null);
              setDonationAmount('');
              setAmountError(null);
            }}
          >
            <View style={styles.backButtonInner}>
              <ArrowLeft size={20} color="#1c1917" strokeWidth={2.5} />
            </View>
          </Pressable>

          {/* ✅ Title Overlay with Badges */}
          <View style={styles.heroContent}>
            {/* ✅ BADGE'Y - Category + Organization */}
            <View style={styles.heroBadgesRow}>
              {/* Category Badge */}
              <View style={[styles.heroCategoryBadge, { 
                backgroundColor: `${categoryColors.bg}dd`,
                borderColor: categoryColors.border 
              }]}>
                <Tag size={12} color={categoryColors.text} strokeWidth={2.5} />
                <Text style={[styles.heroCategoryText, { color: categoryColors.text }]}>
                  {selectedCharity.category}
                </Text>
              </View>

              {/* Organization Badge */}
              <View style={styles.heroOrgBadge}>
                <Building2 size={12} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.heroOrgText}>{selectedCharity.organization}</Text>
              </View>
            </View>

            {/* ✅ Patron Badge - jeśli istnieje */}
            {selectedCharity.patron && (
              <View style={styles.heroPatronBadge}>
                <Crown size={16} color="#fbbf24" strokeWidth={2.5} fill="#fbbf24" />
                <Text style={styles.heroPatronText}>{selectedCharity.patron}</Text>
              </View>
            )}

            <Text style={styles.heroTitle}>{selectedCharity.title}</Text>
          </View>
        </Animated.View>

        {/* ...existing code continues... */}

          {/* Content Section */}
          <View style={styles.contentSection}>
            {/* Stats Row */}
            <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.statCard}>
                <LinearGradient colors={['#dcfce7', '#bbf7d0']} style={styles.statGradient}>
                  <TrendingUp size={20} color="#166534" strokeWidth={2.5} />
                  <Text style={styles.statValue}>{selectedCharity.total_tokens_raised}</Text>
                  <Text style={styles.statLabel}>{t.tokens.raised}</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient colors={['#dbeafe', '#bfdbfe']} style={styles.statGradient}>
                  <Target size={20} color="#1e40af" strokeWidth={2.5} />
                  <Text style={styles.statValue}>{selectedCharity.goal_tokens || 'N/A'}</Text>
                  <Text style={styles.statLabel}>{t.tokens.goal}</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient colors={['#fce7f3', '#fbcfe8']} style={styles.statGradient}>
                  <Heart size={20} color="#9f1239" strokeWidth={2.5} />
                  <Text style={styles.statValue}>{selectedCharity.total_supported}</Text>
                  <Text style={styles.statLabel}>{t.tokens.supporters}</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Progress Bar */}
            {selectedCharity.goal_tokens && (
              <Animated.View style={[styles.progressContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>{t.tokens.campaignProgress}</Text>
                  <Text style={styles.progressPercentageNew}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]}>
                    <LinearGradient
                      colors={['#22c55e', '#16a34a', '#15803d']}
                      style={styles.progressBarGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Description Card */}
            <Animated.View style={[styles.descriptionCardNew, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.descriptionHeader}>
                <Info size={18} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.descriptionTitleNew}>{t.tokens.aboutThisCause}</Text>
              </View>
              <Text style={styles.descriptionTextNew}>{selectedCharity.description}</Text>
            </Animated.View>

            {/* Donation Amount Section */}
            <Animated.View style={[styles.donationSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.donationTitleRow}>
                <Text style={styles.donationTitle}>{t.tokens.donationAmount}</Text>
                
                {/* Top Supporters Badge */}
                {donors.length > 0 && (
                  <Pressable 
                    style={styles.supportersBadge}
                    onPress={() => setSupportersModalVisible(true)}
                  >
                    <Trophy size={14} color="#92400e" strokeWidth={2.5} />
                    <Text style={styles.supportersBadgeText}>Top {donors.length}</Text>
                  </Pressable>
                )}
              </View>
              
              <View style={styles.amountInputWrapper}>
                <View style={styles.amountInputContainer}>
                  <Coins size={20} color="#92400e" strokeWidth={2} />
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    value={donationAmount}
                    onChangeText={validateAmount}
                  />
                  <Text style={styles.amountCurrency}>PRAY</Text>
                </View>
              </View>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountsContainer}>
                {[1, 1.5, 2, 5, 10].map((multiplier) => {
                  const calculatedAmount = Math.floor(selectedCharity.cost_tokens * multiplier);
                  const isSelected = selectedMultiplier === multiplier;
                  const isDisabled = calculatedAmount > userTokens;
                  
                  return (
                    <Pressable
                      key={multiplier}
                      style={[
                        styles.quickAmountButton,
                        isSelected && styles.quickAmountButtonActive,
                        isDisabled && styles.quickAmountButtonDisabled,
                      ]}
                      onPress={() => {
                        if (!isDisabled) {
                          setSelectedMultiplier(multiplier);
                          validateAmount(calculatedAmount.toString());
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.quickAmountLabel,
                        isSelected && styles.quickAmountLabelActive,
                      ]}>
                        {multiplier}×
                      </Text>
                      <Text style={[
                        styles.quickAmountValue,
                        isSelected && styles.quickAmountValueActive,
                        isDisabled && styles.quickAmountValueDisabled,
                      ]}>
                        {calculatedAmount}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Info/Error Messages */}
              {!amountError && (
                <View style={styles.infoMessage}>
                  <Info size={14} color="#78716c" />
                  <Text style={styles.infoMessageText}>
                    {t.tokens.minimumRequired?.replace('{amount}', selectedCharity.cost_tokens.toString()) || 
                     `Minimum ${selectedCharity.cost_tokens} tokens required`}
                  </Text>
                </View>
              )}
              
              {amountError && (
                <View style={styles.errorMessage}>
                  <Info size={14} color="#dc2626" />
                  <Text style={styles.errorMessageText}>{amountError}</Text>
                </View>
              )}
            </Animated.View>

            {/* Donate Button */}
            <Animated.View style={[styles.donateButtonContainer, { opacity: fadeAnim }]}>
              <Pressable
                style={[
                  styles.donateButton,
                  (!isValidAmount || donating) && styles.donateButtonDisabled
                ]}
                onPress={handleDonate}
                disabled={!isValidAmount || donating}
              >
                <LinearGradient
                  colors={isValidAmount && !donating ? ['#16a34a', '#15803d', '#166534'] : ['#a3a3a3', '#737373']}
                  style={styles.donateButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {donating ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Heart size={22} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.donateButtonText}>
                        {amount > 0 ? `${t.tokens.donateTokens} ${amount} PRAY` : t.tokens.donateTokens}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>

        {/* Top Supporters Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={supportersModalVisible}
          onRequestClose={() => setSupportersModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackdrop} 
              onPress={() => setSupportersModalVisible(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Trophy size={24} color="#92400e" strokeWidth={2.5} />
                  <Text style={styles.modalTitle}>
                    {t.tokens.topSupporters}
                  </Text>
                </View>
                <Pressable 
                  style={styles.modalCloseButton}
                  onPress={() => setSupportersModalVisible(false)}
                >
                  <X size={24} color="#78716c" strokeWidth={2} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.supportersList}>
                  {donors.map((donor, index) => (
                    <View key={donor.user_id} style={styles.supporterCard}>
                      <View style={[styles.supporterRank, index < 3 && styles.supporterRankTop]}>
                        <Text style={[styles.supporterRankText, index < 3 && styles.supporterRankTextTop]}>
                          #{index + 1}
                        </Text>
                      </View>
                      <View style={styles.supporterInfo}>
                        <Text style={styles.supporterName}>{donor.username}</Text>
                        <Text style={styles.supporterAmount}>{donor.total_donated} PRAY</Text>
                      </View>
                      <Heart 
                        size={16} 
                        color="#dc2626" 
                        fill={index < 3 ? "#dc2626" : "none"}
                        strokeWidth={2}
                      />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.titleRow}>
            <Coins size={32} color="#92400e" strokeWidth={2} />
            <Text style={styles.title}>{t.nav.tokens}</Text>
          </View>
          <Text style={styles.subtitle}>{t.tokens.subtitle}</Text>
        </Animated.View>

        <ScrollView style={styles.charitiesList} showsVerticalScrollIndicator={false}>
          {charities.map((charity) => (
            <View key={charity._id}>
              <CharityCard
                charity={charity}
                onSelect={() => handleSelectCharity(charity)}
                t={t}
              />
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function CharityCard({ charity, onSelect, t }: { charity: CharityAction; onSelect: () => void; t: any }) {
  const progress = charity.goal_tokens 
    ? (charity.total_tokens_raised / charity.goal_tokens) * 100 
    : 0;

  const endDate = charity.deadline 
    ? new Date(charity.deadline).toLocaleDateString() 
    : null;

  const categoryColors = getCategoryColor(charity.category);

  return (
    <Pressable onPress={onSelect}>
      <LinearGradient
        colors={['#ffffff', '#fafaf9']}
        style={styles.charityCard}
      >
        {charity.image_url && (
          <Image
            source={{ uri: charity.image_url }}
            style={styles.charityImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.charityContent}>
          {/* ✅ BADGE'Y - Category + Organization */}
          <View style={styles.badgesRow}>
            {/* Category Badge */}
            <View style={[styles.categoryBadge, { 
              backgroundColor: categoryColors.bg,
              borderColor: categoryColors.border 
            }]}>
              <Tag size={12} color={categoryColors.text} strokeWidth={2.5} />
              <Text style={[styles.categoryBadgeText, { color: categoryColors.text }]}>
                {charity.category}
              </Text>
            </View>

            {/* Organization Badge */}
            <View style={styles.organizationBadge}>
              <Building2 size={12} color="#92400e" strokeWidth={2.5} />
              <Text style={styles.organizationBadgeText}>
                {charity.organization}
              </Text>
            </View>
          </View>

          {/* ✅ Patron Badge - jeśli istnieje */}
          {charity.patron && (
            <View style={styles.patronBadge}>
              <Crown size={14} color="#f59e0b" strokeWidth={2.5} />
              <Text style={styles.patronText}>{charity.patron}</Text>
            </View>
          )}

          <View style={styles.charityHeader}>
            <View style={styles.charityInfo}>
              <Text style={styles.charityTitle}>{charity.title}</Text>
              <Text style={styles.charityDescription} numberOfLines={2}>
                {charity.description}
              </Text>
            </View>
          </View>

          {charity.goal_tokens && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}>
                  <LinearGradient
                    colors={['#16a34a', '#15803d']}
                    style={styles.progressGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
              <View style={styles.progressStats}>
                <Text style={styles.progressText}>
                  {charity.total_tokens_raised} / {charity.goal_tokens}
                </Text>
                {endDate && <Text style={styles.endDate}>{t.tokens.until} {endDate}</Text>}
              </View>
            </View>
          )}

          <View style={styles.charityFooter}>
            <Text style={styles.minDonation}>
              {t.tokens.minDonation} {charity.cost_tokens}
            </Text>
            <View style={styles.supportButton}>
              <Text style={styles.supportButtonText}>{t.tokens.supportProject}</Text>
              <ArrowRight size={16} color="#92400e" />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
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
  charitiesList: {
    flex: 1,
  },
  charityCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  charityImage: {
    width: '100%',
    height: 160,
  },
  charityContent: {
    padding: 16,
  },
  charityHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  charityInfo: {
    flex: 1,
  },
  charityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
  },
  charityOrg: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  charityDescription: {
    fontSize: 14,
    color: '#78716c',
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e7e5e4',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#44403c',
    fontWeight: '600',
  },
  endDate: {
    fontSize: 12,
    color: '#78716c',
  },
  charityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minDonation: {
    fontSize: 12,
    color: '#78716c',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  
  // DETAIL SCREEN STYLES
  detailContainer: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  heroSection: {
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  orgBadgeNew: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    backdropFilter: 'blur(10px)',
  },
  orgBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1917',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#78716c',
    marginTop: 2,
    fontWeight: '500',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  progressPercentageNew: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e7e5e4',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressBarGradient: {
    flex: 1,
  },
  descriptionCardNew: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  descriptionTitleNew: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  descriptionTextNew: {
    fontSize: 14,
    color: '#57534e',
    lineHeight: 22,
  },
  donationSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  donationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  supportersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  supportersBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  amountInputWrapper: {
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#e7e5e4',
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: '#1c1917',
    textAlign: 'center',
    paddingVertical: 12,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78716c',
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f5f5f4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountButtonActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  quickAmountButtonDisabled: {
    opacity: 0.4,
  },
  quickAmountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 2,
  },
  quickAmountLabelActive: {
    color: '#92400e',
  },
  quickAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1917',
  },
  quickAmountValueActive: {
    color: '#92400e',
  },
  quickAmountValueDisabled: {
    color: '#a8a29e',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 12,
    color: '#78716c',
    lineHeight: 16,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  errorMessageText: {
    flex: 1,
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
    lineHeight: 16,
  },
  donateButtonContainer: {
    marginBottom: 20,
  },
  donateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  donateButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  donateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  donateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  supportersList: {
    paddingVertical: 20,
    gap: 12,
  },
  supporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  supporterRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supporterRankTop: {
    backgroundColor: '#fef3c7',
  },
  supporterRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716c',
  },
  supporterRankTextTop: {
    color: '#92400e',
  },
  supporterInfo: {
    flex: 1,
  },
  supporterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  supporterAmount: {
    fontSize: 13,
    color: '#78716c',
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#78716c',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  loginPromptCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 400,
  },
  loginPromptGradient: {
    padding: 32,
    alignItems: 'center',
  },
  loginPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginPromptSubtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButtonError: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
    badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  organizationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  organizationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  patronBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fbbf24',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  patronText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },

  // ✅ NOWE STYLE DLA BADGE'ÓW - HERO DETAIL
  heroBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  heroOrgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
    heroOrgText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroPatronBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    backdropFilter: 'blur(10px)',
  },
  heroPatronText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
