import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SPACING } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;
  leftIcon?:    keyof typeof Ionicons.glyphMap;
  rightIcon?:   keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightPress,
  containerStyle,
  secureTextEntry,
  ...props
}: InputProps) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, hasError && styles.inputError]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={COLORS.textMuted}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, leftIcon && { paddingLeft: 0 }]}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={secure}
          autoCapitalize="none"
          {...props}
        />
        {/* Toggle password visibility */}
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setSecure(!secure)} style={styles.rightIcon}>
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize:     FONT.sm,
    fontWeight:   '600',
    color:        COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.background,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    borderRadius:    RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex:            1,
    paddingVertical: 13,
    fontSize:        FONT.base,
    color:           COLORS.text,
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    padding: SPACING.xs,
  },
  errorText: {
    marginTop: 4,
    fontSize:  FONT.xs,
    color:     COLORS.error,
  },
});
