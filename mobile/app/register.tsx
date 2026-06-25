import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { COLORS, FONT, SPACING, RADIUS } from '../constants/theme';

type Role = 'BUYER' | 'SELLER' | 'AGENT';

const ROLES: Array<{ value: Role; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; desc: string }> = [
  { value: 'BUYER',  label: 'Buyer',  icon: 'home-outline',      desc: 'I want to buy or rent a property' },
  { value: 'SELLER', label: 'Seller', icon: 'business-outline',  desc: 'I want to list & sell properties' },
  { value: 'AGENT',  label: 'Agent',  icon: 'briefcase-outline', desc: 'I\'m a licensed real estate agent' },
];

export default function RegisterScreen() {
  const { register, loading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState<Role>('BUYER');
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim())  e.lastName  = 'Last name is required';
    if (!email.trim())     e.email     = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!phone.trim())     e.phone     = 'Phone is required';
    else if (!/^(\+?234|0)[789]\d{9}$/.test(phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid Nigerian phone number';
    if (!password.trim()) e.password   = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const result = await register({ firstName, lastName, email: email.trim(), phone: phone.trim(), password, role });
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Registration Failed', result.error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.subheading}>Join thousands of Nigerians on CoreCity</Text>

        {/* Role Selector */}
        <Text style={styles.sectionLabel}>I am a…</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
              >
                <View style={[styles.roleIcon, active && styles.roleIconActive]}>
                  <Ionicons name={r.icon} size={22} color={active ? COLORS.white : COLORS.primary} />
                </View>
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{r.label}</Text>
                <Text style={styles.roleDesc} numberOfLines={2}>{r.desc}</Text>
                {active && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Name */}
        <View style={styles.nameRow}>
          <Input
            label="First name"
            placeholder="Emeka"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            error={errors.firstName}
            containerStyle={styles.halfInput}
          />
          <Input
            label="Last name"
            placeholder="Okafor"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            error={errors.lastName}
            containerStyle={styles.halfInput}
          />
        </View>

        <Input
          label="Email address"
          leftIcon="mail-outline"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          error={errors.email}
        />

        <Input
          label="Phone number"
          leftIcon="call-outline"
          placeholder="+234 801 234 5678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={errors.phone}
        />

        <Input
          label="Password"
          leftIcon="lock-closed-outline"
          placeholder="Min. 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />

        {/* Terms notice */}
        <Text style={styles.terms}>
          By registering you agree to CoreCity's{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>

        <Button
          label="Create Account"
          onPress={handleRegister}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: SPACING.md }}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow:          1,
    backgroundColor:   COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop:        SPACING.lg,
    paddingBottom:     SPACING.xxl,
  },
  heading: {
    fontSize:   FONT.xxl,
    fontWeight: '900',
    color:      COLORS.text,
  },
  subheading: {
    fontSize:     FONT.sm,
    color:        COLORS.textMuted,
    marginBottom: SPACING.lg,
    marginTop:    4,
  },
  sectionLabel: {
    fontSize:     FONT.sm,
    fontWeight:   '700',
    color:        COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
    marginBottom:  SPACING.lg,
  },
  roleCard: {
    flex:            1,
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.sm,
    alignItems:      'center',
    borderWidth:     2,
    borderColor:     COLORS.border,
    position:        'relative',
  },
  roleCardActive: {
    borderColor:     COLORS.primary,
    backgroundColor: COLORS.primaryFaint,
  },
  roleIcon: {
    backgroundColor: COLORS.primaryFaint,
    borderRadius:    RADIUS.md,
    padding:         10,
    marginBottom:    6,
  },
  roleIconActive: {
    backgroundColor: COLORS.primary,
  },
  roleLabel: {
    fontSize:   FONT.sm,
    fontWeight: '700',
    color:      COLORS.text,
    marginBottom: 3,
  },
  roleLabelActive: {
    color: COLORS.primary,
  },
  roleDesc: {
    fontSize:  FONT.xs,
    color:     COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  roleCheck: {
    position:        'absolute',
    top:             6,
    right:           6,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.full,
  },
  nameRow: {
    flexDirection: 'row',
    gap:           SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  terms: {
    fontSize:  FONT.xs,
    color:     COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
  termsLink: {
    color:      COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACING.lg,
  },
  footerText: {
    fontSize: FONT.sm,
    color:    COLORS.textMuted,
  },
  footerLink: {
    fontSize:   FONT.sm,
    color:      COLORS.primary,
    fontWeight: '700',
  },
});
