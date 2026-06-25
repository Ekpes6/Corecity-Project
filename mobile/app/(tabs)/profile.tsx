import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { walletAPI, propertyAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import type { Wallet, Property } from '../../types';
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { formatNairaFull, timeAgo } from '../../utils/nigeria';

export default function ProfileScreen() {
  const { user, isAuthenticated, isSeller, isAgent, isAdmin, logout } = useAuth();

  const [wallet,      setWallet]      = useState<Wallet | null>(null);
  const [myListings,  setMyListings]  = useState<Property[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [walletRes, listingsRes] = await Promise.allSettled([
        walletAPI.get(),
        propertyAPI.getMyList(),
      ]);
      if (walletRes.status   === 'fulfilled') setWallet(walletRes.value.data);
      if (listingsRes.status === 'fulfilled') setMyListings(listingsRes.value.data?.content ?? listingsRes.value.data ?? []);
    } catch {
      // Silent — not all roles have wallets
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel',   style: 'cancel'      },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <EmptyState
        icon="person-outline"
        title="You're not signed in"
        message="Sign in to access your dashboard, listings, wallet, and more."
        actionLabel="Sign In"
        onAction={() => router.push('/login')}
      />
    );
  }

  const role = user?.role ?? 'BUYER';
  const roleColor: Record<string, string> = {
    BUYER: COLORS.blue, SELLER: COLORS.accent, AGENT: COLORS.primary, ADMIN: '#7B3FA0',
  };

  const QUICK_ACTIONS = [
    isSeller || isAgent
      ? { icon: 'add-circle-outline' as const, label: 'List Property', route: '/dashboard/list' }
      : null,
    { icon: 'list-outline'           as const, label: 'My Listings',   route: '/dashboard/listings' },
    { icon: 'chatbubble-outline'     as const, label: 'Enquiries',     route: '/dashboard/enquiries' },
    { icon: 'receipt-outline'        as const, label: 'Transactions',  route: '/dashboard/transactions' },
    wallet !== null
      ? { icon: 'wallet-outline'     as const, label: 'Wallet',        route: '/dashboard/wallet' }
      : null,
    isAdmin
      ? { icon: 'shield-outline'     as const, label: 'Moderation',    route: '/dashboard/admin' }
      : null,
  ].filter(Boolean) as Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; label: string; route: string }>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Header card ──────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitials}>
              {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: `${roleColor[role]}20` }]}>
                <Text style={[styles.roleText, { color: roleColor[role] }]}>{role}</Text>
              </View>
              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* ── Wallet card ───────────────────────────────────────── */}
        {wallet !== null && (
          <View style={[styles.walletCard, SHADOW.md]}>
            <View>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletBalance}>{formatNairaFull(wallet.balance)}</Text>
            </View>
            <Button
              label="Withdraw"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/dashboard/wallet')}
            />
          </View>
        )}

        {/* ── Reputation (agents) ───────────────────────────────── */}
        {isAgent && (
          <View style={styles.reputationRow}>
            <Ionicons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.reputationText}>
              Reputation Score: <Text style={{ fontWeight: '800', color: COLORS.primary }}>{user?.reputationScore ?? 0}</Text>
            </Text>
            {user?.isExecutiveAgent && (
              <View style={styles.execBadge}>
                <Text style={styles.execText}>🏆 Executive Agent</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Quick actions grid ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(({ icon, label, route }) => (
            <TouchableOpacity
              key={label}
              style={[styles.actionCard, SHADOW.sm]}
              onPress={() => router.push(route as never)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={icon} size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent listings ───────────────────────────────────── */}
        {(isSeller || isAgent) && (
          <View style={styles.listingsSection}>
            <Text style={styles.sectionTitle}>Recent Listings</Text>
            {loading
              ? <ActivityIndicator color={COLORS.primary} />
              : myListings.slice(0, 5).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.listingRow, SHADOW.sm]}
                    onPress={() => router.push(`/property/${p.id}`)}
                  >
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.listingMeta}>{p.status} · {timeAgo(p.createdAt)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))
            }
          </View>
        )}

        {/* ── Settings ─────────────────────────────────────────── */}
        <View style={styles.settingsSection}>
          {[
            { icon: 'person-outline'     as const, label: 'Edit Profile',       route: '/dashboard/profile' },
            { icon: 'lock-closed-outline'as const, label: 'Change Password',    route: '/dashboard/password' },
            { icon: 'shield-outline'     as const, label: 'Verify Identity',    route: '/dashboard/kyc'     },
            { icon: 'help-circle-outline'as const, label: 'Help & Support',     route: '/dashboard/support' },
            { icon: 'document-text-outline' as const, label: 'Terms of Service',route: '/terms'             },
          ].map(({ icon, label, route }) => (
            <TouchableOpacity
              key={label}
              style={styles.settingsRow}
              onPress={() => router.push(route as never)}
            >
              <View style={styles.settingsIcon}>
                <Ionicons name={icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.settingsLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  headerCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.primary,
    padding:         SPACING.lg,
    gap:             SPACING.md,
  },
  avatarWrap: {
    width:          58,
    height:         58,
    borderRadius:   29,
    backgroundColor:'rgba(255,255,255,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color:      COLORS.white,
    fontSize:   FONT.xl,
    fontWeight: '800',
  },
  userName: {
    color:      COLORS.white,
    fontSize:   FONT.lg,
    fontWeight: '800',
  },
  userEmail: {
    color:   'rgba(255,255,255,0.65)',
    fontSize: FONT.xs,
    marginVertical: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.xs,
    marginTop:     4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      RADIUS.full,
  },
  roleText: {
    fontSize:   FONT.xs,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  verifiedText: {
    fontSize:   FONT.xs,
    color:      COLORS.success,
    fontWeight: '600',
  },
  logoutBtn: {
    padding: SPACING.sm,
  },

  walletCard: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginTop:        SPACING.md,
    borderRadius:     RADIUS.lg,
    padding:          SPACING.md,
  },
  walletLabel: {
    color:   'rgba(255,255,255,0.65)',
    fontSize: FONT.xs,
    marginBottom: 4,
  },
  walletBalance: {
    color:      COLORS.white,
    fontSize:   FONT.xl,
    fontWeight: '800',
  },

  reputationRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
  },
  reputationText: {
    fontSize: FONT.sm,
    color:    COLORS.textSecondary,
    flex:     1,
  },
  execBadge: {
    backgroundColor: '#7B3FA020',
    borderRadius:    RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  execText: {
    fontSize:   FONT.xs,
    color:      '#7B3FA0',
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize:          FONT.md,
    fontWeight:        '800',
    color:             COLORS.text,
    paddingHorizontal: SPACING.md,
    marginTop:         SPACING.lg,
    marginBottom:      SPACING.sm,
  },
  actionsGrid: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    paddingHorizontal: SPACING.md,
    gap:              SPACING.sm,
  },
  actionCard: {
    width:           '31%',
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    alignItems:      'center',
    gap:             SPACING.xs,
  },
  actionIcon: {
    backgroundColor: COLORS.primaryFaint,
    borderRadius:    RADIUS.md,
    padding:         10,
  },
  actionLabel: {
    fontSize:   FONT.xs,
    fontWeight: '600',
    color:      COLORS.textSecondary,
    textAlign:  'center',
  },

  listingsSection: {
    paddingHorizontal: SPACING.md,
  },
  listingRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    gap:             SPACING.sm,
  },
  listingInfo: { flex: 1 },
  listingTitle: {
    fontSize:   FONT.sm,
    fontWeight: '600',
    color:      COLORS.text,
  },
  listingMeta: {
    fontSize: FONT.xs,
    color:    COLORS.textMuted,
    marginTop: 2,
  },

  settingsSection: {
    marginHorizontal: SPACING.md,
    marginTop:        SPACING.lg,
    backgroundColor:  COLORS.white,
    borderRadius:     RADIUS.lg,
    overflow:         'hidden',
  },
  settingsRow: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap:             SPACING.md,
  },
  settingsIcon: {
    width:          36,
    height:         36,
    backgroundColor: COLORS.primaryFaint,
    borderRadius:   RADIUS.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex:       1,
    fontSize:   FONT.base,
    color:      COLORS.text,
    fontWeight: '500',
  },
});
