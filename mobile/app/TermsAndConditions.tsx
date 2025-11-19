import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Shield, Globe, TrendingUp, Lock, Users } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';

interface TermsAndConditionsProps {
  visible: boolean;
  onClose: () => void;
  fadeAnim: Animated.Value;
}

export default function TermsAndConditions({
  visible,
  onClose,
  fadeAnim,
}: TermsAndConditionsProps) {
  const { t } = useLanguage();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <Pressable onPress={onClose} style={styles.backButton}>
              <ArrowLeft size={24} color="#92400e" strokeWidth={2.5} />
            </Pressable>

            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Shield size={32} color="#92400e" strokeWidth={2} />
                <Text style={styles.title}>{t.terms.title}</Text>
              </View>
              <Text style={styles.subtitle}>{t.terms.subtitle}</Text>
            </View>
          </Animated.View>

          <View style={styles.contentContainer}>
            {/* Mission Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Heart size={20} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.sectionTitle}>{t.terms.mission.title}</Text>
              </View>
              <Text style={styles.sectionText}>{t.terms.mission.description}</Text>
            </View>

            {/* Prayer Tokens Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.sectionTitle}>{t.terms.tokens.title}</Text>
              </View>
              <Text style={styles.sectionText}>{t.terms.tokens.description}</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• {t.terms.tokens.earning}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.tokens.usage}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.tokens.value}</Text>
              </View>
            </View>

            {/* Blockchain Integration */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Globe size={20} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.sectionTitle}>{t.terms.blockchain.title}</Text>
              </View>
              <Text style={styles.sectionText}>{t.terms.blockchain.description}</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• {t.terms.blockchain.transparency}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.blockchain.security}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.blockchain.accessibility}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.blockchain.celo}</Text>
              </View>
            </View>

            {/* Governance Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Users size={20} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.sectionTitle}>{t.terms.governance.title}</Text>
              </View>
              <Text style={styles.sectionText}>{t.terms.governance.description}</Text>
              <Text style={styles.sectionText}>{t.terms.governance.voting}</Text>
            </View>

            {/* Verification Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Lock size={20} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.sectionTitle}>{t.terms.verification.title}</Text>
              </View>
              <Text style={styles.sectionText}>{t.terms.verification.description}</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• {t.terms.verification.voiceAI}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.verification.llm}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.verification.captcha}</Text>
              </View>
            </View>

            {/* Tokenomics Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#92400e" strokeWidth={2.5} />
                <Text style={styles.sectionTitle}>{t.terms.tokenomics.title}</Text>
              </View>
              <Text style={styles.sectionText}>{t.terms.tokenomics.description}</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• {t.terms.tokenomics.stability}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.tokenomics.liquidity}</Text>
                <Text style={styles.bulletPoint}>• {t.terms.tokenomics.transfer}</Text>
              </View>
            </View>

            {/* Impact Section */}
            <View style={styles.highlightSection}>
              <Text style={styles.highlightText}>{t.terms.impact}</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
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
  headerContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#57534e',
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    color: '#57534e',
    paddingLeft: 8,
  },
  highlightSection: {
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  highlightText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#166534',
    fontWeight: '600',
    textAlign: 'center',
  },
});