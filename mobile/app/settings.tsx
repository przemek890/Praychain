import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Modal } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import TermsAndConditions from './TermsAndConditions';
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Wallet, 
  Globe, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  X, 
  Check,
  User,
  LogOut
} from 'lucide-react-native';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  email: string | null;
  username: string;
  walletAddress: string | null;
  walletChain: string | null;
  fadeAnim: Animated.Value;
}

const LANGUAGES = [
  { code: 'en' as Language, name: 'English'},
  { code: 'pl' as Language, name: 'Polski'},
  { code: 'es' as Language, name: 'Español'},
];

export default function Settings({
  visible,
  onClose,
  onLogout,
  email,
  username,
  walletAddress,
  walletChain,
  fadeAnim,
}: SettingsProps) {
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const termsFadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Animacja dla Terms
  useEffect(() => {
    if (showTerms) {
      termsFadeAnim.setValue(0);
      Animated.timing(termsFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [showTerms]);

  if (!visible) return null;

  const currentLanguage = LANGUAGES.find(lang => lang.code === language);

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
    setShowLanguageModal(false);
  };

  const handleOpenTerms = () => {
    console.log('Opening Terms & Conditions');
    setShowTerms(true);
  };

  const handleCloseTerms = () => {
    console.log('Closing Terms & Conditions');
    setShowTerms(false);
  };

  return (
    <>
      {/* ✅ MAIN SETTINGS VIEW */}
      {!showTerms && (
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
                    <SettingsIcon size={32} color="#92400e" strokeWidth={2} />
                    <Text style={styles.title}>{t.settings.title}</Text>
                  </View>
                  <Text style={styles.subtitle}>{t.settings.subtitle}</Text>
                </View>
              </Animated.View>

              <View style={styles.itemsContainer}>
                {/* Wallet Info */}
                {walletAddress && (
                  <View>
                    <View style={styles.walletCard}>
                      <View style={styles.walletHeader}>
                        <View style={styles.walletIconWrapper}>
                          <Wallet size={20} color="#92400e" strokeWidth={2.5} />
                        </View>
                        <View style={styles.walletContent}>
                          <Text style={styles.walletTitle}>{t.settings.connectedWallet}</Text>
                          <Text style={styles.walletAddress}>
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                          </Text>
                          {walletChain && (
                            <Text style={styles.walletChain}>
                              {t.settings.chain}: {walletChain}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Email Info */}
                {email && (
                  <View>
                    <View style={styles.emailCard}>
                      <View style={styles.emailHeader}>
                        <View style={styles.emailIconWrapper}>
                          <User size={20} color="#92400e" strokeWidth={2.5} />
                        </View>
                        <View style={styles.emailContent}>
                          <Text style={styles.emailTitle}>{t.settings.email}</Text>
                          <Text style={styles.emailAddress}>{email}</Text>
                          <Text style={styles.usernameText}>{t.settings.username}: {username}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                <View>
                  <SettingItem
                    icon={Globe}
                    title={t.settings.appLanguage}
                    subtitle={`${currentLanguage?.name}`}
                    onPress={() => setShowLanguageModal(true)}
                  />
                </View>
                
                <View>
                  <SettingItem
                    icon={FileText}
                    title={t.settings.termsOfService}
                    onPress={handleOpenTerms}
                  />
                </View>
                
                <View>
                  <SettingItem
                    icon={HelpCircle}
                    title={t.settings.helpSupport}
                    onPress={() => {}}
                  />
                </View>
                
                <View>
                  <Pressable onPress={onLogout} style={styles.logoutButton}>
                    <View style={styles.logoutIconWrapper}>
                      <LogOut size={20} color="#dc2626" strokeWidth={2.5} />
                    </View>
                    <Text style={styles.logoutText}>{t.settings.logOut}</Text>
                  </Pressable>
                </View>

                <Text style={styles.versionText}>{t.settings.version} 1.0.0</Text>
              </View>
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal
              visible={showLanguageModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowLanguageModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t.settings.selectLanguage}</Text>
                    <Pressable 
                      onPress={() => setShowLanguageModal(false)}
                      style={styles.closeButton}
                    >
                      <X size={24} color="#78716c" strokeWidth={2.5} />
                    </Pressable>
                  </View>

                  {LANGUAGES.map((lang) => (
                    <Pressable
                      key={lang.code}
                      onPress={() => handleLanguageChange(lang.code)}
                      style={[
                        styles.languageOption,
                        language === lang.code && styles.languageOptionActive
                      ]}
                    >
                      <View style={styles.languageInfo}>
                        <Text style={[
                          styles.languageName,
                          language === lang.code && styles.languageNameActive
                        ]}>
                          {lang.name}
                        </Text>
                      </View>
                      {language === lang.code && (
                        <View style={styles.checkIcon}>
                          <Check size={20} color="#16a34a" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </Modal>
          </LinearGradient>
        </View>
      )}

      {/* ✅ TERMS & CONDITIONS VIEW */}
      {showTerms && (
        <TermsAndConditions
          visible={showTerms}
          onClose={handleCloseTerms}
          fadeAnim={termsFadeAnim}
        />
      )}
    </>
  );
}

function SettingItem({ icon: Icon, title, subtitle, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.settingItem}>
      <View style={styles.settingIconWrapper}>
        <Icon size={20} color="#92400e" strokeWidth={2.5} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color="#a8a29e" strokeWidth={2.5} />
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
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  itemsContainer: {
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#78716c',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  versionText: {
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
    fontWeight: '500',
  },
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#fef3c7',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletContent: {
    flex: 1,
  },
  walletTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  walletChain: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
  },
  emailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#e0e7ff',
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emailContent: {
    flex: 1,
  },
  emailTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emailAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 28,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
  },
  languageNameActive: {
    color: '#16a34a',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});