import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { parse, isValid, format } from 'date-fns';
import { 
  Undo, FileSpreadsheet, AlertTriangle, Download, Search, 
  Trash2, CheckCircle, ArrowUpDown, ChevronLeft, ChevronRight, Scissors, RefreshCw, Eraser, X, Calendar, FileWarning, Bell, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';

// --- Types ---
type DataRow = Record<string, any>;
type ColumnType = 'Numeric' | 'Date' | 'Text' | 'Mixed' | 'Empty';

interface HistoryState {
  data: DataRow[];
  timestamp: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- Helpers ---
const DataUtils = {
  // Parsing Logic: Tries multiple formats to understand the date
  parseDate: (value: string): Date | null => {
    if (!value) return null;
    const cleanVal = String(value).trim();
    if (!isNaN(Number(cleanVal))) return null; // Reject pure numbers

    const formatsToTry = [
      'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 
      'dd-MM-yyyy', 'dd.MM.yyyy', 'yyyy/MM/dd', 'MMM dd, yyyy'
    ];

    for (const fmt of formatsToTry) {
      const parsed = parse(cleanVal, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        return parsed;
      }
    }
    return null;
  },

  inferType: (data: DataRow[], col: string): ColumnType => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== "" && v !== undefined);
    if (values.length === 0) return 'Empty';
    
    const numCount = values.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length;
    const dateCount = values.filter(v => DataUtils.parseDate(v) !== null).length;

    const total = values.length;
    if (numCount === total) return 'Numeric';
    if (dateCount === total) return 'Date';
    if (numCount > total * 0.9) return 'Mixed'; 
    if (dateCount > total * 0.8) return 'Mixed'; 
    return 'Text';
  },
  
  getHistogram: (data: DataRow[], col: string) => {
    const values = data.map(r => Number(r[col])).filter(n => !isNaN(n));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const step = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * step).toFixed(1)}`,
      count: 0
    }));
    values.forEach(v => {
      const index = Math.min(Math.floor((v - min) / step), binCount - 1);
      if (bins[index]) bins[index].count++;
    });
    return bins;
  },
  
  getFrequency: (data: DataRow[], col: string) => {
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const val = String(row[col] || '(Empty)');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([range, count]) => ({ range, count }));
  }
};

export default function DataProfilerApp() {
  // --- Core State ---
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'validator' | 'profiler'>('editor');
  
  // --- UI State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // --- Modals ---
  const [showDateModal, setShowDateModal] = useState(false);
  const [detectedDateCols, setDetectedDateCols] = useState<string[]>([]);
  const [selectedDateCols, setSelectedDateCols] = useState<Set<string>>(new Set());
  const [targetDateFormat, setTargetDateFormat] = useState('yyyy-MM-dd');

  // NEW: Dedupe Modal
  const [showDedupeModal, setShowDedupeModal] = useState(false);
  const [dedupeCount, setDedupeCount] = useState(0);

  // --- Tools Config ---
  const [findReplace, setFindReplace] = useState({ find: '', replace: '', col: 'All Columns' });
  const [splitConfig, setSplitConfig] = useState({ col: '', delim: ' ', name1: 'First Name', name2: 'Last Name' });
  const [dedupeCol, setDedupeCol] = useState('All Columns');
  const [validationConfig, setValidationConfig] = useState({ checkId: false, idCol: '', checkEmail: false, emailCol: '' });

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('cp_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setData(parsed);
          setColumns(Object.keys(parsed[0]));
        }
      } catch (e) { localStorage.removeItem('cp_data'); }
    }
  }, []);

  useEffect(() => {
    if (data.length > 0) localStorage.setItem('cp_data', JSON.stringify(data));
  }, [data]);

  // --- Search Debounce ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- Helpers ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const pushHistory = (newData: DataRow[]) => {
    setHistory(prev => [...prev, { data: data, timestamp: Date.now() }].slice(-5));
    setData(newData);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setData(previous.data);
    setColumns(Object.keys(previous.data[0])); 
    setHistory(prev => prev.slice(0, -1));
    addToast("Undid last action", "info");
  };

  // --- File Actions ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        setColumns(results.meta.fields || []);
        setData(results.data as DataRow[]);
        setHistory([]);
        setCurrentPage(1);
        addToast(`Loaded ${results.data.length} rows`);
      }
    });
  };

  const handleDownload = (dataToExport: DataRow[], filename: string) => {
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // --- Handlers ---
  const handleTrim = () => {
    pushHistory(data);
    const newData = data.map(row => {
      const newRow = { ...row };
      Object.keys(newRow).forEach(k => {
        if (typeof newRow[k] === 'string') newRow[k] = newRow[k].trim();
      });
      return newRow;
    });
    setData(newData);
    addToast("Trimmed whitespace");
  };

  // NEW: Dedupe Logic (Step 1: Scan)
  const scanDedupe = () => {
    const unique = new Set();
    let dupeCounter = 0;
    
    data.forEach(row => {
      const key = dedupeCol === 'All Columns' ? JSON.stringify(row) : String(row[dedupeCol]);
      if (unique.has(key)) {
        dupeCounter++;
      } else {
        unique.add(key);
      }
    });

    if (dupeCounter === 0) {
      addToast("No duplicates found", "info");
      return;
    }
    
    setDedupeCount(dupeCounter);
    setShowDedupeModal(true);
  };

  // NEW: Dedupe Logic (Step 2: Execute)
  const applyDedupe = (strategy: 'first' | 'last') => {
    setShowDedupeModal(false);
    pushHistory(data);
    
    const seen = new Set();
    const newData: DataRow[] = [];
    
    // Strategy: 'first' = keep first found, ignore subsequent
    // Strategy: 'last' = we reverse iterate, keep first found (which is the last), then reverse back
    
    const sourceData = strategy === 'first' ? data : [...data].reverse();
    
    sourceData.forEach(row => {
      const key = dedupeCol === 'All Columns' ? JSON.stringify(row) : String(row[dedupeCol]);
      if (!seen.has(key)) {
        seen.add(key);
        newData.push(row);
      }
    });

    if (strategy === 'last') newData.reverse();
    
    setData(newData);
    addToast(`Removed ${data.length - newData.length} duplicates`);
  };

  const handleRemoveEmpty = () => {
    pushHistory(data);
    const initialLen = data.length;
    const newData = data.filter(row => Object.values(row).some(v => v !== "" && v !== null && v !== undefined));
    setData(newData);
    addToast(`Removed ${initialLen - newData.length} empty rows`);
  };

  // --- Date Logic ---
  const scanForDates = () => {
    const potentials = columns.filter(col => {
      const type = DataUtils.inferType(data, col);
      return type === 'Date' || type === 'Mixed';
    });
    if (potentials.length === 0) {
      addToast("No likely date columns detected", "info");
      return;
    }
    setDetectedDateCols(potentials);
    setSelectedDateCols(new Set(potentials));
    setShowDateModal(true);
  };

  const applyDateFix = () => {
    setShowDateModal(false);
    pushHistory(data);
    let count = 0;
    const newData = data.map(row => {
      const newRow = { ...row };
      Array.from(selectedDateCols).forEach(col => {
        const val = newRow[col];
        const dateObj = DataUtils.parseDate(val);
        if (dateObj) {
          newRow[col] = format(dateObj, targetDateFormat);
          count++;
        }
      });
      return newRow;
    });
    setData(newData);
    addToast(`Standardized ${count} dates`);
  };

  const handleSplit = () => {
    if (!splitConfig.col || !splitConfig.delim) return;
    pushHistory(data);
    const newData = data.map(row => {
      const val = String(row[splitConfig.col] || "");
      const parts = val.split(splitConfig.delim);
      return {
        ...row,
        [splitConfig.name1]: parts[0] || "",
        [splitConfig.name2]: parts.slice(1).join(splitConfig.delim) || "" 
      };
    });
    setData(newData);
    setColumns(Object.keys(newData[0]));
    addToast(`Split column '${splitConfig.col}'`);
  };

  const handleFindReplace = () => {
    if (!findReplace.find) return;
    pushHistory(data);
    let count = 0;
    const newData = data.map(row => {
      const newRow = { ...row };
      if (findReplace.col === 'All Columns') {
        Object.keys(newRow).forEach(k => {
          if (String(newRow[k]) === findReplace.find) { newRow[k] = findReplace.replace; count++; }
        });
      } else {
        if (String(newRow[findReplace.col]) === findReplace.find) { 
          newRow[findReplace.col] = findReplace.replace; 
          count++; 
        }
      }
      return newRow;
    });
    setData(newData);
    addToast(`Replaced ${count} occurrences`);
  };

  // --- Editor & View ---
  const handleCellEdit = (rowObj: DataRow, col: string, value: string) => {
    const actualIndex = data.indexOf(rowObj);
    if (actualIndex === -1) return;
    const newData = [...data];
    newData[actualIndex] = { ...newData[actualIndex], [col]: value };
    setData(newData);
  };

  const processedData = useMemo(() => {
    let processed = [...data];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      processed = processed.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lower)));
    }
    if (sortConfig) {
      processed.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return processed;
  }, [data, sortConfig, debouncedSearch]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);

  const validationResults = useMemo(() => {
    const errors: any[] = [];
    const seenIds = new Set();
    data.forEach((row, index) => {
      if (validationConfig.checkId && validationConfig.idCol) {
        const id = row[validationConfig.idCol];
        if (seenIds.has(id)) errors.push({ row: index + 1, reason: `Duplicate ID: ${id}`, data: row });
        seenIds.add(id);
      }
      if (validationConfig.checkEmail && validationConfig.emailCol) {
        const email = row[validationConfig.emailCol];
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: index + 1, reason: `Invalid Email: ${email}`, data: row });
        }
      }
    });
    return errors;
  }, [data, validationConfig]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative pb-20">
      
      {/* --- TOASTS --- */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100]">
        {toasts.map(t => (
          <div key={t.id} className={`shadow-lg rounded-lg px-4 py-3 text-sm font-medium animate-in slide-in-from-right flex items-center gap-2 ${
            t.type === 'success' ? 'bg-emerald-600 text-white' : 
            t.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
          }`}>
            {t.type === 'success' ? <CheckCircle size={16}/> : t.type === 'error' ? <AlertTriangle size={16}/> : <Bell size={16}/>}
            {t.message}
          </div>
        ))}
      </div>

      {/* --- DATE MODAL --- */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar className="text-indigo-600"/> Date Formatting</h3>
              <button onClick={() => setShowDateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">TARGET FORMAT</label>
              <select className="w-full border border-slate-300 rounded p-2 text-sm bg-white" value={targetDateFormat} onChange={(e) => setTargetDateFormat(e.target.value)}>
                <option value="yyyy-MM-dd">ISO 8601 (2023-12-31)</option>
                <option value="MM/dd/yyyy">US (12/31/2023)</option>
                <option value="dd/MM/yyyy">European (31/12/2023)</option>
                <option value="dd-MM-yyyy">Hyphenated (31-12-2023)</option>
                <option value="MMM dd, yyyy">Verbose (Dec 31, 2023)</option>
              </select>
            </div>
            <div className="mb-4">
               <label className="text-xs font-semibold text-slate-500 mb-1 block">SELECT COLUMNS</label>
               <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {detectedDateCols.map(col => (
                  <label key={col} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" checked={selectedDateCols.has(col)} onChange={e => {
                        const next = new Set(selectedDateCols);
                        if (e.target.checked) next.add(col); else next.delete(col);
                        setSelectedDateCols(next);
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700">{col}</span>
                    <span className="text-xs text-slate-400 ml-auto truncate max-w-[100px]">{data[0]?.[col] || 'N/A'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDateModal(false)} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={applyDateFix} className="flex-1 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">Apply Format</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DEDUPE MODAL --- */}
      {showDedupeModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Layers className="text-indigo-600"/> Resolve Duplicates</h3>
              <button onClick={() => setShowDedupeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <p className="text-slate-600 mb-6 text-sm">
              Found <strong className="text-indigo-600">{dedupeCount}</strong> records that share the same <strong>{dedupeCol}</strong>. How would you like to handle them?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => applyDedupe('first')} className="w-full py-3 px-4 bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 rounded-lg text-left transition flex justify-between items-center group shadow-sm">
                <div>
                  <span className="block font-semibold text-sm">Keep First Record</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-400">Usually the oldest entry</span>
                </div>
                <CheckCircle size={18} className="text-slate-200 group-hover:text-indigo-600"/>
              </button>
              <button onClick={() => applyDedupe('last')} className="w-full py-3 px-4 bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 rounded-lg text-left transition flex justify-between items-center group shadow-sm">
                <div>
                  <span className="block font-semibold text-sm">Keep Last Record</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-400">Usually the newest entry</span>
                </div>
                <CheckCircle size={18} className="text-slate-200 group-hover:text-indigo-600"/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white"><FileSpreadsheet size={24}/></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">ClonePartner Profiler</h1>
            <p className="text-xs text-slate-500 font-medium">Enterprise Edition • {data.length.toLocaleString()} Rows</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.length > 0 && (
            <button onClick={() => {if(confirm('Clear all data?')) { localStorage.removeItem('cp_data'); setData([]); }}} className="text-slate-400 hover:text-red-600 px-3 py-2 text-sm font-medium transition flex items-center gap-2">
              <Trash2 size={16}/> Clear
            </button>
          )}
          <input type="file" onChange={handleFileUpload} className="hidden" id="csv-upload" accept=".csv" />
          <label htmlFor="csv-upload" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg cursor-pointer transition font-medium text-sm shadow-sm flex items-center gap-2">
            <Download size={16} className="rotate-180"/> Upload CSV
          </label>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto p-6">
        {data.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-300">
            <div className="bg-slate-50 p-6 rounded-full mb-6"><FileSpreadsheet className="w-12 h-12 text-slate-400" /></div>
            <h3 className="text-xl font-semibold text-slate-700">No Data Loaded</h3>
            <p className="text-slate-500 mt-2 mb-6 max-w-md">Upload a CSV file to begin. Data is processed locally and auto-saved.</p>
            <label htmlFor="csv-upload" className="text-indigo-600 font-medium hover:underline cursor-pointer">Browse Files</label>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 items-start">
            
            {/* --- SIDEBAR --- */}
            <aside className="col-span-12 lg:col-span-3 space-y-6">
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-700 text-sm">History</span>
                <button onClick={undo} disabled={history.length === 0} className="text-xs flex items-center gap-1.5 text-indigo-600 font-medium disabled:opacity-50 hover:underline">
                  <Undo size={14}/> Undo ({history.length})
                </button>
              </div>

              {/* Tools Group */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <RefreshCw size={16}/> Hygiene
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={handleTrim} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition flex items-center justify-between group">
                    Trim Whitespace <Scissors size={14} className="opacity-0 group-hover:opacity-100"/>
                  </button>
                  <button onClick={handleRemoveEmpty} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition flex items-center justify-between group">
                    Remove Empty Rows <Eraser size={14} className="opacity-0 group-hover:opacity-100"/>
                  </button>
                  <button onClick={scanForDates} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition flex items-center justify-between group">
                    Auto-Fix Dates <Calendar size={14} className="opacity-0 group-hover:opacity-100"/>
                  </button>
                </div>
                
                <div className="p-3 border-t border-slate-100">
                  <label className="text-xs text-slate-400 font-semibold mb-1 block">REMOVE DUPLICATES</label>
                   <div className="flex gap-2">
                     <select className="w-full border border-slate-200 rounded text-xs p-1.5 bg-white" value={dedupeCol} onChange={e => setDedupeCol(e.target.value)}>
                        <option>All Columns</option>
                        {columns.map(c => <option key={c} value={c}>By {c}</option>)}
                     </select>
                     <button onClick={scanDedupe} className="bg-slate-800 text-white text-xs px-3 rounded hover:bg-slate-900">Run</button>
                   </div>
                </div>
              </div>

              {/* Transform Group */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <Scissors size={16}/> Transform
                </div>
                <div className="p-4 space-y-4">
                  {/* Split */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold">SPLIT COLUMN</label>
                    <div className="flex gap-2">
                      <select className="w-2/3 border border-slate-300 rounded text-xs p-1.5" onChange={e => setSplitConfig({...splitConfig, col: e.target.value})} value={splitConfig.col}>
                        <option value="">Select...</option>
                        {columns.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input className="w-1/3 border border-slate-300 rounded text-xs p-1.5" placeholder="Delim" value={splitConfig.delim} onChange={e => setSplitConfig({...splitConfig, delim: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <input className="border border-slate-300 rounded text-xs p-1.5" placeholder="Name 1" value={splitConfig.name1} onChange={e => setSplitConfig({...splitConfig, name1: e.target.value})}/>
                       <input className="border border-slate-300 rounded text-xs p-1.5" placeholder="Name 2" value={splitConfig.name2} onChange={e => setSplitConfig({...splitConfig, name2: e.target.value})}/>
                    </div>
                    <button onClick={handleSplit} disabled={!splitConfig.col} className="w-full bg-slate-100 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-200 transition disabled:opacity-50">Apply Split</button>
                  </div>

                  <hr className="border-slate-100"/>

                  {/* Replace */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold">FIND & REPLACE</label>
                    <div className="grid grid-cols-2 gap-2">
                       <input className="border border-slate-300 rounded text-xs p-1.5" placeholder="Find" value={findReplace.find} onChange={e => setFindReplace({...findReplace, find: e.target.value})}/>
                       <input className="border border-slate-300 rounded text-xs p-1.5" placeholder="Replace" value={findReplace.replace} onChange={e => setFindReplace({...findReplace, replace: e.target.value})}/>
                    </div>
                     <select className="w-full border border-slate-300 rounded text-xs p-1.5" value={findReplace.col} onChange={e => setFindReplace({...findReplace, col: e.target.value})}>
                      <option>All Columns</option>
                      {columns.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button onClick={handleFindReplace} className="w-full bg-slate-100 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-200 transition">Apply Replace</button>
                  </div>
                </div>
              </div>

              <button onClick={() => handleDownload(data, 'clean_data.csv')} className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-medium shadow-md flex items-center justify-center gap-2">
                <Download size={18}/> Export Clean Data
              </button>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="col-span-12 lg:col-span-9">
              <div className="flex items-center gap-8 border-b border-slate-200 mb-6 px-2">
                {['editor', 'validator', 'profiler'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-3 capitalize font-semibold text-sm transition border-b-2 ${activeTab === tab ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* EDITOR TAB */}
              {activeTab === 'editor' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[700px]">
                  <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64 shadow-sm"
                        value={searchTerm}
                        onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded disabled:opacity-30"><ChevronLeft size={16}/></button>
                        <span>{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded disabled:opacity-30"><ChevronRight size={16}/></button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-auto flex-1 relative">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm ring-1 ring-slate-200">
                        <tr>
                          <th className="px-3 py-3 font-semibold border-b border-slate-200 w-12 text-center bg-slate-50">#</th>
                          {columns.map(col => (
                            <th key={col} className="px-4 py-3 font-semibold border-b border-r border-slate-200 min-w-[150px] bg-slate-50 group cursor-pointer hover:bg-slate-100 transition" onClick={() => {
                                let direction: 'asc' | 'desc' = 'asc';
                                if (sortConfig?.key === col && sortConfig.direction === 'asc') direction = 'desc';
                                setSortConfig({ key: col, direction });
                            }}>
                              <div className="flex items-center justify-between">
                                {col}
                                <ArrowUpDown size={12} className={`text-slate-300 ${sortConfig?.key === col ? 'text-indigo-600' : 'group-hover:text-slate-400'}`} />
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((row, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50 transition">
                            <td className="px-2 py-2 text-center text-slate-400 text-xs bg-slate-50/30 font-mono">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>
                            {columns.map(col => (
                              <td key={`${idx}-${col}`} className="p-0 border-r border-slate-100 last:border-0 relative">
                                <input 
                                  className="w-full h-full px-4 py-2.5 bg-transparent outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-slate-700 truncate font-medium text-[13px]"
                                  value={row[col] || ''}
                                  onChange={(e) => handleCellEdit(row, col, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VALIDATOR TAB */}
              {activeTab === 'validator' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold mb-4 text-slate-800 flex items-center gap-2"><CheckCircle size={18} className="text-indigo-600"/> Validation Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={validationConfig.checkId} onChange={e => setValidationConfig({...validationConfig, checkId: e.target.checked})}/> 
                          <span className="font-medium text-slate-700">Check Unique ID</span>
                        </label>
                        <select className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white" disabled={!validationConfig.checkId} onChange={e => setValidationConfig({...validationConfig, idCol: e.target.value})} value={validationConfig.idCol}>
                          <option value="">Select Column...</option>
                          {columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={validationConfig.checkEmail} onChange={e => setValidationConfig({...validationConfig, checkEmail: e.target.checked})}/> 
                          <span className="font-medium text-slate-700">Check Email Format</span>
                        </label>
                        <select className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white" disabled={!validationConfig.checkEmail} onChange={e => setValidationConfig({...validationConfig, emailCol: e.target.value})} value={validationConfig.emailCol}>
                          <option value="">Select Column...</option>
                          {columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {validationResults.length > 0 ? (
                    <div className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-rose-800 font-semibold"><AlertTriangle size={18} /> Found {validationResults.length} Issues</div>
                        <button 
                          onClick={() => handleDownload(validationResults.map(r => r.data), 'invalid_rows.csv')}
                          className="text-xs bg-white text-rose-700 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-50 font-medium flex items-center gap-2"
                        >
                           <FileWarning size={14}/> Download Invalid Rows
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-rose-100">
                        {validationResults.map((err, i) => (
                          <div key={i} className="flex gap-4 px-6 py-3 hover:bg-rose-50/50 transition">
                            <span className="text-rose-900 font-mono text-xs bg-rose-100 px-2 py-1 rounded self-start">Row {err.row}</span>
                            <span className="text-sm text-rose-700">{err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-emerald-700 bg-white p-8 rounded-xl border border-emerald-100 shadow-sm justify-center">
                      <div className="p-2 bg-emerald-100 rounded-full"><CheckCircle size={24} /></div>
                      <span className="font-medium text-lg">Data is clean. No errors found.</span>
                    </div>
                  )}
                </div>
              )}

              {/* PROFILER TAB */}
              {activeTab === 'profiler' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {columns.map(col => {
                    const type = DataUtils.inferType(data, col);
                    const isNumeric = type === 'Numeric';
                    const chartData = isNumeric ? DataUtils.getHistogram(data, col) : DataUtils.getFrequency(data, col);
                    return (
                      <div key={col} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-6">
                          <div><h4 className="font-bold text-slate-800 truncate max-w-[200px]" title={col}>{col}</h4><p className="text-xs text-slate-400 mt-1">{isNumeric ? 'Distribution' : 'Frequency'}</p></div>
                          <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${type === 'Numeric' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : type === 'Date' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>{type}</span>
                        </div>
                        <div className="h-48 w-full">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis dataKey="range" tick={{fontSize: 10, fill: '#94a3b8'}} interval={0} angle={-45} textAnchor="end" height={40}/>
                                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                                <Bar dataKey="count" fill={isNumeric ? "#6366f1" : "#94a3b8"} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 rounded-lg">No data available</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
