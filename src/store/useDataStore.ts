import { create } from 'zustand';

interface DataState {
  datasetName: string | null;
  sheets: Record<string, any[]>;
  activeSheetName: string | null;
  columns: string[];
  stats: any | null;
  isLoading: boolean;
  error: string | null;
  
  // Visualization settings
  chartType: 'bar' | 'line' | 'area' | 'pie';
  xAxis: string;
  yAxis: string;
  
  // SQL settings
  sqlQuery: string;
  
  setDataset: (name: string, data: Record<string, any[]>) => void;
  setActiveSheet: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setVizSettings: (settings: Partial<{ chartType: 'bar' | 'line' | 'area' | 'pie', xAxis: string, yAxis: string }>) => void;
  setSqlQuery: (query: string) => void;
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
  
  chartType: 'bar',
  xAxis: '',
  yAxis: '',
  sqlQuery: '',

  setDataset: (name, sheets) => {
    const sheetNames = Object.keys(sheets);
    const firstSheet = sheetNames[0];
    const columns = firstSheet ? Object.keys(sheets[firstSheet][0] || {}) : [];
    
    set({
      datasetName: name,
      sheets,
      activeSheetName: firstSheet,
      columns,
      stats: null,
      error: null,
      xAxis: columns[0] || '',
      yAxis: columns[1] || ''
    });
  },

  setActiveSheet: (name) => {
    set((state) => {
      const columns = state.sheets[name] ? Object.keys(state.sheets[name][0] || {}) : [];
      return { 
        activeSheetName: name, 
        columns,
        xAxis: columns[0] || '',
        yAxis: columns[1] || ''
      };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setVizSettings: (settings) => set((state) => ({ ...state, ...settings })),
  setSqlQuery: (query) => set({ sqlQuery: query }),
  reset: () => set({ 
    datasetName: null, 
    sheets: {}, 
    activeSheetName: null, 
    columns: [], 
    stats: null, 
    error: null,
    chartType: 'bar',
    xAxis: '',
    yAxis: '',
    sqlQuery: ''
  })
}));
