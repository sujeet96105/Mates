import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MatesLogoProps {
  size?: number;
  showText?: boolean;
}

const MatesLogo: React.FC<MatesLogoProps> = ({ size = 80, showText = true }) => {
  return (
    <View style={styles.container}>
      {/* Mates Text Only */}
      {showText && (
        <Text style={[styles.matesText, { fontSize: size * 0.4 }]}>
          Mates
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  matesText: {
    color: '#3B82F6', // Blue
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MatesLogo;
