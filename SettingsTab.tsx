import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import Share from 'react-native-share';
import { useTheme } from './useTheme';
import UserProfile from './UserProfile';
import { useAppState } from './AppStateProvider';
import { db } from './firebase';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { exportExpensesToPdf } from './pdfExport_clean';

const SettingsTab = () => {
  // Use our custom theme hook for consistent theming
  const { colors } = useTheme();
  const { expenses, settlements } = useAppState();
  const [isExporting, setIsExporting] = useState(false);
  
  const styles = StyleSheet.create({
    tabContent: { 
      padding: 16, 
      paddingBottom: 24,
      flex: 1,
      backgroundColor: colors.background
    },
    actions: {
      marginTop: 36,
      marginBottom: 36,
      alignItems: 'flex-start'
    },
    exportButton: {
      backgroundColor: '#2563eb',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24
    },
    exportButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600'
    },
    spacer: {
      height: 32
    },
    spacerLarge: {
      height: 40
    }
  });

  const handleExportAndClear = useCallback(async () => {
    if (!expenses || expenses.length === 0) {
      Alert.alert('Nothing to Export', 'No expenses found to export.');
      return;
    }

    setIsExporting(true);
    try {
      // 1) Export PDF
      const { success, filePath, error } = await exportExpensesToPdf(expenses as any, settlements as any);
      if (!success) {
        Alert.alert('Export Failed', error || 'Could not create the PDF.');
        return;
      }

      // 2) Confirm clear
      console.log('PDF exported to:', filePath);
      const isPublicDownloads = filePath && filePath.includes('/Download/') && !filePath.includes('/data/');
      const isAppDirectory = filePath && (filePath.includes('Documents') || filePath.includes('cache') || filePath.includes('/data/'));
      
      let locationMessage;
      if (isPublicDownloads) {
        locationMessage = 'PDF saved to Downloads folder! You can find it in your Downloads app or file manager.';
      } else if (isAppDirectory) {
        locationMessage = 'PDF saved to app folder. Use "Open" button to view or share it.';
      } else {
        locationMessage = 'PDF saved successfully!';
      }
      
      Alert.alert(
        'Export Successful',
        `${locationMessage}\n\nDo you want to clear your Firestore expenses now?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { text: 'Open', onPress: async () => { 
            if (filePath) { 
              try { 
                // Clean up the file path and ensure proper file:// format
                const cleanPath = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
                await Share.open({ 
                  url: cleanPath, 
                  type: 'application/pdf', 
                  showAppsToView: true 
                }); 
              } catch (error) { 
                console.log('Failed to open PDF:', error);
                Alert.alert('Open Failed', 'Could not open the PDF. Please check your Downloads folder.'); 
              } 
            } 
          } },
          { text: 'Clear', style: 'destructive', onPress: async () => {
            try {
              // Delete all current-user expenses from the 'expenses' collection
              const expensesRef = collection(db!, 'expenses');
              // We do not have user context here; AppState stores expenses filtered already by current user
              // so we delete by firestoreId when available; fallback to query by id list
              const idsWithFirestore = (expenses as any[]).filter(e => e.firestoreId).map(e => e.firestoreId as string);
              if (idsWithFirestore.length > 0) {
                // Batch delete in small chunks to avoid limits
                const chunks: string[][] = [];
                for (let i = 0; i < idsWithFirestore.length; i += 300) {
                  chunks.push(idsWithFirestore.slice(i, i + 300));
                }
                for (const chunk of chunks) {
                  await Promise.all(chunk.map(id => deleteDoc(doc(expensesRef, id))));
                }
              } else {
                // Fallback: query all docs that match any of the local numeric ids
                const numericIds = (expenses as any[]).map(e => e.id).filter(Boolean);
                if (numericIds.length > 0) {
                  // As Firestore cannot query "in" with large arrays in one go beyond 10, iterate
                  const sliceSize = 10;
                  for (let i = 0; i < numericIds.length; i += sliceSize) {
                    const slice = numericIds.slice(i, i + sliceSize);
                    const q = query(expensesRef, where('id', 'in', slice));
                    const snap = await getDocs(q);
                    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                  }
                }
              }
              Alert.alert('Cleared', 'Expenses cleared after export.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear expenses.');
            }
          } },
        ]
      );
    } finally {
      setIsExporting(false);
    }
  }, [expenses, settlements]);

  return (
    <View style={styles.tabContent}>
      <UserProfile />
      <View style={styles.spacer} />
      <View style={styles.actions}>
        {isExporting ? (
          <ActivityIndicator />
        ) : (
          <TouchableOpacity onPress={handleExportAndClear} activeOpacity={0.85} style={styles.exportButton}>
            <Text style={styles.exportButtonText}>Export & Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.spacerLarge} />
    </View>
  );
};

export default SettingsTab;