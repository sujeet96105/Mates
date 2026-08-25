import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from './AuthProvider';
import { useTheme } from './useTheme';
import NativeAdCard from './components/ads/NativeAdCard';
import { ANDROID_NATIVE_AD_UNIT_ID_PROFILE, IOS_NATIVE_AD_UNIT_ID_PROFILE } from './adConfig';
import { useAppMessage } from './AppMessage';
import SettingsTab from './SettingsTab';

const UserProfile: React.FC = () => {
  const { user, updateProfile, error, deleteAccount, isLoading } = useAuth() as any;
  const { isDarkMode, colors } = useTheme();
  const { showMessage } = useAppMessage();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      showMessage({
        title: 'Display name required',
        message: 'Enter a name before updating your profile.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile(displayName);
      // Success feedback is shown in the AuthProvider
    } catch (error) {
      // Error handling is done in the AuthProvider
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={[stylesBase.container, { backgroundColor: colors.surface }]}>
        <Text style={[stylesBase.message, { color: colors.textSecondary }]}>Please log in to manage your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[stylesBase.container, { backgroundColor: colors.surface }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[stylesBase.title, { color: colors.text }]}>User Profile</Text>

      <View style={stylesBase.infoContainer}>
        <Text style={[stylesBase.label, { color: colors.textSecondary }]}>Email:</Text>
        <Text style={[stylesBase.value, { color: colors.text }]}>{user?.email}</Text>
      </View>

      <View style={stylesBase.inputContainer}>
        <Text style={[stylesBase.label, { color: colors.textSecondary }]}>Display Name:</Text>
        <TextInput
          style={[stylesBase.input, {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.text
          }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your display name"
          placeholderTextColor={colors.textPlaceholder}
        />
      </View>

      {error && <Text style={[stylesBase.errorText, { color: colors.error }]}>{error}</Text>}

      <TouchableOpacity
        style={[stylesBase.button, { backgroundColor: colors.primary }]}
        onPress={handleUpdateProfile}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={isDarkMode ? colors.surface : '#FFFFFF'} />
        ) : (
          <Text style={[stylesBase.buttonText, { color: isDarkMode ? colors.surface : '#FFFFFF' }]}>Update Profile</Text>
        )}
      </TouchableOpacity>

      {/* Native Ad Card (production unit) */}
      {(() => {
        const adUnitIdProfile = Platform.select({ android: ANDROID_NATIVE_AD_UNIT_ID_PROFILE, ios: IOS_NATIVE_AD_UNIT_ID_PROFILE }) || ANDROID_NATIVE_AD_UNIT_ID_PROFILE;
        return (
          <View style={{ marginTop: 16 }}>
            <NativeAdCard adUnitId={adUnitIdProfile} visible={true} />
          </View>
        );
      })()}

      {/* Settings Section */}
      <View style={{ marginTop: 24 }}>
        <SettingsTab />
      </View>
    </ScrollView>
  );

      <TouchableOpacity 
        style={[stylesBase.button, { backgroundColor: colors.error, marginTop: 24 }]} 
        onPress={() => deleteAccount()}
        disabled={!!isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={isDarkMode ? colors.surface : '#FFFFFF'} />
        ) : (
          <Text style={[stylesBase.buttonText, { color: isDarkMode ? colors.surface : '#FFFFFF' }]}>Delete My Account</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const stylesBase = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoContainer: {
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 24,
  },
  settingCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default UserProfile;
