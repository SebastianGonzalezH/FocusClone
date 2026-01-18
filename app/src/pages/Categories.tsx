import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Category {
  id: number;
  name: string;
  color_hex: string;
}

const PRESET_COLORS = [
  '#D4AF37', '#10b981', '#3b82f6', '#8b5cf6', '#0ea5e9', '#f43f5e',
  '#d946ef', '#ef4444', '#64748b', '#94a3b8', '#cbd5e1'
];

export default function Categories() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);

  async function fetchCategories() {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, color_hex')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error.message);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories();
  }, [user]);

  async function addCategory() {
    if (!user || !newName.trim()) return;
    setAdding(true);

    const { error } = await supabase
      .from('categories')
      .insert({
        name: newName.trim(),
        color_hex: newColor,
        user_id: user.id
      });

    if (error) {
      console.error('Error adding category:', error.message);
      alert(`Error: ${error.message}`);
    } else {
      setNewName('');
      await fetchCategories();
    }
    setAdding(false);
  }

  async function deleteCategory(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? Events using this category will become uncategorized.`)) {
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error.message);
      alert(`Error: ${error.message}`);
    } else {
      await fetchCategories();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-display text-2xl text-white">Categories</h1>
        <motion.button
          onClick={fetchCategories}
          disabled={loading}
          className="p-2.5 text-muted hover:text-white disabled:opacity-50 transition-colors duration-150"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Refresh"
        >
          <RefreshCw size={16} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {/* Add new category */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card p-6"
      >
        <p className="metric-label mb-4">Add Category</p>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-muted uppercase tracking-wider mb-2">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name..."
              className="input-premium text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted uppercase tracking-wider mb-2">Color</label>
            <div className="flex gap-1">
              {PRESET_COLORS.map((color) => (
                <motion.button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-7 h-7 transition-all duration-150 ${
                    newColor === color
                      ? 'ring-1 ring-white ring-offset-1 ring-offset-background'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                  whileTap={{ scale: 0.9 }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <motion.button
            onClick={addCategory}
            disabled={adding || !newName.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={14} strokeWidth={1.5} />
            Add
          </motion.button>
        </div>
      </motion.div>

      {/* Category list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="premium-card overflow-hidden"
      >
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">No categories found. Add one above or complete onboarding.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted uppercase tracking-wider bg-card w-16">Color</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-muted uppercase tracking-wider bg-card">Name</th>
                <th className="text-right px-4 py-3 text-[10px] font-medium text-muted uppercase tracking-wider bg-card w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <motion.tr
                  key={cat.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-border-subtle hover:bg-card-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <div
                      className="w-4 h-4"
                      style={{ backgroundColor: cat.color_hex }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-right">
                    <motion.button
                      onClick={() => deleteCategory(cat.id, cat.name)}
                      className="p-2 text-muted hover:text-rose-400 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete category"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      <p className="text-xs text-muted">
        The AI categorization will use your current categories when you click "Categorize" on the Dashboard.
      </p>

      {/* Reset to template */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="premium-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Reset to Template</p>
            <p className="text-xs text-muted mt-1">Delete all categories and start fresh with a template</p>
          </div>
          <motion.button
            onClick={() => {
              if (confirm('This will delete ALL your categories and event categorizations. Continue?')) {
                navigate('/onboarding/template');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw size={14} strokeWidth={1.5} />
            Reset
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
