import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertyAPI, enquiryAPI, savedAPI, reservationAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import type { Property } from '../../types';
import {
  COLORS, FONT, SPACING, RADIUS, SHADOW,
  LISTING_LABELS, LISTING_COLORS,
} from '../../constants/theme';
import {
  formatNairaFull, pricePeriodLabel, propertyTypeLabel, amenityEmoji, timeAgo,
} from '../../utils/nigeria';

const { width: SCREEN_W } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id }          = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const [property,  setProperty]  = useState<Property | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saved,     setSaved]     = useState(false);
  const [imgIndex,  setImgIndex]  = useState(0);
  const [enquiring, setEnquiring] = useState(false);
  const [reserving, setReserving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await propertyAPI.getOne(id);
      setProperty(res.data);
    } catch {
      Alert.alert('Error', 'Could not load property details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!property) return null;

  const images = (property.files ?? []).filter((f) => f.fileType === 'IMAGE');
  const primaryImg = images.find((f) => f.isPrimary) ?? images[0];
  const listingColor = LISTING_COLORS[property.listingType] ?? COLORS.primary;

  const handleSave = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    const next = !saved;
    setSaved(next);
    await (next ? savedAPI.save(property.id) : savedAPI.unsave(property.id)).catch(() => setSaved(!next));
  };

  const handleEnquire = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    Alert.prompt(
      'Send Enquiry',
      `Ask about "${property.title}"`,
      async (msg) => {
        if (!msg?.trim()) return;
        setEnquiring(true);
        try {
          await enquiryAPI.send(property.id, msg.trim());
          Alert.alert('Sent!', 'Your enquiry has been sent to the seller.');
        } catch {
          Alert.alert('Error', 'Could not send enquiry. Please try again.');
        } finally {
          setEnquiring(false);
        }
      },
      'plain-text',
      `I am interested in this ${propertyTypeLabel[property.propertyType] ?? 'property'}. Please share more details.`
    );
  };

  const handleReserve = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    Alert.alert(
      'Reserve Property',
      'Pay ₦1,000 to lock a 5-day exclusive negotiation window for this property.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay ₦1,000',
          onPress: async () => {
            setReserving(true);
            try {
              const res = await reservationAPI.initiate(property.id);
              Alert.alert('Reservation Started', `Reference: ${res.data?.paymentReference ?? ''}\n\nComplete payment via your dashboard.`);
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not initiate reservation.';
              Alert.alert('Error', msg);
            } finally {
              setReserving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Image Gallery ────────────────────────────────────── */}
      <View style={styles.gallery}>
        {images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(f) => String(f.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
              setImgIndex(idx);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item.fileUrl }} style={styles.galleryImg} resizeMode="cover" />
            )}
          />
        ) : (
          <View style={[styles.galleryImg, styles.imgPlaceholder]}>
            <Ionicons name="home-outline" size={52} color={COLORS.textLight} />
          </View>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <View style={styles.imgCounter}>
            <Text style={styles.imgCounterText}>{imgIndex + 1}/{images.length}</Text>
          </View>
        )}

        {/* Back + Save overlay buttons */}
        <View style={styles.galleryActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.galleryBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.galleryBtn}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={saved ? '#FF6B6B' : COLORS.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable detail body ─────────────────────────── */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* Price + badges */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>
              {formatNairaFull(property.price)}
              <Text style={styles.pricePeriod}>
                {pricePeriodLabel[property.pricePeriod] ?? ''}
              </Text>
            </Text>
            {property.isNegotiable && (
              <Text style={styles.negotiable}>Negotiable</Text>
            )}
          </View>
          <View style={[styles.listingBadge, { backgroundColor: listingColor }]}>
            <Text style={styles.listingBadgeText}>{LISTING_LABELS[property.listingType]}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{property.title}</Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.accent} />
          <Text style={styles.locationText}>
            {[property.lgaName, property.stateName, property.address].filter(Boolean).join(', ')}
          </Text>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {property.bedrooms > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{property.bedrooms}</Text>
              <Text style={styles.statLabel}>Bed{property.bedrooms > 1 ? 's' : ''}</Text>
            </View>
          )}
          {property.bathrooms > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{property.bathrooms}</Text>
              <Text style={styles.statLabel}>Bath{property.bathrooms > 1 ? 's' : ''}</Text>
            </View>
          )}
          {property.toilets > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="filter-outline" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{property.toilets}</Text>
              <Text style={styles.statLabel}>Toilet{property.toilets > 1 ? 's' : ''}</Text>
            </View>
          )}
          {property.sizeSqm && (
            <View style={styles.statItem}>
              <Ionicons name="resize-outline" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{property.sizeSqm}</Text>
              <Text style={styles.statLabel}>m²</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{property.viewsCount}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
        </View>

        {/* Type + listed date */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              {propertyTypeLabel[property.propertyType] ?? property.propertyType}
            </Text>
          </View>
          <Text style={styles.metaDate}>Listed {timeAgo(property.createdAt)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Description */}
        {property.description && (
          <>
            <Text style={styles.sectionTitle}>About this property</Text>
            <Text style={styles.description}>{property.description}</Text>
            <View style={styles.divider} />
          </>
        )}

        {/* Amenities */}
        {(property.amenities ?? []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {(property.amenities ?? []).map((a) => (
                <View key={a} style={styles.amenityChip}>
                  <Text style={styles.amenityEmoji}>{amenityEmoji[a] ?? '✔️'}</Text>
                  <Text style={styles.amenityLabel}>{a.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Agent / Owner */}
        {(property.agentName ?? property.ownerName) && (
          <>
            <Text style={styles.sectionTitle}>Listed by</Text>
            <View style={[styles.agentCard, SHADOW.sm]}>
              <View style={styles.agentAvatar}>
                <Ionicons name="person" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>{property.agentName ?? property.ownerName}</Text>
                <Text style={styles.agentRole}>{property.agentId ? 'Verified Agent' : 'Property Owner'}</Text>
              </View>
              {property.ownerPhone && (
                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              )}
            </View>
          </>
        )}

        {/* Bottom padding so sticky bar doesn't obscure content */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky bottom action bar ──────────────────────── */}
      <View style={[styles.bottomBar, SHADOW.lg]}>
        <Button
          label="Reserve ₦1,000"
          variant="secondary"
          size="md"
          loading={reserving}
          onPress={handleReserve}
          style={{ flex: 1 }}
        />
        <Button
          label={enquiring ? 'Sending…' : 'Enquire Now'}
          variant="primary"
          size="md"
          loading={enquiring}
          onPress={handleEnquire}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Gallery
  gallery: {
    width:           SCREEN_W,
    height:          SCREEN_W * 0.62,
    backgroundColor: COLORS.divider,
  },
  galleryImg: {
    width:  SCREEN_W,
    height: SCREEN_W * 0.62,
  },
  imgPlaceholder: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: COLORS.divider,
  },
  imgCounter: {
    position:        'absolute',
    bottom:          SPACING.sm,
    right:           SPACING.sm,
    backgroundColor: COLORS.overlay,
    borderRadius:    RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  imgCounterText: {
    color:      COLORS.white,
    fontSize:   FONT.xs,
    fontWeight: '600',
  },
  galleryActions: {
    position:       'absolute',
    top:            SPACING.md,
    left:           0,
    right:          0,
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  galleryBtn: {
    backgroundColor: COLORS.overlay,
    borderRadius:    RADIUS.full,
    padding:         10,
  },

  // Body
  body: {
    flex:            1,
    backgroundColor: COLORS.background,
  },
  priceRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
    paddingHorizontal: SPACING.md,
    paddingTop:      SPACING.md,
  },
  price: {
    fontSize:   FONT.xxl,
    fontWeight: '900',
    color:      COLORS.primary,
  },
  pricePeriod: {
    fontSize:   FONT.sm,
    fontWeight: '400',
    color:      COLORS.textMuted,
  },
  negotiable: {
    fontSize:   FONT.xs,
    color:      COLORS.primaryLight,
    fontWeight: '600',
    marginTop:  2,
  },
  listingBadge: {
    borderRadius:      RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical:   6,
  },
  listingBadgeText: {
    color:      COLORS.white,
    fontSize:   FONT.sm,
    fontWeight: '700',
  },
  title: {
    fontSize:          FONT.lg,
    fontWeight:        '800',
    color:             COLORS.text,
    paddingHorizontal: SPACING.md,
    marginTop:         SPACING.sm,
    lineHeight:        26,
  },
  locationRow: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               4,
    paddingHorizontal: SPACING.md,
    marginTop:         SPACING.xs,
  },
  locationText: {
    flex:       1,
    fontSize:   FONT.sm,
    color:      COLORS.textMuted,
    lineHeight: 18,
  },

  // Stats strip
  statsStrip: {
    flexDirection:   'row',
    justifyContent:  'space-around',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop:        SPACING.md,
    borderRadius:     RADIUS.lg,
    paddingVertical:  SPACING.md,
    ...SHADOW.sm,
  },
  statItem: {
    alignItems: 'center',
    gap:        3,
  },
  statValue: {
    fontSize:   FONT.md,
    fontWeight: '800',
    color:      COLORS.text,
  },
  statLabel: {
    fontSize: FONT.xs,
    color:    COLORS.textMuted,
  },

  // Meta
  metaRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop:         SPACING.sm,
  },
  metaChip: {
    backgroundColor:   COLORS.primaryFaint,
    borderRadius:      RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   4,
  },
  metaChipText: {
    fontSize:   FONT.xs,
    color:      COLORS.primary,
    fontWeight: '700',
  },
  metaDate: {
    fontSize: FONT.xs,
    color:    COLORS.textMuted,
  },

  divider: {
    height:            1,
    backgroundColor:   COLORS.divider,
    marginHorizontal:  SPACING.md,
    marginVertical:    SPACING.md,
  },

  sectionTitle: {
    fontSize:          FONT.md,
    fontWeight:        '800',
    color:             COLORS.text,
    paddingHorizontal: SPACING.md,
    marginBottom:      SPACING.sm,
  },
  description: {
    fontSize:          FONT.base,
    color:             COLORS.textSecondary,
    lineHeight:        22,
    paddingHorizontal: SPACING.md,
  },

  // Amenities
  amenitiesGrid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  amenityChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.xs,
    backgroundColor:   COLORS.white,
    borderRadius:      RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   6,
    ...SHADOW.sm,
  },
  amenityEmoji: { fontSize: 15 },
  amenityLabel: {
    fontSize:   FONT.xs,
    color:      COLORS.textSecondary,
    fontWeight: '500',
  },

  // Agent card
  agentCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.md,
    backgroundColor:   COLORS.white,
    borderRadius:      RADIUS.lg,
    marginHorizontal:  SPACING.md,
    padding:           SPACING.md,
  },
  agentAvatar: {
    width:          48,
    height:         48,
    borderRadius:   24,
    backgroundColor: COLORS.primaryFaint,
    alignItems:     'center',
    justifyContent: 'center',
  },
  agentName: {
    fontSize:   FONT.base,
    fontWeight: '700',
    color:      COLORS.text,
  },
  agentRole: {
    fontSize: FONT.xs,
    color:    COLORS.textMuted,
    marginTop: 2,
  },

  // Bottom bar
  bottomBar: {
    flexDirection:     'row',
    gap:               SPACING.sm,
    backgroundColor:   COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderTopWidth:    1,
    borderTopColor:    COLORS.border,
  },
});
