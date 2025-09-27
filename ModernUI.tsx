import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from './useTheme';

// Modern Button Component
interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const { colors } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    };

    // Size variations
    const sizeStyles = {
      small: { paddingVertical: 8, paddingHorizontal: 16 },
      medium: { paddingVertical: 12, paddingHorizontal: 20 },
      large: { paddingVertical: 16, paddingHorizontal: 24 },
    };

    // Variant styles
    const variantStyles = {
      primary: { backgroundColor: colors.buttonPrimary },
      secondary: { backgroundColor: colors.buttonSecondary, borderWidth: 1, borderColor: colors.border },
      tertiary: { backgroundColor: 'transparent' },
      success: { backgroundColor: colors.success },
      error: { backgroundColor: colors.error },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.6 }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles = {
      primary: { color: colors.textOnPrimary, fontWeight: '600' as const },
      secondary: { color: colors.text, fontWeight: '500' as const },
      tertiary: { color: colors.primary, fontWeight: '500' as const },
      success: { color: colors.textOnPrimary, fontWeight: '600' as const },
      error: { color: colors.textOnPrimary, fontWeight: '600' as const },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
    </TouchableOpacity>
  );
};

// Modern Card Component
interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  gradient?: boolean;
  padding?: number;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  style,
  elevated = false,
  gradient = false,
  padding = 16,
}) => {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? colors.cardElevated : colors.card,
    borderRadius: 16,
    padding,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: elevated ? 4 : 2 },
    shadowOpacity: elevated ? 0.15 : 0.1,
    shadowRadius: elevated ? 8 : 4,
    elevation: elevated ? 6 : 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  };

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};

// Modern Input Component
interface ModernInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  style,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  leftIcon,
  rightIcon,
}) => {
  const { colors } = useTheme();

  const inputContainerStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: error ? colors.error : colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    ...(multiline && { textAlignVertical: 'top' }),
  };

  return (
    <View style={style}>
      {label && (
        <Text style={{
          fontSize: 14,
          fontWeight: '500' as const,
          color: colors.text,
          marginBottom: 8,
        }}>
          {label}
        </Text>
      )}
      <View style={inputContainerStyle}>
        {leftIcon && <View style={{ marginRight: 12 }}>{leftIcon}</View>}
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
        />
        {rightIcon && <View style={{ marginLeft: 12 }}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={{
          fontSize: 12,
          color: colors.error,
          marginTop: 4,
        }}>
          {error}
        </Text>
      )}
    </View>
  );
};

// Modern Tab Component
interface ModernTabProps {
  title: string;
  isActive: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  badge?: number;
}

export const ModernTab: React.FC<ModernTabProps> = ({
  title,
  isActive,
  onPress,
  icon,
  badge,
}) => {
  const { colors } = useTheme();

  const tabStyle: ViewStyle = {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: isActive ? colors.primary : 'transparent',
    shadowColor: isActive ? colors.shadow : 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isActive ? 0.1 : 0,
    shadowRadius: 4,
    elevation: isActive ? 2 : 0,
    minWidth: 80,
  };

  const textStyle: TextStyle = {
    fontSize: 13,
    fontWeight: isActive ? '600' : '500',
    color: isActive ? colors.textOnPrimary : colors.textSecondary,
    marginTop: icon ? 4 : 0,
    textAlign: 'center',
    includeFontPadding: false,
  };

  return (
    <TouchableOpacity style={tabStyle} onPress={onPress} activeOpacity={0.8}>
      <View style={{ position: 'relative' }}>
        {icon && (
          <View style={{ alignItems: 'center' }}>
            {icon}
            {badge && badge > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -8,
                backgroundColor: colors.error,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  color: colors.textOnPrimary,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {badge > 99 ? '99+' : badge.toString()}
                </Text>
              </View>
            )}
          </View>
        )}
        <Text
          style={textStyle}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.9}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Modern Header Component
interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  gradient?: boolean;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  gradient = false,
}) => {
  const { colors } = useTheme();

  const headerStyle: ViewStyle = {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: gradient ? 'transparent' : colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };

  return (
    <View style={headerStyle}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1 }}>
          {leftAction && (
            <View style={{ position: 'absolute', left: 0, zIndex: 1 }}>
              {leftAction}
            </View>
          )}
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
            }}>
              {title}
            </Text>
            {subtitle && (
              <Text style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 2,
                textAlign: 'center',
              }}>
                {subtitle}
              </Text>
            )}
          </View>
          {rightAction && (
            <View style={{ position: 'absolute', right: 0, zIndex: 1 }}>
              {rightAction}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// Modern List Item Component
interface ModernListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ModernListItem: React.FC<ModernListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const itemStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  };

  const content = (
    <View style={[itemStyle, style]}>
      {leftIcon && (
        <View style={{ marginRight: 16 }}>
          {leftIcon}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '500',
          color: colors.text,
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 2,
          }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && (
        <View style={{ marginLeft: 16 }}>
          {rightIcon}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Icon Components (simple text-based icons for now)
export const Icons = {
  Add: () => <Text style={{ fontSize: 18, color: 'currentColor' }}>+</Text>,
  Remove: () => <Text style={{ fontSize: 18, color: 'currentColor' }}>−</Text>,
  Edit: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>✏️</Text>,
  Delete: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>🗑️</Text>,
  User: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>👤</Text>,
  Money: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>₹</Text>,
  Chart: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>📊</Text>,
  Settings: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>⚙️</Text>,
  Calendar: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>📅</Text>,
  Filter: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>🔍</Text>,
  Check: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>✓</Text>,
  Arrow: () => <Text style={{ fontSize: 14, color: 'currentColor' }}>→</Text>,
  Back: () => <Text style={{ fontSize: 14, color: 'currentColor' }}>←</Text>,
  Close: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>×</Text>,
  Menu: () => <Text style={{ fontSize: 16, color: 'currentColor' }}>☰</Text>,
};
