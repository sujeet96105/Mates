import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthProvider';
import { useTheme } from './useTheme';

const UserProfile: React.FC = () => {
  const { user, updateProfile, error } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile(displayName);
      // Success alert is shown in the AuthProvider
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
    <View style={[stylesBase.container, { backgroundColor: colors.surface }]}>
      <Text style={[stylesBase.title, { color: colors.text }]}>User Profile</Text>
      
      <View style={stylesBase.infoContainer}>
        <Text style={[stylesBase.label, { color: colors.textSecondary }]}>Email:</Text>
        <Text style={[stylesBase.value, { color: colors.text }]}>{user.email}</Text>
      </View>

      <View style={stylesBase.inputContainer}>
        <Text style={[stylesBase.label, { color: colors.textSecondary }]}>Display Name:</Text>
        <TextInput
          style={[stylesBase.input, { 
            borderColor: isDarkMode ? '#333' : '#ddd', 
            backgroundColor: isDarkMode ? '#2A2A2A' : colors.card,
            color: colors.text
          }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your display name"
          placeholderTextColor={colors.textPlaceholder}
        />
      </View>

      {error && <Text style={[stylesBase.errorText, { color: '#EF4444' }]}>{error}</Text>}

      <TouchableOpacity 
        style={[stylesBase.button, { backgroundColor: colors.primary }]} 
        onPress={handleUpdateProfile}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={stylesBase.buttonText}>Update Profile</Text>
        )}
      </TouchableOpacity>
    </View>
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
    color: '#fff',
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
});

export default UserProfile;