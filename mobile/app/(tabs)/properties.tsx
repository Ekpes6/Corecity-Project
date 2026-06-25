import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { propertyAPI } from '../../services/api';
import PropertyCard from '../../components/PropertyCard';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import type { Property, PagedResponse } from '../../types';
import { COLORS, FONT, SPACING, RADIUS } from '../../constants/theme';

const LISTING_TYPES = [
  { label: 'All',       value: ''           },
  { label: 'For Sale',  value: 'FOR_SALE'   },
  { label: 'For Rent',  value: 'FOR_RENT'   },
  { label: 'Short Let', value: 'SHORT_LET'  },
];

const PAGE_SIZE = 12;

export default function PropertiesScreen() {
  const params  = useLocalSearchParams<{ keyword?: string; stateId?: string; listingType?: string }>();

  const [properties,   setProperties]   = useState<Property[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(0);
  const [hasMore,      setHasMore]      = useState(true);
  const [keyword,      setKeyword]      = useState(params.keyword ?? '');
  const [listingType,  setListingType]  = useState(params.listingType ?? '');

  const isFirstLoad = useRef(true);

  const fetchProperties = useCallback(async (pg: number, reset: boolean) => {
    if (pg === 0) setLoading(true); else setLoadingMore(true);
    try {
      const res = await propertyAPI.search({
        keyword:     keyword.trim() || undefined,
        stateId:     params.stateId || undefined,
        listingType: listingType || undefined,
        page:        pg,
        size:        PAGE_SIZE,
      });
      const data: PagedResponse<Property> = res.data;
      setProperties((prev) => reset ? data.content : [...prev, ...data.content]);
      setTotal(data.totalElements);
      setHasMore(!data.last);
      setPage(pg);
    } catch {
      if (reset) setProperties([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [keyword, listingType, params.stateId]);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    }
    fetchProperties(0, true);
  }, [keyword, listingType, params.stateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string) => setKeyword(q);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProperties(page + 1, false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <SearchBar
          defaultValue={keyword}
          onSearch={handleSearch}
          placeholder="Search location, type…"
        />
      </View>

      {/* Listing type filter chips */}
      <View style={styles.filterRow}>
        <FlatList
          data={LISTING_TYPES}
          keyExtractor={(i) => i.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}
          renderItem={({ item }) => {
            const active = listingType === item.value;
            return (
              <TouchableOpacity
                onPress={() => setListingType(item.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results count */}
      {!loading && (
        <Text style={styles.resultCount}>
          {total.toLocaleString()} {total === 1 ? 'property' : 'properties'} found
        </Text>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No properties found"
          message="Try adjusting your search or filters."
          actionLabel="Clear filters"
          onAction={() => { setKeyword(''); setListingType(''); }}
        />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => <PropertyCard property={item} />}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
              : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#F8FAFC',
  },
  searchWrap: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    backgroundColor:   '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    paddingVertical:   SPACING.sm,
    backgroundColor:   '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   7,
    borderRadius:      RADIUS.full,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
    backgroundColor:   COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
  chipText: {
    fontSize:   FONT.sm,
    fontWeight: '600',
    color:      COLORS.textMuted,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  resultCount: {
    fontSize:         FONT.xs,
    color:            COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    fontWeight:        '500',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  listContent: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
});
