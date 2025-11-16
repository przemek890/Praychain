import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Image, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ArrowRight, Coins, RefreshCw, ArrowLeft, Info, Users, Target } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight } from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useCallback } from 'react'; // ✅ Dodane useCallback
import { useCharity, CharityAction } from '@/hooks/useCharity';
import { useTokens } from '@/hooks/useTokens';
import { getCurrentUserId } from '@/config/currentUser';
import { useFocusEffect } from 'expo-router'; // ✅ Dodane

const { width } = Dimensions.get('window');

export default function TokensScreen() {
  const { t } = useLanguage();
  const userId = getCurrentUserId();
  const { balance: userTokens, loading: tokensLoading, refresh: refreshTokens } = useTokens(userId);
  const { charities, loading: charitiesLoading, error, donateToCharity, refresh: refreshCharities } = useCharity();
  const [selectedCharity, setSelectedCharity] = useState<CharityAction | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [selectedMultiplier, setSelectedMultiplier] = useState<number | null>(null);
  const [donating, setDonating] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null); // ✅ NOWE

  useFocusEffect(
    useCallback(() => {
      console.log('Tokens tab focused - refreshing balance');
      refreshTokens();
    }, [])
  );

  const handleSelectCharity = (charity: CharityAction) => {
    setSelectedCharity(charity);
    setDonationAmount('');
    setSelectedMultiplier(null);
    setAmountError(null); // ✅ NOWE
  };

  // ✅ NOWA FUNKCJA - walidacja w czasie rzeczywistym
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
      setAmountError(`Insufficient balance. You have ${userTokens} PRAY tokens`); // ✅ KOMUNIKAT
      return;
    }
    
    setAmountError(null);
  };

  const handleDonate = async () => {
    if (!selectedCharity || !donationAmount || amountError) return;

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
      
      // ✅ Cofnij bez modalu
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

  const loading = tokensLoading || charitiesLoading;

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

  if (selectedCharity) {
    const amount = parseInt(donationAmount) || 0;
    const isValidAmount = amount >= selectedCharity.cost_tokens && amount <= userTokens && !amountError;
    const progress = selectedCharity.goal_tokens 
      ? (selectedCharity.total_tokens_raised / selectedCharity.goal_tokens) * 100 
      : 0;

    return (
      <View style={styles.container}>
        {/* ✅ NOWE - Biały status bar */}
        <StatusBar barStyle="light-content" />
        
        <LinearGradient
          colors={['#fef3c7', '#fde68a', '#fbbf24']}
          style={styles.donationGradient}
        >
          {/* Header with Image Background */}
          <Animated.View entering={FadeIn} style={styles.donationImageContainer}>
            {selectedCharity.image_url && (
              <Image
                source={{ uri: selectedCharity.image_url }}
                style={styles.donationBgImage}
                blurRadius={3}
              />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />
            
            <Pressable
              style={styles.backButtonFloating}
              onPress={() => {
                setSelectedCharity(null);
                setDonationAmount('');
                setAmountError(null);
              }}
            >
              <ArrowLeft size={24} color="#ffffff" />
            </Pressable>

            <Animated.View entering={FadeInUp.delay(100)} style={styles.donationHeaderOverlay}>
              <Text style={styles.donationTitleLarge}>{selectedCharity.title}</Text>
              <View style={styles.orgBadge}>
                <Text style={styles.donationOrgWhite}>{selectedCharity.organization}</Text>
              </View>
              <View style={{ height: 8 }} />
            </Animated.View>
          </Animated.View>

          <ScrollView 
            style={styles.donationScrollContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.donationScrollPadding}
          >
            {/* Description Card */}
            <Animated.View entering={FadeInDown.delay(250)}>
              <LinearGradient
                colors={['#fef3c7', '#fde68a']}
                style={styles.descriptionCard}
              >
                <View style={styles.descriptionHeader}>
                  <Info size={20} color="#92400e" />
                  <Text style={styles.descriptionTitle}>About this cause</Text>
                </View>
                <Text style={[styles.descriptionText, { color: '#92400e' }]}>
                  {selectedCharity.description}
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Progress Card */}
            {selectedCharity.goal_tokens && (
              <Animated.View entering={FadeInDown.delay(300)}>
                <LinearGradient
                  colors={['#ffffff', '#f3f4f6']}
                  style={styles.progressCard}
                >
                  <View style={styles.progressCardHeader}>
                    <Target size={20} color="#92400e" />
                    <Text style={styles.progressCardTitle}>Campaign Progress</Text>
                  </View>
                  
                  <View style={styles.progressStatsRow}>
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatValue}>{selectedCharity.total_tokens_raised}</Text>
                      <Text style={styles.progressStatLabel}>Raised</Text>
                    </View>
                    <View style={styles.progressStatDivider} />
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatValue}>{selectedCharity.goal_tokens}</Text>
                      <Text style={styles.progressStatLabel}>Goal</Text>
                    </View>
                    <View style={styles.progressStatDivider} />
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatValue}>{selectedCharity.total_supported}</Text>
                      <Text style={styles.progressStatLabel}>Supporters</Text>
                    </View>
                  </View>

                  <View style={styles.progressBarLarge}>
                    <Animated.View 
                      entering={SlideInRight.delay(400).duration(800)}
                      style={[styles.progressFillLarge, { width: `${Math.min(progress, 100)}%` }]}
                    >
                      <LinearGradient
                        colors={['#22c55e', '#16a34a']}
                        style={styles.progressGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </Animated.View>
                  </View>
                  <Text style={styles.progressPercentage}>{Math.round(progress)}% funded</Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Donation Amount Section */}
            <Animated.View entering={FadeInDown.delay(400)} style={styles.amountSection}>
              <Text style={styles.amountLabelLarge}>{t.tokens.donationAmount}</Text>
              
              <View style={styles.donationInputContainer}>
                <TextInput
                  style={[
                    styles.amountInputCompact,
                    amountError && styles.amountInputError
                  ]}
                  placeholder="Enter amount..."
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  value={donationAmount}
                  onChangeText={validateAmount}
                />
                
                <View style={styles.multiplierContainer}>
                  {[
                    { label: '1×', value: 1 },
                    { label: '1.5×', value: 1.5 },
                    { label: '2×', value: 2 },
                    { label: '5×', value: 5 },
                    { label: '10×', value: 10 },
                  ].map((multiplier) => {
                    const calculatedAmount = Math.floor(selectedCharity.cost_tokens * multiplier.value);
                    const isSelected = selectedMultiplier === multiplier.value;
                    const isDisabled = calculatedAmount > userTokens;
                    
                    return (
                      <Pressable
                        key={multiplier.label}
                        style={[
                          styles.multiplierButton,
                          isSelected && styles.multiplierButtonActive,
                          isDisabled && styles.multiplierButtonDisabled,
                        ]}
                        onPress={() => {
                          if (!isDisabled) {
                            setSelectedMultiplier(multiplier.value);
                            validateAmount(calculatedAmount.toString());
                          }
                        }}
                        disabled={isDisabled}
                      >
                        <Text style={[
                          styles.multiplierButtonText,
                          isSelected && styles.multiplierButtonTextActive,
                          isDisabled && styles.multiplierButtonTextDisabled,
                        ]}>
                          {multiplier.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              
              {/* ✅ MINIMUM TOKENS INFO - ZAWSZE WIDOCZNE */}
              <View style={styles.minTokensInfo}>
                <Info size={14} color="#78716c" />
                <Text style={styles.minTokensInfoText}>
                  Minimum {selectedCharity.cost_tokens} tokens required
                </Text>
              </View>
              
              {/* ✅ KOMUNIKAT BŁĘDU - TYLKO GDY JEST BŁĄD */}
              {amountError && (
                <View style={styles.errorMessageInfo}>
                  <Info size={14} color="#dc2626" />
                  <Text style={styles.errorMessageInfoText}>{amountError}</Text>
                </View>
              )}
            </Animated.View>

            {/* Donate Button */}
            <Animated.View entering={FadeInUp.delay(450)}>
              <Pressable
                style={[
                  styles.donateButtonLarge,
                  (!isValidAmount || donating) && styles.donateButtonDisabled
                ]}
                onPress={handleDonate}
                disabled={!isValidAmount || donating}
              >
                <LinearGradient
                  colors={isValidAmount && !donating ? ['#16a34a', '#15803d', '#166534'] : ['#a3a3a3', '#737373']}
                  style={styles.donateGradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {donating ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Heart size={24} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.donateButtonTextLarge}>
                        Donate {amount > 0 ? `${amount} ` : ''}PRAY
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ NOWE - Ciemny status bar dla głównego widoku */}
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        <Animated.View entering={FadeInDown} style={styles.header}>
          <View style={styles.iconContainer}>
            <Coins size={40} color="#92400e" strokeWidth={2} />
          </View>
          <Text style={styles.title}>{t.nav.tokens}</Text>
          <Text style={styles.subtitle}>{t.tokens.subtitle}</Text>
        </Animated.View>


        <ScrollView style={styles.charitiesList} showsVerticalScrollIndicator={false}>
          {charities.map((charity, index) => (
            <Animated.View
              key={charity._id}
              entering={FadeInDown.delay(200 + index * 50)}
            >
              <CharityCard
                charity={charity}
                onSelect={() => handleSelectCharity(charity)}
                t={t}
              />
            </Animated.View>
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
          <View style={styles.charityHeader}>
            <View style={styles.charityInfo}>
              <Text style={styles.charityTitle}>{charity.title}</Text>
              <Text style={styles.charityOrg}>{charity.organization}</Text>
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
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1c1917',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  balanceBanner: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceBannerLabel: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 2,
  },
  balanceBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceBannerAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  charitiesList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 16,
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
  
  // DONATION SCREEN STYLES
  donationGradient: {
    flex: 1,
  },
  donationImageContainer: {
    height: 280,
    position: 'relative',
  },
  donationBgImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButtonFloating: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  donationHeaderOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  donationTitleLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  orgBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backdropFilter: 'blur(10px)',
  },
  donationOrgWhite: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  donationScrollContent: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fafaf9',
  },
  donationScrollPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  impactCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  impactIconContainer: {
    marginRight: 16,
  },
  impactTextContainer: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  impactDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.95,
    lineHeight: 20,
  },
  descriptionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  descriptionText: {
    fontSize: 14,
    color: '#57534e',
    lineHeight: 22,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
  },
  progressStatDivider: {
    width: 1,
    backgroundColor: '#e7e5e4',
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#e7e5e4',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLarge: {
    height: '100%',
  },
  progressPercentage: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
    textAlign: 'center',
  },
  balanceCardDonation: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceTextContainer: {
    marginLeft: 12,
  },
  balanceLabelDonation: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  balanceAmountDonation: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  charitiesList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 16,
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
  
  // DONATION SCREEN STYLES
  donationGradient: {
    flex: 1,
  },
  donationImageContainer: {
    height: 280,
    position: 'relative',
  },
  donationBgImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButtonFloating: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    backdropFilter: 'blur(10px)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  donationHeaderOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  donationTitleLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  orgBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backdropFilter: 'blur(10px)',
  },
  donationOrgWhite: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  donationScrollContent: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fafaf9',
  },
  donationScrollPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  impactCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  impactIconContainer: {
    marginRight: 16,
  },
  impactTextContainer: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  impactDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.95,
    lineHeight: 20,
  },
  descriptionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  descriptionText: {
    fontSize: 14,
    color: '#57534e',
    lineHeight: 22,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
  },
  progressStatDivider: {
    width: 1,
    backgroundColor: '#e7e5e4',
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#e7e5e4',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLarge: {
    height: '100%',
  },
  progressPercentage: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
    textAlign: 'center',
  },
  balanceCardDonation: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceTextContainer: {
    marginLeft: 12,
  },
  balanceLabelDonation: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  balanceAmountDonation: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  amountSection: {
    marginBottom: 16,
  },
  amountLabelLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 12,
  },
  amountInputLarge: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  donationInputContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  amountInputCompact: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  multiplierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  multiplierButton: {
    flex: 1,
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  multiplierButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  multiplierButtonDisabled: {
    opacity: 0.5,
  },
  multiplierButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },
  multiplierButtonTextActive: {
    color: '#ffffff',
  },
  multiplierButtonTextDisabled: {
    color: '#78716c',
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  minTokensInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  minTokensInfoText: {
    fontSize: 14,
    color: '#78716c',
  },
  donateButtonLarge: {
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
  donateGradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  donateButtonTextLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },

  // ✅ NOWE STYLE
  amountInputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  
  // ✅ NOWY STYL - identyczny jak minTokensInfo
  errorMessageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  errorMessageInfoText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
});