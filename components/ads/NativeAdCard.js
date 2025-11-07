import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView, NativeAdEventType } from 'react-native-google-mobile-ads';
import { useTheme } from '../../useTheme';

// Props: { adUnitId: string, visible?: boolean }
export default function NativeAdCard({ adUnitId, visible = true }) {
  const { isDarkMode, colors } = useTheme();
  const [nativeAd, setNativeAd] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sponsored: {
      position: 'absolute',
      top: 10,
      right: 1,
      color: colors.textSecondary,
      opacity: 0.6,
      fontSize: 12,
      fontWeight: '500',
    },
    media: {
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      aspectRatio: 16 / 9,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    textBlock: { flex: 1 },
    headline: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    advertiser: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    cta: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 96,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    ctaText: {
      color: colors.textOnPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
  }), [colors, isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    let adInstance = null;

    const load = async () => {
      try {
        if (!visible) return;
        setLoaded(false);
        adInstance = await NativeAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: false,
          mediaAspectRatio: 0, // FLEXIBLE
        });
        if (!isMounted) return;

        // Optional events (paid) - not used for UI, but can be logged
        try { adInstance.addAdEventListener(NativeAdEventType.PAID, () => {}); } catch {}

        setNativeAd(adInstance);
        setLoaded(true);
      } catch (e) {
        setLoaded(false);
      }
    };

    load();
    return () => {
      isMounted = false;
      try { adInstance?.destroy(); } catch {}
      setNativeAd(null);
      setLoaded(false);
    };
  }, [adUnitId, visible]);

  if (!visible || !loaded || !nativeAd) return null;

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <Text style={styles.sponsored}>Ad</Text>

      {nativeAd.mediaContent ? (
        <NativeMediaView style={styles.media} />
      ) : null}

      <View style={styles.row}>
        <View style={styles.textBlock}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={2} style={styles.headline}> </Text>
          </NativeAsset>
          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text numberOfLines={1} style={styles.advertiser}> </Text>
          </NativeAsset>
        </View>
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <TouchableOpacity activeOpacity={0.9} style={styles.cta}>
            <Text style={styles.ctaText}> </Text>
          </TouchableOpacity>
        </NativeAsset>
      </View>
    </NativeAdView>
  );
}
