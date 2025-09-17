import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useAppState } from './AppStateProvider';
import { useTheme } from './useTheme';

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
    tabContent: { padding: 16, flex: 1 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
    roommateInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? colors.buttonSecondary : colors.surface, color: colors.text },
    addButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    addButtonText: { color: isDarkMode ? colors.text : '#FFFFFF', fontWeight: '600', fontSize: 16 },
    roommateItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    roommateName: { fontSize: 16, color: colors.text },
    deleteButton: { alignSelf: 'flex-start', padding: 6, marginTop: 8 },
    deleteButtonText: { color: colors.error, fontSize: 14, fontWeight: '500' },
    emptyMessage: { textAlign: 'center', padding: 16, color: colors.textSecondary },
  });

  return (
    <FlatList
      style={styles.tabContent}
      data={roommates}
      keyExtractor={(item, index) => index.toString()}
      ListHeaderComponent={
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Roommate</Text>
          <TextInput
            style={styles.roommateInput}
            placeholder="Roommate Name"
            placeholderTextColor={colors.textPlaceholder}
            value={newRoommate}
            onChangeText={setNewRoommate}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddRoommate}>
            <Text style={styles.addButtonText}>Add Roommate</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.roommateItem}>
          <Text style={styles.roommateName}>{item}</Text>
          <TouchableOpacity
            onPress={() => handleRemoveRoommate(item)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyMessage}>No roommates added yet</Text>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={true}
    />
  );
};

export default RoommatesTab;