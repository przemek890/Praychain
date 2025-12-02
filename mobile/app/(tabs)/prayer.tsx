import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Search, Play, AlertCircle, Mic, StopCircle, Check, BookOpen, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { usePrayerRecording } from '@/hooks/usePrayerRecording';
import { Audio } from 'expo-av';
import { useUserDataRefresh } from '@/contexts/UserDataContext';
import { useUserData } from '@/hooks/useUserData';

export default function PrayerScreen() {
  const { t } = useLanguage();
  const { triggerRefresh } = useUserDataRefresh();
  const { userData, loading: userDataLoading } = useUserData();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    prayers,
    loading,
    error,
    selectedPrayer,
    captchaQuote,
    isPrayerRecording,
    isCaptchaRecording,
    prayerTranscriptionId,
    isProcessing,
    result,
    initializeUserId,
    fetchPrayers,
    selectPrayer,
    startPrayerRecording,
    stopPrayerRecording,
    startCaptchaRecording,
    stopCaptchaRecording,
    resetPrayer,
  } = usePrayerRecording();

  useEffect(() => {
    const init = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Please grant microphone permissions');
      }
      
      if (userData?.id) {
        await initializeUserId(userData.id);
        await fetchPrayers();
      }
    };
    
    if (!userDataLoading) {
      init();
    }
  }, [userData, userDataLoading]);

  useEffect(() => {
    if (!loading && prayers.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, prayers]);

  const filteredPrayers = prayers.filter(prayer =>
    prayer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prayer.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(fav => fav !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  useEffect(() => {
    if (result && result.analysis.tokens_earned > 0) {
      console.log('Prayer completed - triggering refresh');
      triggerRefresh();
    }
  }, [result, triggerRefresh]);

  if (!userData && !userDataLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
          <View style={styles.centerContent}>
            <View style={styles.loginPromptCard}>
              <LinearGradient
                colors={['#ffffff', '#fafaf9']}
                style={styles.loginPromptGradient}
              >
                <Heart size={48} color="#92400e" strokeWidth={2} />
                <Text style={styles.loginPromptTitle}>{t.prayer.pleaseLogin}</Text>
                <Text style={styles.loginPromptSubtitle}>
                  {t.bibleReader.checkConnection}
                </Text>
                <Pressable style={styles.retryButtonError} onPress={() => window.location.reload()}>
                  <LinearGradient colors={['#92400e', '#78350f']} style={styles.retryButtonGradient}>
                    <RefreshCw size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>{t.prayer.retry}</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (loading || userDataLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#92400e" />
            <Text style={styles.loadingTextMain}>{t.prayer.loading}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
          <View style={styles.centerContent}>
            <View style={styles.errorContainerMain}>
              <LinearGradient colors={['#fee2e2', '#fecaca']} style={styles.errorGradientMain}>
                <AlertCircle size={48} color="#dc2626" />
                <Text style={styles.errorTitleMain}>{t.prayer.error}</Text>
                <Text style={styles.errorMessageMain}>{error}</Text>
                <Pressable style={styles.retryButtonError} onPress={fetchPrayers}>
                  <LinearGradient colors={['#92400e', '#78350f']} style={styles.retryButtonGradient}>
                    <RefreshCw size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>{t.prayer.retry}</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (selectedPrayer) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
          <ScrollView style={styles.prayerDetailScroll} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.detailHeaderSection, { opacity: fadeAnim }]}>
              <Pressable onPress={resetPrayer} style={styles.backButton}>
                <ArrowLeft size={24} color="#1c1917" strokeWidth={2.5} />
              </Pressable>

              <View style={styles.detailHeaderContent}>
                <Text style={styles.detailTitle}>{selectedPrayer.title}</Text>
                <Text style={styles.detailReference}>{selectedPrayer.reference}</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.stepCard, { opacity: fadeAnim }]}>
              <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.stepGradient}>
                <View style={styles.prayerTextHeader}>
                  <BookOpen size={18} color="#92400e" />
                  <Text style={styles.prayerTextHeaderTitle}>{t.prayer.prayerText}</Text>
                </View>
                <Text style={styles.prayerText}>
                  {selectedPrayer.text}
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Record Prayer - hides after completion */}
            {!prayerTranscriptionId && (
              <View style={styles.stepCard}>
                <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.stepGradient}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepTitleContainer}>
                      <Text style={styles.stepTitle}>{t.prayer.recordYourPrayer}</Text>
                      <Text style={styles.stepDescription}>{t.prayer.readAloud}</Text>
                    </View>
                  </View>

                  {isPrayerRecording && (
                    <View style={styles.recordingIndicator}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingText}>{t.prayer.recording}</Text>
                    </View>
                  )}

                  <Pressable
                    style={[styles.recordButton, isPrayerRecording && styles.recordButtonActive]}
                    onPress={isPrayerRecording ? stopPrayerRecording : startPrayerRecording}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={isPrayerRecording ? ['#dc2626', '#b91c1c'] : ['#d97706', '#b45309']}
                      style={styles.recordButtonGradient}
                    >
                      {isPrayerRecording ? (
                        <>
                          <StopCircle size={18} color="#ffffff" />
                          <Text style={styles.recordButtonText}>{t.prayer.stop}</Text>
                        </>
                      ) : (
                        <>
                          <Mic size={18} color="#ffffff" />
                          <Text style={styles.recordButtonText}>{t.prayer.startRecording}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}

            {/* Verify with Bible Verse - full text captcha */}
            {prayerTranscriptionId && !result && captchaQuote && (
              <View style={styles.stepCard}>
                <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.stepGradient}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepTitleContainer}>
                      <Text style={styles.stepTitle}>{t.prayer.verifyWithVerse}</Text>
                      <Text style={styles.stepDescription}>{t.prayer.readToVerify}</Text>
                    </View>
                  </View>

                  <View style={styles.captchaQuoteContainer}>
                    <View style={styles.captchaQuoteHeader}>
                      <Sparkles size={16} color="#92400e" />
                      <Text style={styles.captchaQuoteLabel}>{t.prayer.bibleVerse}</Text>
                    </View>
                    <Text style={styles.captchaQuoteText}>{captchaQuote.text}</Text>
                    <Text style={styles.captchaQuoteRef}>
                      {captchaQuote.book_name} {captchaQuote.chapter}:{captchaQuote.verse}
                    </Text>
                  </View>

                  {isCaptchaRecording && (
                    <View style={styles.recordingIndicator}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingText}>{t.prayer.recording}</Text>
                    </View>
                  )}

                  <Pressable
                    style={[styles.recordButton, isCaptchaRecording && styles.recordButtonActive]}
                    onPress={isCaptchaRecording ? stopCaptchaRecording : startCaptchaRecording}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={isCaptchaRecording ? ['#dc2626', '#b91c1c'] : ['#d97706', '#b45309']}
                      style={styles.recordButtonGradient}
                    >
                      {isCaptchaRecording ? (
                        <>
                          <StopCircle size={18} color="#ffffff" />
                          <Text style={styles.recordButtonText}>{t.prayer.stop}</Text>
                        </>
                      ) : (
                        <>
                          <Mic size={18} color="#ffffff" />
                          <Text style={styles.recordButtonText}>{t.prayer.startRecording}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}

            {/* Result Card */}
            {result && (
              <View style={styles.stepCard}>
                <LinearGradient colors={['#ffffff', '#fafaf9']} style={[styles.stepGradient, styles.resultGradient]}>
                  {/* Icon and Title */}
                  <View style={styles.resultHeader}>
                    <View style={styles.resultIconSmall}>
                      <LinearGradient 
                        colors={result.captcha_passed ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']} 
                        style={styles.resultIconSmallCircle}
                      >
                        {result.captcha_passed ? (
                          <Check size={18} color="#ffffff" strokeWidth={3} />
                        ) : (
                          <AlertCircle size={18} color="#ffffff" strokeWidth={3} />
                        )}
                      </LinearGradient>
                    </View>
                    <Text style={styles.resultTitle}>
                      {result.captcha_passed ? t.prayer.prayerCompleted : t.prayer.tryAgain}
                    </Text>
                  </View>

                  <Text style={styles.resultDescription}>
                    {result.captcha_passed ? t.prayer.greatJob : t.prayer.tryAgainMessage}
                  </Text>

                  {/* Tokens */}
                  <View style={styles.tokensInline}>
                    <Text style={styles.tokensInlineLabel}>{t.prayer.earned}</Text>
                    <Text style={styles.tokensInlineValue}>
                      +{result.analysis.tokens_earned || 0} PRAY
                    </Text>
                  </View>

                  {/* Voice Verification - 2 yellow tiles */}
                  <View style={styles.verificationSection}>
                    <Text style={styles.verificationTitle}>{t.prayer.performanceDetails}</Text>


                    <View style={styles.verificationGrid}>
                      {/* Voice Match */}
                      <View style={styles.verificationItem}>
                        <LinearGradient 
                          colors={['#fef3c7', '#fde68a']}
                          style={styles.verificationBadge}
                        >
                          <Check size={16} color="#92400e" strokeWidth={3} />
                          <Text style={[styles.verificationValue, { color: '#92400e' }]}>
                            {t.prayer.voiceMatch}
                          </Text>
                        </LinearGradient>
                        <Text style={styles.verificationLabelTop}>{t.prayer.voiceMatch}</Text>
                        <Text style={styles.verificationScore}>
                          {(result.voice_similarity * 100).toFixed(0)}%
                        </Text>
                      </View>

                      {/* Human Voice */}
                      <View style={styles.verificationItem}>
                        <LinearGradient 
                          colors={['#fef3c7', '#fde68a']}
                          style={styles.verificationBadge}
                        >
                          <Check size={16} color="#92400e" strokeWidth={3} />
                          <Text style={[styles.verificationValue, { color: '#92400e' }]}>
                            {t.prayer.humanVoice}
                          </Text>
                        </LinearGradient>
                        <Text style={styles.verificationLabelTop}>{t.prayer.humanVoice}</Text>
                        <Text style={styles.verificationScore}>
                          {(result.human_confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  

                  {/* Performance Details */}

                  <View style={styles.metricsGrid}>
                    {/* Prayer Accuracy */}
                    <View style={styles.metricItem}>
                      <LinearGradient 
                        colors={['#fef3c7', '#fde68a']} 
                        style={styles.metricIconCircle}
                      >
                        <Heart size={16} color="#92400e" fill="#92400e" />
                      </LinearGradient>
                      <Text style={styles.metricLabel}>{t.prayer.prayer}</Text>
                      <Text style={styles.metricValue}>
                        {(result.analysis.text_accuracy * 100).toFixed(0)}%
                      </Text>
                    </View>

                    {/* Captcha Accuracy */}
                    <View style={styles.metricItem}>
                      <LinearGradient 
                        colors={['#fef3c7', '#fde68a']}  
                        style={styles.metricIconCircle}
                      >
                        <Sparkles size={16} color="#92400e" />
                      </LinearGradient>
                      <Text style={styles.metricLabel}>{t.prayer.captcha}</Text>
                      <Text style={styles.metricValue}>
                        {(result.analysis.captcha_accuracy * 100).toFixed(0)}%
                      </Text>
                    </View>

                    {/* Focus Score */}
                    <View style={styles.metricItem}>
                      <LinearGradient 
                        colors={['#fef3c7', '#fde68a']} 
                        style={styles.metricIconCircle}
                      >
                        <BookOpen size={16} color="#92400e" />
                      </LinearGradient>
                      <Text style={styles.metricLabel}>{t.prayer.focus}</Text>
                      <Text style={styles.metricValue}>
                        {(result.analysis.focus_score * 100).toFixed(0)}%
                      </Text>
                    </View>

                    {/* Speech Fluency */}
                    <View style={styles.metricItem}>
                      <LinearGradient 
                        colors={['#fef3c7', '#fde68a']} 
                        style={styles.metricIconCircle}
                      >
                        <Mic size={16} color="#92400e" />
                      </LinearGradient>
                      <Text style={styles.metricLabel}>{t.prayer.fluency}</Text>
                      <Text style={styles.metricValue}>
                        {(result.analysis.speech_fluency * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <Pressable style={styles.newPrayerButton} onPress={resetPrayer}>
                    <LinearGradient colors={['#92400e', '#78350f']} style={styles.newPrayerButtonGradient}>
                      <Play size={14} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.newPrayerButtonText}>{t.prayer.prayAnother}</Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </View>
            )}

            {isProcessing && !result && (
              <View style={styles.stepCard}>
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#92400e" />
                  <Text style={styles.processingText}>{t.prayer.analyzing}</Text>
                </View>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </LinearGradient>
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
            <Heart size={32} color="#92400e" strokeWidth={2} />
            <Text style={styles.title}>{t.nav?.prayer || 'Prayer'}</Text>
          </View>
          <Text style={styles.subtitle}>{t.prayer?.subtitle || 'Choose a prayer to begin'}</Text>
        </Animated.View>

        <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
          <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.searchBar}>
            <Search size={18} color="#78716c" />
            <TextInput
              style={styles.searchInput}
              placeholder={t.prayer?.search || 'Search prayers...'}
              placeholderTextColor="#a8a29e"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </LinearGradient>
        </Animated.View>

        <ScrollView style={styles.prayerList} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
            <BookOpen size={18} color="#92400e" />
            <Text style={styles.sectionTitle}>{t.prayer.availablePrayers}</Text>
          </Animated.View>

          {filteredPrayers.length === 0 && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={styles.emptyContainer}>
                <Heart size={36} color="#d1d5db" />
                <Text style={styles.emptyText}>{t.prayer.noPrayersFound}</Text>
              </View>
            </Animated.View>
          )}

          {filteredPrayers.map((prayer) => (
            <Animated.View key={prayer.id} style={{ opacity: fadeAnim }}>
              <Pressable onPress={() => selectPrayer(prayer)}>
                <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.prayerCard}>
                  <View style={styles.prayerContent}>
                    <View style={styles.prayerLeft}>
                      <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.categoryBadge}>
                        <Heart size={22} color="#92400e" />
                      </LinearGradient>
                    </View>

                    <View style={styles.prayerRight}>
                      <View style={styles.prayerHeader}>
                        <Text style={styles.prayerName}>{prayer.title}</Text>
                        <Pressable onPress={(e) => { e.stopPropagation(); toggleFavorite(prayer.id); }} style={styles.favoriteButton}>
                          <Heart size={18} color={favorites.includes(prayer.id) ? '#dc2626' : '#a8a29e'} fill={favorites.includes(prayer.id) ? '#dc2626' : 'transparent'} />
                        </Pressable>
                      </View>

                      <View style={styles.prayerCategoryContainer}>
                        <BookOpen size={12} color="#78716c" />
                        <Text style={styles.prayerCategory}>{prayer.reference}</Text>
                      </View>

                      <View style={styles.prayerFooter}>
                        <Pressable style={styles.startButton}>
                          <LinearGradient colors={['#d97706', '#b45309']} style={styles.startButtonGradient}>
                            <Play size={14} color="#ffffff" fill="#ffffff" />
                            <Text style={styles.startButtonText}>{t.prayer.aiStart}</Text>
                          </LinearGradient>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  gradient: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  header: { 
    alignItems: 'center', 
    marginBottom: 12 
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1c1917',
  },
  subtitle: { fontSize: 13, color: '#78716c', textAlign: 'center' },
  searchContainer: { marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: '#1c1917' },
  prayerList: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1c1917', flex: 1 },
  loadingContainer: { padding: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13, color: '#78716c' },
  errorContainer: { marginBottom: 12, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  errorGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500' },
  retryButton: { backgroundColor: '#dc2626', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  retryText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#78716c', marginTop: 10 },
  prayerCard: { borderRadius: 14, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  prayerContent: { flexDirection: 'row', gap: 10 },
  prayerLeft: { alignItems: 'center', justifyContent: 'flex-start' },
  categoryBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  prayerRight: { flex: 1 },
  prayerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  prayerName: { fontSize: 15, fontWeight: '600', color: '#1c1917', flex: 1 },
  favoriteButton: { padding: 4 },
  prayerCategoryContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  prayerCategory: { fontSize: 12, color: '#78716c' },
  prayerFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  startButton: { borderRadius: 8, overflow: 'hidden', shadowColor: '#d97706', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  startButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  startButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  prayerDetailScroll: { flex: 1 },
  detailHeaderSection: {
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  detailHeaderContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailReference: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
  },
  stepCard: { marginBottom: 12, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  stepGradient: { padding: 14 },
  prayerTextHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  prayerTextHeaderTitle: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  prayerText: { fontSize: 14, lineHeight: 22, color: '#44403c' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#92400e', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  stepNumberText: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  stepTitleContainer: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: '#1c1917', marginBottom: 2 },
  stepDescription: { fontSize: 12, color: '#78716c' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, padding: 8, backgroundColor: '#ffffff40', borderRadius: 8, borderWidth: 1, borderColor: '#dc262620' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 6 },
  recordingText: { color: '#dc2626', fontWeight: '600', fontSize: 12 },
  recordButton: { borderRadius: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  recordButtonActive: { shadowColor: '#dc2626' },
  recordButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  recordButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  captchaQuoteContainer: { backgroundColor: '#ffffff60', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 2, borderColor: '#fbbf2440' },
  captchaQuoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  captchaQuoteLabel: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  captchaQuoteText: { fontSize: 14, fontStyle: 'italic', color: '#1c1917', marginBottom: 6, lineHeight: 20 },
  captchaQuoteRef: { fontSize: 11, color: '#78716c', fontWeight: '500', textAlign: 'right' },
  
  resultGradient: { 
    padding: 12,
  },
  
  // Icon and title in one line
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resultIconSmall: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconSmallCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  resultTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1c1917',
  },
  resultDescription: {
    fontSize: 12,
    textAlign: 'center',
    color: '#78716c',
    marginBottom: 10,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
  
  tokensInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f5f5f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tokensInlineLabel: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
  },
  tokensInlineValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
  },

  performanceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
    textAlign: 'center',
  },

  metricsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 6, 
    marginBottom: 10,
  },
  metricItem: { 
    flex: 1, 
    minWidth: '47%',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: { 
    fontSize: 10, 
    color: '#78716c',
    marginBottom: 2,
    fontWeight: '500',
  },
  metricValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1c1917',
  },

  newPrayerButton: { 
    borderRadius: 8, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 3,
  },
  newPrayerButtonGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 5, 
    paddingVertical: 10,
  },
  newPrayerButtonText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#ffffff',
  },
  
  processingContainer: { 
    padding: 30, 
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  processingText: { 
    marginTop: 10, 
    fontSize: 13, 
    color: '#78716c', 
    fontWeight: '500',
  },

  // Verification section styles
  verificationSection: {
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 10,
    textAlign: 'center',
  },
  verificationLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginBottom: 8,
  },
  verificationLabelTop: {
    fontSize: 11,
    color: '#78716c',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 3,
  },
  verificationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  verificationItem: {
    flex: 1,
    alignItems: 'center',
  },
  verificationBadge: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 6,
  },
  verificationValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verificationScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1917',
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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

  loadingTextMain: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716c',
    fontWeight: '500',
  },
  errorContainerMain: {
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
  errorGradientMain: {
    padding: 32,
    alignItems: 'center',
  },
  errorTitleMain: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessageMain: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
});