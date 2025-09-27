import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BillBuddyLogoProps {
  size?: number;
  showText?: boolean;
}

const BillBuddyLogo: React.FC<BillBuddyLogoProps> = ({ size = 80, showText = true }) => {
  return (
    <View style={styles.container}>
      {/* Bill Buddy Text */}
      {showText && (
        <Text style={[styles.logoText, { fontSize: size * 0.4 }]}>
          Bill Buddy
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
  logoText: {
    color: '#3B82F6', // Blue
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default BillBuddyLogo;
