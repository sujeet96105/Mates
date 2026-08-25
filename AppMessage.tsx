import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';

type MessageVariant = 'success' | 'error' | 'info' | 'warning';

type ShowMessageOptions = {
  title: string;
  message?: string;
  variant?: MessageVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ActiveMessage = Required<Pick<ShowMessageOptions, 'title' | 'variant'>> &
  Pick<ShowMessageOptions, 'message' | 'actionLabel' | 'onAction'>;

type AppMessageContextType = {
  showMessage: (options: ShowMessageOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const AppMessageContext = createContext<AppMessageContextType | undefined>(undefined);

export const AppMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const [activeMessage, setActiveMessage] = useState<ActiveMessage | null>(null);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  const hideMessage = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    Animated.timing(translateY, {
      toValue: -120,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setActiveMessage(null));
  }, [translateY]);

  const showMessage = useCallback(
    ({
      title,
      message,
      variant = 'info',
      durationMs = 2800,
      actionLabel,
      onAction,
    }: ShowMessageOptions) => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      setActiveMessage({ title, message, variant, actionLabel, onAction });
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }).start();

      if (durationMs > 0) {
        dismissTimerRef.current = setTimeout(hideMessage, durationMs);
      }
    },
    [hideMessage, translateY]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmOptions(options);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const resolveConfirm = useCallback((value: boolean) => {
    confirmResolverRef.current?.(value);
    confirmResolverRef.current = null;
    setConfirmOptions(null);
  }, []);

  const accentColor = activeMessage ? colors[activeMessage.variant] : colors.info;
  const confirmColor = confirmOptions?.destructive ? colors.error : colors.primary;

  const contextValue = useMemo(
    () => ({ showMessage, confirm }),
    [confirm, showMessage]
  );

  return (
    <AppMessageContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}
        {activeMessage && (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.bannerWrap,
              { paddingTop: Math.max(insets.top, 8), transform: [{ translateY }] },
            ]}
          >
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: colors.cardElevated,
                  borderColor: colors.borderLight,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View style={[styles.accent, { backgroundColor: accentColor }]} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>
                  {activeMessage.title}
                </Text>
                {!!activeMessage.message && (
                  <Text style={[styles.bannerMessage, { color: colors.textSecondary }]}>
                    {activeMessage.message}
                  </Text>
                )}
              </View>
              {!!activeMessage.actionLabel && (
                <TouchableOpacity
                  onPress={() => {
                    hideMessage();
                    activeMessage.onAction?.();
                  }}
                  style={[styles.bannerAction, { backgroundColor: colors.buttonSecondary }]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.bannerActionText, { color: colors.text }]}>
                    {activeMessage.actionLabel}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
      </View>

      <Modal
        transparent
        visible={!!confirmOptions}
        animationType="fade"
        onRequestClose={() => resolveConfirm(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {confirmOptions?.title}
            </Text>
            {!!confirmOptions?.message && (
              <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                {confirmOptions.message}
              </Text>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.buttonSecondary }]}
                onPress={() => resolveConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  {confirmOptions?.cancelLabel ?? 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: confirmColor }]}
                onPress={() => resolveConfirm(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmText, { color: colors.textOnPrimary }]}>
                  {confirmOptions?.confirmLabel ?? 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppMessageContext.Provider>
  );
};

export function useAppMessage(): AppMessageContextType {
  const context = useContext(AppMessageContext);
  if (!context) {
    throw new Error('useAppMessage must be used within AppMessageProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bannerWrap: {
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  banner: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    minHeight: 58,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  accent: {
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
    width: 4,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerMessage: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  bannerAction: {
    borderRadius: 10,
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 8,
    maxWidth: 420,
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    width: '100%',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
