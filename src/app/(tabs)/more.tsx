import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';

type MenuItem = {
  label: string;
  href?: string;
  comingSoon?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Purchase History', href: '/history/purchases' },
  { label: 'Sales History', href: '/history/sales' },
  { label: 'Low Stock Alert', href: '/low-stock' },
  { label: 'Settings', comingSoon: true },
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const { business } = useBusiness();
  const [signingOut, setSigningOut] = useState(false);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email ||
    'User';

  const onSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.profileCard}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.business}>{business?.name}</Text>
        </View>

        <View style={styles.sectionList}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              style={styles.sectionRow}
              onPress={() => {
                if (item.href) router.push(item.href);
              }}
              disabled={!item.href}
            >
              <Text style={styles.sectionText}>{item.label}</Text>
              {item.comingSoon ? (
                <Text style={styles.comingSoon}>Coming soon</Text>
              ) : (
                <Text style={styles.chevron}>›</Text>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
          onPress={onSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  top: {
    flexShrink: 1,
  },
  profileCard: {
    marginBottom: 24,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  business: {
    fontSize: 16,
    color: '#6B7280',
  },
  sectionList: {
    gap: 8,
    marginBottom: 32,
  },
  sectionRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionText: {
    fontSize: 16,
    color: '#111827',
  },
  comingSoon: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  signOutButton: {
    minHeight: 48,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
  },
});
