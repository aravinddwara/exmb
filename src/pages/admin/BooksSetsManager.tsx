import React, { useState, useEffect } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { Plus, Trash2, Layout, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const BooksSetsManager: React.FC = () => {
  const { booksSets, addBookSet, deleteBookSet, fetchCoreData, reorderBookSets } = useAdminStore();
  const [newSetName, setNewSetName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData]);

  const handleAddSet = async () => {
    if (!newSetName.trim()) return;
    try {
      await addBookSet({ id: uuidv4(), name: newSetName });
      setNewSetName('');
    } catch (e: any) {
      alert("Failed to add book/set: " + e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans bg-geist-bg-light dark:bg-geist-bg-dark h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">Books & Sets Manager</h1>
        <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-1">Manage Books and Sets for categorization.</p>
      </div>

      <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4">
        <h2 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-4 flex items-center gap-2">
          <Layout className="w-5 h-5" /> Books / Sets
        </h2>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newSetName} 
            onChange={e => setNewSetName(e.target.value)} 
            placeholder="E.g., HC Verma, Errorless..." 
            className="flex-1 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-2 outline-none text-sm focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark"
          />
          <button onClick={handleAddSet} className="bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-2 rounded-lg hover:opacity-90">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {booksSets.map((bs, index) => (
            <div 
              key={bs.id} 
              className={`flex justify-between items-center p-3 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark transition-opacity ${draggedIndex === index ? 'opacity-50' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                setDraggedIndex(index);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  reorderBookSets(draggedIndex, index);
                }
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab opacity-50 hover:opacity-100" onClick={e => e.stopPropagation()}>
                  <GripVertical className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                </div>
                <span>{bs.name}</span>
              </div>
              <button onClick={() => deleteBookSet(bs.id)} className="text-geist-error-light dark:text-geist-error-dark hover:opacity-70 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {booksSets.length === 0 && <div className="text-sm text-geist-text-secondary-light text-center py-4">No books/sets defined.</div>}
        </div>
      </div>
    </div>
  );
};
