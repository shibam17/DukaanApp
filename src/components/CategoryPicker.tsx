import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

type CategoryPickerProps = {
  visible: boolean;
  businessId: string;
  categories: Category[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (categoryId: string | null) => void;
  onCategoriesChange: (categories: Category[]) => void;
};

export default function CategoryPicker({
  visible,
  businessId,
  categories,
  selectedId,
  onClose,
  onSelect,
  onCategoriesChange,
}: CategoryPickerProps) {
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const resetLocal = () => {
    setSearch('');
    setNewName('');
    setAdding(false);
    setConfirmDeleteId(null);
    setError(null);
  };

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  const createCategory = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Enter a category name.');
      return;
    }

    setAdding(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({ business_id: businessId, name: trimmed })
      .select()
      .single();

    setAdding(false);

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create category.');
      return;
    }

    const created = data as Category;
    const next = [...categories, created].sort((a, b) => a.name.localeCompare(b.name));
    onCategoriesChange(next);
    onSelect(created.id);
    resetLocal();
    onClose();
  };

  const deleteCategory = async (categoryId: string) => {
    setDeletingId(categoryId);
    setError(null);

    // Clear category on products that used it, then delete
    await supabase
      .from('products')
      .update({ category_id: null })
      .eq('category_id', categoryId)
      .eq('business_id', businessId);

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('business_id', businessId);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      setConfirmDeleteId(null);
      return;
    }

    const next = categories.filter((c) => c.id !== categoryId);
    onCategoriesChange(next);
    if (selectedId === categoryId) {
      onSelect(null);
    }
    setConfirmDeleteId(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Category</Text>

          <TextInput
            style={styles.search}
            placeholder="Search or type to filter..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={styles.option}
            onPress={() => {
              onSelect(null);
              handleClose();
            }}
          >
            <Text style={styles.optionText}>No category</Text>
          </Pressable>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>
                {search.trim() ? 'No categories match your search' : 'No categories yet'}
              </Text>
            }
            renderItem={({ item }) => {
              const confirming = confirmDeleteId === item.id;
              const deleting = deletingId === item.id;

              if (confirming) {
                return (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>Delete “{item.name}”?</Text>
                    <View style={styles.confirmActions}>
                      <Pressable
                        style={styles.confirmCancel}
                        onPress={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                      >
                        <Text style={styles.confirmCancelText}>No</Text>
                      </Pressable>
                      <Pressable
                        style={styles.confirmYes}
                        onPress={() => deleteCategory(item.id)}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.confirmYesText}>Delete</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              }

              return (
                <View style={styles.row}>
                  <Pressable
                    style={styles.rowSelect}
                    onPress={() => {
                      onSelect(item.id);
                      handleClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedId === item.id && styles.selectedText,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => setConfirmDeleteId(item.id)}
                    hitSlop={8}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              );
            }}
          />

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="New category name"
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              style={[styles.addButton, adding && styles.disabled]}
              onPress={createCategory}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.cancel} onPress={handleClose}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 10,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 8,
  },
  list: {
    maxHeight: 280,
  },
  empty: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 16,
    fontSize: 14,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  selectedText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowSelect: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  deleteBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  confirmText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmCancel: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  confirmCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmYes: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmYesText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  addInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.7,
  },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
