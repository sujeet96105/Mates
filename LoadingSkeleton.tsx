import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from './useTheme';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
  style?: any;
}

/**
 * LoadingSkeleton - Animated shimmer skeleton for loading states
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  marginBottom = 12,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          marginBottom,
          backgroundColor: colors.surface,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * ExpenseItemSkeleton - Skeleton for expense list items
 */
export const ExpenseItemSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <LoadingSkeleton width="60%" height={16} marginBottom={0} />
        <LoadingSkeleton width="25%" height={16} marginBottom={0} />
      </View>
      <LoadingSkeleton width="45%" height={14} marginBottom={4} />
      <LoadingSkeleton width="70%" height={14} marginBottom={4} />
      <LoadingSkeleton width="35%" height={12} marginBottom={0} />
    </View>
  );
};

/**
 * FriendItemSkeleton - Skeleton for friend list items
 */
export const FriendItemSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <LoadingSkeleton width="50%" height={16} marginBottom={0} />
      <LoadingSkeleton width="20%" height={32} borderRadius={8} marginBottom={0} />
    </View>
  );
};

/**
 * SummaryCardSkeleton - Skeleton for summary cards
 */
export const SummaryCardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <LoadingSkeleton width="40%" height={18} marginBottom={16} />
      <LoadingSkeleton width="100%" height={50} borderRadius={8} marginBottom={12} />
      <LoadingSkeleton width="100%" height={50} borderRadius={8} marginBottom={12} />
      <LoadingSkeleton width="100%" height={70} borderRadius={12} marginBottom={0} />
    </View>
  );
};

/**
 * CardSkeleton - Generic card skeleton
 */
export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <LoadingSkeleton width="50%" height={20} marginBottom={16} />
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} width="100%" height={40} marginBottom={12} />
      ))}
    </View>
  );
};

export default LoadingSkeleton;
