import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';
import { ModernButton, ModernCard, ModernInput, Icons } from './ModernUI';

const RoommatesTab = () => {
  const {
    newRoommate,
    setNewRoommate,
    handleAddRoommate,
    roommates,
    handleRemoveRoommate,
    isLoading,
  } = useAppState();

  // Use our custom theme hook for consistent theming
  const { isDarkMode, colors } = useTheme();

  const styles = StyleSheet.create({
    tabContent: { padding: 20, flex: 1, backgroundColor: colors.backgroundSecondary },
    card: { 
      backgroundColor: colors.card, 
      borderRadius: 16, 
      padding: 20, 
      marginBottom: 20, 
      shadowColor: colors.shadow, 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 8, 
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.borderLight
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16, letterSpacing: -0.3 },
    friendInput: { 
      borderWidth: 1, 
      borderColor: colors.border, 
      borderRadius: 12, 
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 16, 
      backgroundColor: colors.surface, 
      color: colors.text,
      fontSize: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1
    },
    addButton: { 
      backgroundColor: colors.primary, 
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12, 
      alignItems: 'center', 
      marginTop: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4
    },
    addButtonText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 16, letterSpacing: 0.5 },
    friendItem: { 
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.borderLight,
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center'
    },
    friendName: { fontSize: 16, color: colors.text, fontWeight: '600', flex: 1 },
    deleteButton: { 
      paddingVertical: 8, 
      paddingHorizontal: 12, 
      backgroundColor: colors.errorLight, 
      borderRadius: 8 
    },
    deleteButtonText: { color: colors.error, fontSize: 14, fontWeight: '600' },
    emptyMessage: { textAlign: 'center', padding: 24, color: colors.textSecondary, fontSize: 16, fontWeight: '500' },
  });

  return (
    <FlatList
      style={styles.tabContent}
      data={roommates}
      keyExtractor={(item, index) => index.toString()}
      ListHeaderComponent={
        <ModernCard style={{ marginBottom: 20 }}>
          <Text style={styles.cardTitle}>👥 Add New Friend</Text>
          <ModernInput
            value={newRoommate}
            onChangeText={setNewRoommate}
            placeholder="Enter friend's name"
            leftIcon={<Icons.User />}
          />
          <ModernButton
            title="Add Friend"
            onPress={handleAddRoommate}
            variant="primary"
            fullWidth
            leftIcon={<Icons.Add />}
            style={{ marginTop: 12 }}
          />
        </ModernCard>
      }
      renderItem={({ item }) => (
        <View style={styles.friendItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Icons.User />
            <Text style={[styles.friendName, { marginLeft: 12 }]}>{item}</Text>
          </View>
          <ModernButton
            title="Remove"
            onPress={() => handleRemoveRoommate(item)}
            variant="error"
            size="small"
            leftIcon={<Icons.Remove />}
          />
        </View>
      )}
      ListEmptyComponent={
        <ModernCard style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>👥</Text>
          <Text style={styles.emptyMessage}>No friends added yet</Text>
          <Text style={[styles.emptyMessage, { fontSize: 14, marginTop: 8 }]}>Add friends to start splitting expenses!</Text>
        </ModernCard>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    />
  );
};

export default RoommatesTab;