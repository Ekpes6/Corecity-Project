import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT, SPACING, SHADOW } from '../../constants/theme';

interface SearchBarProps {
  defaultValue?: string;
  onSearch?:     (query: string) => void;
  placeholder?:  string;
  style?:        ViewStyle;
  /** If true, tapping navigates to /properties?keyword=... instead of calling onSearch */
  navigatesOnSubmit?: boolean;
}

export default function SearchBar({
  defaultValue = '',
  onSearch,
  placeholder = 'Search by location, type…',
  style,
  navigatesOnSubmit = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = () => {
    if (navigatesOnSubmit) {
      router.push(`/properties?keyword=${encodeURIComponent(query.trim())}`);
    } else {
      onSearch?.(query.trim());
    }
  };

  return (
    <View style={[styles.container, SHADOW.sm, style]}>
      <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        autoCorrect={false}
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={() => { setQuery(''); onSearch?.(''); }}>
          <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={handleSubmit}
        style={styles.searchBtn}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.full,
    paddingLeft:     SPACING.md,
    paddingRight:    6,
    paddingVertical: 6,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex:        1,
    fontSize:    FONT.base,
    color:       COLORS.text,
    paddingVertical: 6,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.full,
    padding:         8,
    marginLeft:      SPACING.xs,
  },
});
