import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, RADIUS, FONT, SPACING } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress:   () => void;
  label:     string;
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?:    ViewStyle;
  textStyle?: TextStyle;
}

const variantStyle: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: COLORS.primary,  text: COLORS.white },
  secondary: { bg: COLORS.white,    text: COLORS.primary, border: COLORS.primary },
  accent:    { bg: COLORS.accent,   text: COLORS.white },
  ghost:     { bg: 'transparent',   text: COLORS.primary },
  danger:    { bg: COLORS.error,    text: COLORS.white },
};

const sizeStyle: Record<Size, { py: number; px: number; fs: number; radius: number }> = {
  sm: { py: 8,  px: 14, fs: FONT.sm,   radius: RADIUS.sm },
  md: { py: 13, px: 20, fs: FONT.base, radius: RADIUS.md },
  lg: { py: 16, px: 28, fs: FONT.md,   radius: RADIUS.lg },
};

export default function Button({
  onPress,
  label,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const v = variantStyle[variant];
  const s = sizeStyle[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor:      v.border ?? 'transparent',
          borderWidth:      v.border ? 1.5 : 0,
          paddingVertical:  s.py,
          paddingHorizontal: s.px,
          borderRadius:     s.radius,
          opacity:          disabled ? 0.45 : 1,
          alignSelf:        fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={[styles.label, { color: v.text, fontSize: s.fs }, textStyle]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '600', textAlign: 'center' },
});
