import { create } from 'zustand';

interface DataState {
  datasetName: string | null;
  sheets: Record<string, any[]>;
  activeSheetName: string | null;
  columns: string[];
  stats: any | null;
  isLoading: boolean;
  error: string | null;
  
  setDataset: (name: string, data: Record<string, any[]>) => void;
  setActiveSheet: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  datasetName: null,
  sheets: {},
  activeSheetName: null,
  columns: [],
  stats: null,
  isLoading: false,
  error: null,

  setDataset: (name, sheets) => {
    const sheetNames = Object.keys(sheets);
    const firstSheet = sheetNames[0];
    const columns = firstSheet ? Object.keys(sheets[firstSheet][0] || {}) : [];
    
    set({
      datasetName: name,
      sheets,
      activeSheetName: firstSheet,
      columns,
      stats: null, // Stats will be computed separately
      error: null
    });
  },

  setActiveSheet: (name) => {
    set((state) => {
      const columns = state.sheets[name] ? Object.keys(state.sheets[name][0] || {}) : [];
      return { activeSheetName: name, columns };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ datasetName: null, sheets: {}, activeSheetName: null, columns: [], stats: null, error: null })
}));
