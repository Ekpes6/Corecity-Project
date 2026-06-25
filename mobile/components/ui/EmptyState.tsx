import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { COLORS, FONT, SPACING } from '../../constants/theme';

interface EmptyStateProps {
  icon?:        keyof typeof Ionicons.glyphMap;
  title:        string;
  message?:     string;
  actionLabel?: string;
  onAction?:    () => void;
}

export default function EmptyState({
  icon    = 'home-outline',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={52} color={COLORS.textLight} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.btn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.xl,
  },
  iconWrap: {
    width:          90,
    height:         90,
    borderRadius:   45,
    backgroundColor: COLORS.divider,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   SPACING.lg,
  },
  title: {
    fontSize:   FONT.lg,
    fontWeight: '700',
    color:      COLORS.text,
    textAlign:  'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize:   FONT.sm,
    color:      COLORS.textMuted,
    textAlign:  'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  btn: {
    alignSelf: 'center',
  },
});
