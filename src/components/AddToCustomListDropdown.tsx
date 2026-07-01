import React, { useState, useRef, useEffect } from 'react';
import { List, Search, Plus, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface AddToCustomListDropdownProps {
  questionId: string;
}

export const AddToCustomListDropdown: React.FC<AddToCustomListDropdownProps> = ({ questionId }) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [addedLists, setAddedLists] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchAddedState();
    }
  }, [user, questionId]);

  useEffect(() => {
    if (isOpen && user) {
      fetchLists();
    }
  }, [isOpen, user, questionId]);

  const fetchLists = async () => {
    if (!user) return;
    const { data } = await supabase.from('custom_lists').select('*').eq('user_id', user.id);
    if (data) setLists(data);
  };

  const fetchAddedState = async () => {
    if (!user) return;
    const { data } = await supabase.from('custom_list_items').select('list_id').eq('question_id', questionId);
    if (data) {
      setAddedLists(new Set(data.map(d => d.list_id)));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleList = async (listId: string) => {
    if (!user) return;
    try {
      if (addedLists.has(listId)) {
        await supabase.from('custom_list_items').delete().eq('list_id', listId).eq('question_id', questionId);
        setAddedLists(prev => {
          const newSet = new Set(prev);
          newSet.delete(listId);
          return newSet;
        });
      } else {
        await supabase.from('custom_list_items').insert({ list_id: listId, question_id: questionId });
        setAddedLists(prev => {
          const newSet = new Set(prev);
          newSet.add(listId);
          return newSet;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateList = async () => {
    if (!user || !searchTerm.trim()) return;
    try {
      const { data } = await supabase.from('custom_lists').insert({ user_id: user.id, name: searchTerm.trim() }).select('id');
      if (data && data.length > 0) {
        const newListId = data[0].id;
        await supabase.from('custom_list_items').insert({ list_id: newListId, question_id: questionId });
        fetchLists();
        setAddedLists(prev => {
          const newSet = new Set(prev);
          newSet.add(newListId);
          return newSet;
        });
        setSearchTerm('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-full transition-colors ${addedLists.size > 0 ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-geist-text-secondary-light hover:bg-geist-surface-light dark:text-geist-text-secondary-dark dark:hover:bg-geist-surface-dark'}`}
        title="Add to Custom List"
      >
        <List className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-geist-bg-light dark:bg-geist-bg-dark shadow-lg border border-geist-border-light dark:border-geist-border-dark focus:outline-none z-50">
          <div className="p-2 border-b border-geist-border-light dark:border-geist-border-dark flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-geist-text-secondary-light" />
            <input 
              type="text"
              placeholder="Search or create list"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none w-full text-geist-text-primary-light dark:text-geist-text-primary-dark placeholder-geist-text-secondary-light"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredLists.length > 0 ? (
              filteredLists.map(list => {
                const isAdded = addedLists.has(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => handleToggleList(list.id)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark"
                  >
                    <span className="truncate pr-2 text-geist-text-primary-light dark:text-geist-text-primary-dark">{list.name}</span>
                    {isAdded && <Check className="w-3 h-3 text-geist-success shrink-0" />}
                  </button>
                );
              })
            ) : (
              searchTerm.trim() ? (
                <button
                  onClick={handleCreateList}
                  className="w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center gap-2 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-blue-500"
                >
                  <Plus className="w-3.5 h-3.5" /> Create "{searchTerm}"
                </button>
              ) : (
                <div className="px-2 py-2 text-xs text-geist-text-secondary-light">No lists found.</div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
