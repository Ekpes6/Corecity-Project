import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { savedAPI } from '../../services/api';
import PropertyCard from '../../components/PropertyCard';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import type { Property } from '../../types';
import { COLORS, SPACING } from '../../constants/theme';

export default function SavedScreen() {
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const res = await savedAPI.getAll();
      setProperties(res.data ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const handleUnsave = async (id: number) => {
    Alert.alert('Remove', 'Remove this property from saved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await savedAPI.unsave(id).catch(() => null);
          setProperties((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon="heart-outline"
        title="Sign in to view saved properties"
        message="Your saved properties will appear here."
        actionLabel="Sign In"
        onAction={() => router.push('/login')}
      />
    );
  }

  if (loading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 80 }} />;
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon="heart-outline"
        title="No saved properties"
        message="Tap the heart icon on any listing to save it here."
        actionLabel="Browse Properties"
        onAction={() => router.push('/properties')}
      />
    );
  }

  return (
    <FlatList
      data={properties}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <PropertyCard
          property={item}
          horizontal
          saved
          onSave={handleUnsave}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding:       SPACING.md,
    paddingBottom: SPACING.xxl,
  },
});
