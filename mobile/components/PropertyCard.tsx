import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Property } from '../../types';
import { COLORS, RADIUS, FONT, SPACING, SHADOW, LISTING_COLORS, LISTING_LABELS } from '../../constants/theme';
import { formatNaira, pricePeriodLabel, propertyTypeLabel } from '../../utils/nigeria';

const CARD_WIDTH = (Dimensions.get('window').width - SPACING.md * 2 - SPACING.sm) / 2;
const IMG_HEIGHT = CARD_WIDTH * 0.65;

interface PropertyCardProps {
  property:    Property;
  onSave?:     (id: number) => void;
  saved?:      boolean;
  horizontal?: boolean;   // full-width horizontal card variant
}

export default function PropertyCard({
  property,
  onSave,
  saved = false,
  horizontal = false,
}: PropertyCardProps) {
  const primaryFile = property.files?.find((f) => f.isPrimary) ?? property.files?.[0];
  const imageUri    = primaryFile?.fileUrl ?? null;
  const listingColor = LISTING_COLORS[property.listingType] ?? COLORS.primary;

  const handlePress = () => router.push(`/property/${property.id}`);

  if (horizontal) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        style={[styles.hCard, SHADOW.md]}
      >
        {/* Image */}
        <View style={styles.hImageWrap}>
          {imageUri
            ? <Image source={{ uri: imageUri }} style={styles.hImage} resizeMode="cover" />
            : <View style={[styles.hImage, styles.imgPlaceholder]}>
                <Ionicons name="home-outline" size={28} color={COLORS.textLight} />
              </View>
          }
          {/* Listing type badge */}
          <View style={[styles.badge, { backgroundColor: listingColor }]}>
            <Text style={styles.badgeText}>{LISTING_LABELS[property.listingType]}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.hInfo}>
          <Text style={styles.price} numberOfLines={1}>
            {formatNaira(property.price)}
            <Text style={styles.period}>{pricePeriodLabel[property.pricePeriod] ?? ''}</Text>
          </Text>
          <Text style={styles.title} numberOfLines={2}>{property.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {property.stateName ?? property.address}
            </Text>
          </View>
          <View style={styles.statsRow}>
            {property.bedrooms > 0 && (
              <View style={styles.stat}>
                <Ionicons name="bed-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.statText}>{property.bedrooms}</Text>
              </View>
            )}
            {property.bathrooms > 0 && (
              <View style={styles.stat}>
                <Ionicons name="water-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.statText}>{property.bathrooms}</Text>
              </View>
            )}
            {property.sizeSqm && (
              <View style={styles.stat}>
                <Ionicons name="resize-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.statText}>{property.sizeSqm}m²</Text>
              </View>
            )}
            <Text style={styles.typeChip}>
              {propertyTypeLabel[property.propertyType] ?? property.propertyType}
            </Text>
          </View>
        </View>

        {/* Save button */}
        {onSave && (
          <TouchableOpacity
            onPress={() => onSave(property.id)}
            style={styles.saveBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={saved ? COLORS.error : COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // ── Grid / default card ───────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={[styles.card, { width: CARD_WIDTH }, SHADOW.sm]}
    >
      <View style={[styles.imageWrap, { height: IMG_HEIGHT }]}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, styles.imgPlaceholder]}>
              <Ionicons name="home-outline" size={24} color={COLORS.textLight} />
            </View>
        }
        <View style={[styles.badge, { backgroundColor: listingColor }]}>
          <Text style={styles.badgeText}>{LISTING_LABELS[property.listingType]}</Text>
        </View>
        {onSave && (
          <TouchableOpacity
            onPress={() => onSave(property.id)}
            style={styles.gridSaveBtn}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={16}
              color={saved ? COLORS.error : COLORS.white}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.price} numberOfLines={1}>
          {formatNaira(property.price)}
          <Text style={styles.period}>{pricePeriodLabel[property.pricePeriod] ?? ''}</Text>
        </Text>
        <Text style={styles.title} numberOfLines={2}>{property.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {property.stateName ?? property.address}
          </Text>
        </View>
        {(property.bedrooms > 0 || property.bathrooms > 0) && (
          <View style={styles.statsRow}>
            {property.bedrooms > 0 && (
              <View style={styles.stat}>
                <Ionicons name="bed-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.statText}>{property.bedrooms} bed</Text>
              </View>
            )}
            {property.bathrooms > 0 && (
              <View style={styles.stat}>
                <Ionicons name="water-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.statText}>{property.bathrooms} bath</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Grid card ──
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    overflow:        'hidden',
    marginBottom:    SPACING.sm,
  },
  imageWrap: {
    width:        '100%',
    overflow:     'hidden',
    borderRadius: RADIUS.lg,
  },
  imgPlaceholder: {
    backgroundColor: COLORS.divider,
    alignItems:      'center',
    justifyContent:  'center',
  },
  badge: {
    position:     'absolute',
    top:          8,
    left:         8,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  badgeText: {
    color:      COLORS.white,
    fontSize:   FONT.xs,
    fontWeight: '700',
  },
  gridSaveBtn: {
    position:        'absolute',
    top:             8,
    right:           8,
    backgroundColor: COLORS.overlay,
    borderRadius:    RADIUS.full,
    padding:         5,
  },
  cardBody: {
    padding: SPACING.sm,
  },

  // ── Horizontal card ──
  hCard: {
    flexDirection:   'row',
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    overflow:        'hidden',
    marginBottom:    SPACING.sm,
  },
  hImageWrap: {
    width:  130,
    height: 120,
  },
  hImage: {
    width:  '100%',
    height: '100%',
  },
  hInfo: {
    flex:    1,
    padding: SPACING.sm,
    paddingRight: SPACING.xl,
  },
  saveBtn: {
    position: 'absolute',
    top:      SPACING.sm,
    right:    SPACING.sm,
  },

  // ── Shared ──
  price: {
    fontSize:   FONT.md,
    fontWeight: '800',
    color:      COLORS.primary,
    marginBottom: 2,
  },
  period: {
    fontSize:   FONT.xs,
    fontWeight: '400',
    color:      COLORS.textMuted,
  },
  title: {
    fontSize:    FONT.sm,
    fontWeight:  '600',
    color:       COLORS.text,
    marginBottom: 3,
    lineHeight:  18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
    marginBottom:  4,
  },
  locationText: {
    fontSize: FONT.xs,
    color:    COLORS.textMuted,
    flex:     1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           SPACING.xs,
    marginTop:     2,
  },
  stat: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  statText: {
    fontSize: FONT.xs,
    color:    COLORS.textMuted,
  },
  typeChip: {
    fontSize:          FONT.xs,
    color:             COLORS.primaryLight,
    fontWeight:        '600',
    marginLeft:        'auto',
  },
});
