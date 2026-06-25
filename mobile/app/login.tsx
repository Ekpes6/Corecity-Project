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
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { COLORS, FONT, SPACING, RADIUS } from '../constants/theme';

export default function LoginScreen() {
  const { login, loading } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!email.trim())     e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password.trim())  e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    const result = await login({ email: email.trim(), password });
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', result.error ?? 'Something went wrong. Please try again.');
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
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>CC</Text>
          </View>
          <Text style={styles.brandName}>
            Core<Text style={{ color: COLORS.accent }}>City</Text>
          </Text>
          <Text style={styles.tagline}>Nigeria's #1 Real Estate Platform</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to your account</Text>

          <Input
            label="Email address"
            leftIcon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
            containerStyle={{ marginTop: SPACING.md }}
          />

          <Input
            label="Password"
            leftIcon="lock-closed-outline"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: SPACING.md }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow:  1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  brand: {
    alignItems:   'center',
    paddingTop:   SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  logoWrap: {
    width:           72,
    height:          72,
    borderRadius:    20,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    SPACING.sm,
  },
  logoText: {
    color:      COLORS.white,
    fontSize:   FONT.xxl,
    fontWeight: '900',
  },
  brandName: {
    fontSize:   FONT.xxl,
    fontWeight: '900',
    color:      COLORS.primary,
  },
  tagline: {
    fontSize:  FONT.sm,
    color:     COLORS.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.xl,
    padding:         SPACING.lg,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.07,
    shadowRadius:    12,
    elevation:       4,
  },
  heading: {
    fontSize:   FONT.xl,
    fontWeight: '800',
    color:      COLORS.text,
  },
  subheading: {
    fontSize:   FONT.sm,
    color:      COLORS.textMuted,
    marginTop:  4,
  },
  forgotWrap: {
    alignSelf:    'flex-end',
    marginBottom: SPACING.xs,
  },
  forgotText: {
    fontSize:   FONT.sm,
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
