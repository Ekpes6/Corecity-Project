import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { propertyAPI } from '../../services/api';
import PropertyCard from '../../components/PropertyCard';
import SearchBar from '../../components/SearchBar';
import type { Property } from '../../types';
import {
  COLORS, FONT, SPACING, RADIUS, SHADOW, LISTING_LABELS,
} from '../../constants/theme';
import { formatNaira } from '../../utils/nigeria';

// ── City data (matches web app) ───────────────────────────────────────────────
const CITIES = [
  { name: 'Lagos',         stateId: 25, img: 'https://images.unsplash.com/photo-1577613108672-f73ee6a0ddb4?w=400&q=60', count: '4,200+' },
  { name: 'Abuja',         stateId: 15, img: 'https://images.unsplash.com/photo-1580294647781-e9e0b7d5c1ab?w=400&q=60', count: '2,100+' },
  { name: 'Port Harcourt', stateId: 33, img: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=400&q=60', count: '1,400+' },
  { name: 'Kano',          stateId: 20, img: 'https://images.unsplash.com/photo-1613482297741-c3a2eeb16286?w=400&q=60', count: '900+'   },
];

const STATS = [
  { icon: 'business-outline'  as const, label: 'Properties',        value: '12,400+' },
  { icon: 'people-outline'    as const, label: 'Happy Customers',   value: '8,200+'  },
  { icon: 'map-outline'       as const, label: 'States Covered',    value: '37'      },
  { icon: 'shield-outline'    as const, label: 'Verified Agents',   value: '1,800+'  },
];

export default function HomeScreen() {
  const [featured,  setFeatured]  = useState<Property[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const loadFeatured = useCallback(async () => {
    try {
      const res = await propertyAPI.featured();
      setFeatured(res.data ?? []);
    } catch {
      setFeatured([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  const onRefresh = () => { setRefreshing(true); loadFeatured(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Header row */}
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>Nigeria's #1 Real Estate Platform</Text>
              <Text style={styles.heroTitle}>Find Your Perfect{'\n'}
                <Text style={styles.heroAccent}>Home in Nigeria</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={styles.notifBtn}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <SearchBar
            navigatesOnSubmit
            placeholder="Search by city, area, property type…"
            style={styles.searchBar}
          />

          {/* Popular keywords */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {['Lagos Island', 'Lekki', 'Maitama', 'GRA PH', 'Asokoro'].map((kw) => (
              <TouchableOpacity
                key={kw}
                style={styles.pill}
                onPress={() => router.push(`/properties?keyword=${encodeURIComponent(kw)}`)}
              >
                <Text style={styles.pillText}>{kw}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {STATS.map(({ icon, label, value }) => (
            <View key={label} style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name={icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Featured Properties ───────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionSub}>Fresh Listings</Text>
              <Text style={styles.sectionTitle}>Featured Properties</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/properties')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            // Skeleton placeholders
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: SPACING.md }}>
              {[...Array(4)].map((_, i) => (
                <View key={i} style={styles.skeleton} />
              ))}
            </ScrollView>
          ) : featured.length === 0 ? (
            <View style={styles.emptyFeatured}>
              <Ionicons name="home-outline" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No featured listings yet</Text>
            </View>
          ) : (
            <FlatList
              data={featured}
              keyExtractor={(p) => String(p.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}
              renderItem={({ item }) => (
                <PropertyCard property={item} horizontal={false} />
              )}
            />
          )}
        </View>

        {/* ── Browse by Listing Type ────────────────────────────────── */}
        <View style={[styles.section, styles.typeSection]}>
          <Text style={styles.sectionTitle}>What are you looking for?</Text>
          <View style={styles.typeRow}>
            {(['FOR_SALE', 'FOR_RENT', 'SHORT_LET'] as const).map((lt) => {
              const colorMap: Record<string, string> = {
                FOR_SALE: COLORS.primary, FOR_RENT: COLORS.accent, SHORT_LET: COLORS.blue,
              };
              const iconMap: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
                FOR_SALE: 'key-outline', FOR_RENT: 'home-outline', SHORT_LET: 'calendar-outline',
              };
              return (
                <TouchableOpacity
                  key={lt}
                  style={[styles.typeCard, { borderColor: colorMap[lt] }]}
                  onPress={() => router.push(`/properties?listingType=${lt}`)}
                >
                  <View style={[styles.typeIconWrap, { backgroundColor: `${colorMap[lt]}18` }]}>
                    <Ionicons name={iconMap[lt]} size={26} color={colorMap[lt]} />
                  </View>
                  <Text style={[styles.typeLabel, { color: colorMap[lt] }]}>
                    {LISTING_LABELS[lt]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Popular Cities ────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionSub}>Nationwide Coverage</Text>
              <Text style={styles.sectionTitle}>Browse by City</Text>
            </View>
          </View>
          <View style={styles.cityGrid}>
            {CITIES.map(({ name, stateId, img, count }) => (
              <TouchableOpacity
                key={stateId}
                style={styles.cityCard}
                onPress={() => router.push(`/properties?stateId=${stateId}`)}
              >
                <Image source={{ uri: img }} style={styles.cityImg} resizeMode="cover" />
                <View style={styles.cityOverlay} />
                <View style={styles.cityText}>
                  <Text style={styles.cityName}>{name}</Text>
                  <Text style={styles.cityCount}>{count} listings</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Why CoreCity ─────────────────────────────────────────── */}
        <View style={[styles.section, { paddingBottom: SPACING.xxl }]}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: SPACING.lg }]}>
            Why Choose CoreCity?
          </Text>
          {[
            { icon: 'shield-checkmark-outline' as const, title: 'Verified Listings', desc: 'Every listing is vetted before going live. No ghost listings, no scams.' },
            { icon: 'card-outline'             as const, title: 'Paystack Payments',  desc: 'Pay with card, bank transfer, or USSD. All transactions in Nigerian Naira ₦.' },
            { icon: 'star-outline'             as const, title: 'Trusted Agents',     desc: 'Work with licensed agents verified via BVN & NIN.' },
          ].map(({ icon, title, desc }) => (
            <View key={title} style={[styles.whyCard, SHADOW.sm]}>
              <View style={styles.whyIcon}>
                <Ionicons name={icon} size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whyTitle}>{title}</Text>
                <Text style={styles.whyDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingTop:  SPACING.md,
    paddingBottom: SPACING.xl,
  },
  heroHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   SPACING.lg,
  },
  heroGreeting: {
    color:    'rgba(255,255,255,0.65)',
    fontSize: FONT.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroTitle: {
    color:      COLORS.white,
    fontSize:   FONT.xl,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroAccent: {
    color: '#A5D65E',
  },
  notifBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    RADIUS.full,
    padding:         10,
  },
  searchBar: {
    marginBottom: SPACING.md,
  },
  pillRow: {
    flexDirection: 'row',
  },
  pill: {
    borderRadius:      RADIUS.full,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical:   6,
    marginRight:       SPACING.sm,
  },
  pillText: {
    color:    'rgba(255,255,255,0.8)',
    fontSize: FONT.xs,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection:    'row',
    backgroundColor:  COLORS.white,
    paddingVertical:  SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex:       1,
    alignItems: 'center',
  },
  statIcon: {
    backgroundColor: COLORS.primaryFaint,
    borderRadius:    RADIUS.sm,
    padding:         6,
    marginBottom:    4,
  },
  statValue: {
    fontSize:   FONT.sm,
    fontWeight: '800',
    color:      COLORS.primary,
  },
  statLabel: {
    fontSize: FONT.xs - 1,
    color:    COLORS.textMuted,
    textAlign: 'center',
  },

  // Section
  section: {
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-end',
    paddingHorizontal: SPACING.md,
    marginBottom:    SPACING.md,
  },
  sectionSub: {
    fontSize:  FONT.xs,
    fontWeight:'700',
    color:     COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize:   FONT.lg,
    fontWeight: '800',
    color:      COLORS.text,
  },
  seeAll: {
    fontSize:   FONT.sm,
    color:      COLORS.primary,
    fontWeight: '600',
  },

  // Skeleton
  skeleton: {
    width:        160,
    height:       220,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.divider,
    marginRight:  SPACING.sm,
  },
  emptyFeatured: {
    alignItems:    'center',
    paddingVertical: SPACING.xl,
    gap:           SPACING.sm,
  },
  emptyText: {
    color:    COLORS.textMuted,
    fontSize: FONT.sm,
  },

  // Type cards
  typeSection: {
    paddingHorizontal: SPACING.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
    marginTop:     SPACING.md,
  },
  typeCard: {
    flex:          1,
    alignItems:    'center',
    padding:       SPACING.md,
    borderRadius:  RADIUS.lg,
    borderWidth:   1.5,
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
  },
  typeIconWrap: {
    width:          52,
    height:         52,
    borderRadius:   RADIUS.md,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   SPACING.sm,
  },
  typeLabel: {
    fontSize:   FONT.sm,
    fontWeight: '700',
  },

  // Cities
  cityGrid: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    paddingHorizontal: SPACING.md,
    gap:              SPACING.sm,
  },
  cityCard: {
    width:        '48%',
    height:       130,
    borderRadius: RADIUS.lg,
    overflow:     'hidden',
    ...SHADOW.sm,
  },
  cityImg: {
    width:  '100%',
    height: '100%',
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  cityText: {
    position: 'absolute',
    bottom:   SPACING.sm,
    left:     SPACING.sm,
  },
  cityName: {
    color:      COLORS.white,
    fontSize:   FONT.md,
    fontWeight: '800',
  },
  cityCount: {
    color:    'rgba(255,255,255,0.72)',
    fontSize: FONT.xs,
  },

  // Why CoreCity
  whyCard: {
    flexDirection:   'row',
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom:    SPACING.sm,
    gap:             SPACING.md,
  },
  whyIcon: {
    width:          46,
    height:         46,
    backgroundColor: COLORS.primaryFaint,
    borderRadius:   RADIUS.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  whyTitle: {
    fontSize:   FONT.base,
    fontWeight: '700',
    color:      COLORS.text,
    marginBottom: 3,
  },
  whyDesc: {
    fontSize:   FONT.sm,
    color:      COLORS.textMuted,
    lineHeight: 18,
  },
});
