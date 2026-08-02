import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Wallet, 
  TrendingUp, 
  Car, 
  Globe2, 
  ArrowRight, 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign, 
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Download,
  Printer,
  Sparkles,
  PlusCircle,
  MinusCircle,
  Save
} from 'lucide-react';

interface BusinessModuleProps {
  initialTab?: 'ledger' | 'ledger_archive' | 'ledger_report' | 'fruit' | 'fruit_archive' | 'transport' | 'transport_archive' | 'mission' | 'mission_archive';
}

type TabType = 'ledger' | 'ledger_archive' | 'ledger_report' | 'fruit' | 'fruit_archive' | 'transport' | 'transport_archive' | 'mission' | 'mission_archive';

interface MonthlyRecord {
  reportDate: string;
  draftUser: string;
  expenseDate: string;
  meetingDate: string;
  countries: Array<{ name: string; amount: number }>;
}

export const BusinessModule: React.FC<BusinessModuleProps> = ({ initialTab = 'ledger' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync tab state when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [store, setStore] = useState<Record<string, MonthlyRecord>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<Array<{ country: string; months: Record<number, number | ''> }>>([]);
  const [allChurches, setAllChurches] = useState<Array<{ name: string }>>([]);
  const [isAddChurchModalOpen, setIsAddChurchModalOpen] = useState(false);
  const [selectedChurchToAdd, setSelectedChurchToAdd] = useState("");

  // Target Year and Month to edit in Report Writer
  const [reportYear, setReportYear] = useState('2026');
  const [reportMonth, setReportMonth] = useState('7');

  // Report Writer states
  const [reportDate, setReportDate] = useState('신 43(2026)년 7월 5일');
  const [draftUser, setDraftUser] = useState('이수한');
  const [expenseDate, setExpenseDate] = useState('7월 6일');
  const [meetingDate, setMeetingDate] = useState('신 43(2026)년 7월 3일(금) 10:00 ~ 11:00');
  const [numCountries, setNumCountries] = useState(5);
  const [selectedCountries, setSelectedCountries] = useState<Array<{ name: string; amount: number }>>([
    { name: '튀르키예교회', amount: 1900000 },
    { name: '파키스탄교회', amount: 2880000 },
    { name: '인도첸나이교회', amount: 1000000 },
    { name: '콩고민주공화국킨샤사교회', amount: 3000000 },
    { name: '인도네시아마카사르지역', amount: 1000000 }
  ]);
  
  // Preview active tab (proposal vs minutes)
  const [previewTab, setPreviewTab] = useState<'proposal' | 'minutes'>('proposal');

  // File Archive states & handlers
  interface ArchiveFile {
    name: string;
    type: string;
    size: number;
    data: string; // Base64
  }

  const [archiveYear, setArchiveYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return Math.max(2026, currentYear).toString();
  });

  const [archiveFiles, setArchiveFiles] = useState<Record<string, ArchiveFile>>({});

  // Sync archiveFiles state when archiveYear or activeTab changes by fetching from the backend
  const fetchArchiveFiles = async () => {
    if (!['ledger_archive', 'fruit_archive', 'transport_archive', 'mission_archive'].includes(activeTab)) {
      return;
    }
    const category = activeTab.replace('_archive', '');
    try {
      const response = await api.get('/business/archive/list', {
        params: { category, year: archiveYear }
      });
      
      const data = response.data;
      const formattedFiles: Record<string, any> = {};
      
      Object.keys(data).forEach(monthKey => {
        const monthData = data[monthKey];
        if (monthData.proposal) {
          formattedFiles[`${monthKey}_proposal`] = monthData.proposal;
        }
        if (monthData.minutes) {
          formattedFiles[`${monthKey}_minutes`] = monthData.minutes;
        }
        if (monthData.etc && monthData.etc.length > 0) {
          formattedFiles[`${monthKey}_etc`] = monthData.etc;
        }
      });
      
      setArchiveFiles(formattedFiles);
    } catch (err) {
      console.error("Failed to fetch archive files from server:", err);
      setArchiveFiles({});
    }
  };

  useEffect(() => {
    fetchArchiveFiles();
  }, [archiveYear, activeTab]);

  const [previewModalFile, setPreviewModalFile] = useState<{
    month: number;
    docType: 'proposal' | 'minutes' | 'etc';
    file: ArchiveFile;
  } | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Helper to load external scripts dynamically
  const loadScript = (id: string, src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });
  };

  // Helper to convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64.split(',')[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  useEffect(() => {
    if (!previewModalFile) return;

    const { month, docType, file } = previewModalFile;
    const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isXlsx = file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!isDocx && !isXlsx) {
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    const loadLibraryAndRender = async () => {
      try {
        const container = document.getElementById('preview-doc-container');
        if (!container) return;
        container.innerHTML = ''; // clear previous content

        const category = activeTab.replace('_archive', '');
        const downloadUrl = `/api/v1/business/archive/download?category=${category}&year=${archiveYear}&month=${month}&docType=${docType}&fileName=${encodeURIComponent(file.name)}`;
        
        const token = localStorage.getItem('accessToken');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(downloadUrl, { headers });
        if (!response.ok) {
          throw new Error('서버로부터 파일을 가져오는데 실패했습니다.');
        }
        const arrayBuffer = await response.arrayBuffer();

        if (isDocx) {
          // Load JSZip and docx-preview dynamically if they aren't loaded yet
          await loadScript('jszip-cdn-script', 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
          await loadScript('docx-preview-script', 'https://cdn.jsdelivr.net/npm/docx-preview@0.1.18/dist/docx-preview.min.js');

          if (typeof (window as any).docx === 'undefined' || typeof (window as any).docx.renderAsync !== 'function') {
            throw new Error('docx-preview library load failed');
          }

          await (window as any).docx.renderAsync(arrayBuffer, container, undefined, {
            className: "docx-rendered",
            inWrapper: false
          });
        } else if (isXlsx) {
          // Load SheetJS dynamically if not loaded yet
          await loadScript('xlsx-cdn-script', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

          if (typeof (window as any).XLSX === 'undefined') {
            throw new Error('SheetJS library load failed');
          }

          const XLSX = (window as any).XLSX;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert sheet to HTML
          const html = XLSX.utils.sheet_to_html(worksheet, {
            header: '',
            footer: ''
          });

          // Render it styled
          container.innerHTML = `
            <div style="overflow: auto; width: 100%; height: 100%; background: #ffffff; padding: 15px; border-radius: 8px;">
              <style>
                #preview-doc-container table { border-collapse: collapse; width: 100%; font-size: 12px; }
                #preview-doc-container th, #preview-doc-container td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                #preview-doc-container tr:nth-child(even) { background-color: #f8fafc; }
              </style>
              ${html}
            </div>
          `;
        }

        setPreviewLoading(false);
      } catch (err: any) {
        console.error("Preview rendering error:", err);
        setPreviewError("문서 미리보기 생성 도중 오류가 발생했습니다. 파일을 다운로드하여 확인해 주세요.");
        setPreviewLoading(false);
      }
    };

    // Small delay to ensure container is rendered in DOM
    const timer = setTimeout(() => {
      loadLibraryAndRender();
    }, 100);

    return () => clearTimeout(timer);
  }, [previewModalFile]);

  const handleFileUpload = async (month: number, docType: 'proposal' | 'minutes' | 'etc', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("용량이 너무 큽니다. 20MB 이하의 파일만 업로드할 수 있습니다.");
      return;
    }

    const category = activeTab.replace('_archive', '');
    const formData = new FormData();
    formData.append('category', category);
    formData.append('year', archiveYear);
    formData.append('month', month.toString());
    formData.append('docType', docType);
    formData.append('file', file);

    try {
      await api.post('/business/archive/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchArchiveFiles();
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert("파일 업로드에 실패했습니다. " + (err.response?.data?.error || ""));
    }
  };

  const handleFileDelete = async (month: number, docType: 'proposal' | 'minutes' | 'etc', e: React.MouseEvent, index?: number) => {
    e.stopPropagation(); // Prevent trigger preview onClick
    
    const key = `${month}_${docType}`;
    const fileObj = archiveFiles[key];
    let fileName = "";
    
    if (docType === 'etc' && index !== undefined && Array.isArray(fileObj)) {
      fileName = fileObj[index]?.name;
    } else if (fileObj && !Array.isArray(fileObj)) {
      fileName = fileObj.name;
    }

    if (!fileName) return;

    if (!window.confirm(`[${fileName}] 파일을 삭제하시겠습니까?`)) return;

    const category = activeTab.replace('_archive', '');

    try {
      await api.delete('/business/archive/delete', {
        params: {
          category,
          year: archiveYear,
          month,
          docType,
          fileName
        }
      });
      await fetchArchiveFiles();
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("파일 삭제에 실패했습니다. " + (err.response?.data?.error || ""));
    }
  };

  const handleFileDownload = (month: number, docType: 'proposal' | 'minutes' | 'etc', fileName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const category = activeTab.replace('_archive', '');
    const downloadUrl = `/api/v1/business/archive/download?category=${category}&year=${archiveYear}&month=${month}&docType=${docType}&fileName=${encodeURIComponent(fileName)}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Available Churches for Dropdown
  const availableChurches = [
    '튀르키예교회', '파키스탄교회', '인도첸나이교회', '콩고민주공화국킨샤사교회', 
    '인도네시아마카사르지역', '도쿄교회', '텍사스교회', '포르투갈리스본지역', '천안교회멕시코과달라하라지역',
    '청주교회브라질리우데자네이루지역', '인도첸나이교회인도네시아쿠팡지역'
  ];

  // Mock initial data setup for LocalStorage
  const defaultStoredData: Record<string, MonthlyRecord> = {
    '2026_7': {
      reportDate: '신 43(2026)년 7월 5일',
      draftUser: '이수한',
      expenseDate: '7월 6일',
      meetingDate: '신 43(2026)년 7월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '튀르키예교회', amount: 1900000 },
        { name: '파키스탄교회', amount: 2880000 },
        { name: '인도첸나이교회', amount: 1000000 },
        { name: '콩고민주공화국킨샤사교회', amount: 3000000 },
        { name: '인도네시아마카사르지역', amount: 1000000 }
      ]
    },
    '2026_1': {
      reportDate: '신 43(2026)년 1월 5일',
      draftUser: '이수한',
      expenseDate: '1월 6일',
      meetingDate: '신 43(2026)년 1월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '파키스탄교회', amount: 10000000 },
        { name: '포르투갈리스본지역', amount: 20000000 }
      ]
    },
    '2026_2': {
      reportDate: '신 43(2026)년 2월 5일',
      draftUser: '이수한',
      expenseDate: '2월 6일',
      meetingDate: '신 43(2026)년 2월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '파키스탄교회', amount: 20000000 },
        { name: '포르투갈리스본지역', amount: 8000000 }
      ]
    },
    '2026_3': {
      reportDate: '신 43(2026)년 3월 5일',
      draftUser: '이수한',
      expenseDate: '3월 6일',
      meetingDate: '신 43(2026)년 3월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '튀르키예교회', amount: 1900000 },
        { name: '인도첸나이교회', amount: 1000000 }
      ]
    },
    '2026_4': {
      reportDate: '신 43(2026)년 4월 5일',
      draftUser: '이수한',
      expenseDate: '4월 6일',
      meetingDate: '신 43(2026)년 4월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '콩고민주공화국킨샤사교회', amount: 3000000 }
      ]
    },
    '2025_11': {
      reportDate: '신 42(2025)년 11월 5일',
      draftUser: '이수한',
      expenseDate: '11월 6일',
      meetingDate: '신 42(2025)년 11월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '도쿄교회', amount: 5000000 }
      ]
    },
    '2025_12': {
      reportDate: '신 42(2025)년 12월 5일',
      draftUser: '이수한',
      expenseDate: '12월 6일',
      meetingDate: '신 42(2025)년 12월 3일(금) 10:00 ~ 11:00',
      countries: [
        { name: '텍사스교회', amount: 12000000 },
        { name: '튀르키예교회', amount: 1500000 }
      ]
    }
  };

  // Load from LocalStorage and fetch dynamic churches list
  useEffect(() => {
    const raw = localStorage.getItem('overseas_ledger_data');
    if (raw) {
      try {
        setStore(JSON.parse(raw));
      } catch (e) {
        localStorage.setItem('overseas_ledger_data', JSON.stringify(defaultStoredData));
        setStore(defaultStoredData);
      }
    } else {
      localStorage.setItem('overseas_ledger_data', JSON.stringify(defaultStoredData));
      setStore(defaultStoredData);
    }

    const fetchAllChurches = async () => {
      try {
        const res = await api.get('/diagnosis/churches');
        if (res.data) {
          setAllChurches(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch churches list:", e);
      }
    };
    fetchAllChurches();
  }, []);

  // Update form fields when reportYear or reportMonth changes (loading from store)
  useEffect(() => {
    const key = `${reportYear}_${reportMonth}`;
    const record = store[key];
    if (record) {
      setReportDate(record.reportDate || `신 43(${reportYear})년 ${reportMonth}월 5일`);
      setDraftUser(record.draftUser || '이수한');
      setExpenseDate(record.expenseDate || `${reportMonth}월 6일`);
      setMeetingDate(record.meetingDate || `신 43(${reportYear})년 ${reportMonth}월 3일(금) 10:00 ~ 11:00`);
      setNumCountries(record.countries?.length || 1);
      setSelectedCountries(record.countries || [{ name: '튀르키예교회', amount: 1000000 }]);
    } else {
      // Default blank values for unrecorded months
      setReportDate(`신 43(${reportYear})년 ${reportMonth}월 5일`);
      setDraftUser('이수한');
      setExpenseDate(`${reportMonth}월 6일`);
      setMeetingDate(`신 43(${reportYear})년 ${reportMonth}월 3일(금) 10:00 ~ 11:00`);
      setNumCountries(1);
      setSelectedCountries([{ name: '튀르키예교회', amount: 1000000 }]);
    }
  }, [reportYear, reportMonth, store]);

  // Adjust selected countries when numCountries changes
  useEffect(() => {
    const diff = numCountries - selectedCountries.length;
    if (diff > 0) {
      const added = Array.from({ length: diff }, (_, i) => ({
        name: availableChurches[(selectedCountries.length + i) % availableChurches.length],
        amount: 1000000
      }));
      setSelectedCountries([...selectedCountries, ...added]);
    } else if (diff < 0) {
      setSelectedCountries(selectedCountries.slice(0, numCountries));
    }
  }, [numCountries]);

  // Calculate sum
  const totalAmount = selectedCountries.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Convert number to Korean Won Text (e.g. 9780000 -> 구백칠십팔만원)
  const numberToKoreanText = (num: number): string => {
    if (num === 0) return '영';
    const units = ['', '만', '억', '조'];
    const numchars = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const tenUnits = ['', '십', '백', '천'];
    
    let result = '';
    let unitIdx = 0;
    
    while (num > 0) {
      let part = num % 10000;
      num = Math.floor(num / 10000);
      
      if (part > 0) {
        let partStr = '';
        let digitIdx = 0;
        
        while (part > 0) {
          const digit = part % 10;
          part = Math.floor(part / 10);
          
          if (digit > 0) {
            partStr = numchars[digit] + tenUnits[digitIdx] + partStr;
          }
          digitIdx++;
        }
        
        // Remove '일' from '일십', '일백', '일천' for clean Korean pronunciation
        partStr = partStr.replace(/^일(십|백|천)/, '$1');
        
        result = partStr + units[unitIdx] + result;
      }
      
      unitIdx++;
    }
    
    return result + '원정';
  };

  // Save data locally
  const handleSaveData = () => {
    const key = `${reportYear}_${reportMonth}`;
    const updatedStore = {
      ...store,
      [key]: {
        reportDate,
        draftUser,
        expenseDate,
        meetingDate,
        countries: selectedCountries
      }
    };
    localStorage.setItem('overseas_ledger_data', JSON.stringify(updatedStore));
    setStore(updatedStore);
    alert(`${reportYear}년 ${reportMonth}월 기안서 데이터가 성공적으로 저장되었습니다!\n원장헌금 집계 탭에 즉시 반영됩니다.`);
  };

  // Mock ledger data for 12 months matrix
  const [selectedYear, setSelectedYear] = useState('2026');

  // Generate Matrix using Store
  const getMatrixData = () => {
    const countryMap: Record<string, Record<number, number>> = {};
    
    Object.keys(store).forEach(key => {
      const [year, monthStr] = key.split('_');
      if (year === selectedYear) {
        const month = parseInt(monthStr);
        const record = store[key];
        record.countries.forEach(item => {
          if (!countryMap[item.name]) {
            countryMap[item.name] = {};
          }
          countryMap[item.name][month] = item.amount;
        });
      }
    });

    return Object.keys(countryMap).map(country => {
      const months: Record<number, number | null> = {};
      let hasValue = false;
      for (let m = 1; m <= 12; m++) {
        const val = countryMap[country][m];
        months[m] = val !== undefined ? val : null;
        if (val !== undefined) hasValue = true;
      }
      return { country, months, hasValue };
    }).filter(item => item.hasValue);
  };

  const matrixRows = getMatrixData();

  // Start edit mode helper
  const handleStartEdit = () => {
    const currentRows = getMatrixData();
    const defaultChurches = [
      '튀르키예교회', '파키스탄교회', '인도첸나이교회', '콩고민주공화국킨샤사교회', 
      '인도네시아마카사르지역', '도쿄교회', '텍사스교회', '포르투갈리스본지역'
    ];

    // Combine existing countries with default ones so they all show up in the edit form
    const editRows: Array<{ country: string; months: Record<number, number | ''> }> = [];
    
    // Add existing ones
    currentRows.forEach(row => {
      const months: Record<number, number | ''> = {};
      for (let m = 1; m <= 12; m++) {
        const val = row.months[m];
        months[m] = (val !== null && val !== undefined) ? val : '';
      }
      editRows.push({ country: row.country, months });
    });

    // Add default ones if they don't exist yet
    defaultChurches.forEach(church => {
      if (!editRows.some(row => row.country === church)) {
        const months: Record<number, number | ''> = {};
        for (let m = 1; m <= 12; m++) {
          months[m] = '';
        }
        editRows.push({ country: church, months });
      }
    });

    setEditData(editRows);
    setIsEditMode(true);
  };

  // Handle cell value change
  const handleCellChange = (countryName: string, month: number, valueStr: string) => {
    // Remove non-numeric characters
    const cleanValue = valueStr.replace(/[^0-9]/g, '');
    const numVal = cleanValue === '' ? '' : parseInt(cleanValue, 10);

    setEditData(prev => prev.map(row => {
      if (row.country === countryName) {
        return {
          ...row,
          months: {
            ...row.months,
            [month]: numVal
          }
        };
      }
      return row;
    }));
  };

  // Open add church modal
  const handleAddChurch = () => {
    setIsAddChurchModalOpen(true);
  };

  // Save changes
  const handleSaveEdit = () => {
    const updatedStore = { ...store };

    for (let m = 1; m <= 12; m++) {
      const monthlyCountries = editData
        .map(row => {
          const val = row.months[m];
          if (val !== undefined && val !== null && val !== '') {
            return { name: row.country, amount: val };
          }
          return null;
        })
        .filter(Boolean) as Array<{ name: string; amount: number }>;

      const key = `${selectedYear}_${m}`;

      if (monthlyCountries.length > 0) {
        updatedStore[key] = {
          ...updatedStore[key],
          countries: monthlyCountries,
          reportDate: updatedStore[key]?.reportDate || `신 43(${selectedYear})년 ${m}월 5일`,
          draftUser: updatedStore[key]?.draftUser || '이수한',
          expenseDate: updatedStore[key]?.expenseDate || `${m}월 6일`,
          meetingDate: updatedStore[key]?.meetingDate || `신 43(${selectedYear})년 ${m}월 3일(금) 10:00 ~ 11:00`
        };
      } else {
        // If all countries are cleared, we can delete the key
        delete updatedStore[key];
      }
    }

    setStore(updatedStore);
    localStorage.setItem('overseas_ledger_data', JSON.stringify(updatedStore));
    setIsEditMode(false);
    alert('원장헌금 실적이 성공적으로 저장되었습니다.');
  };

  // Load JSZip from CDN
  const loadJSZip = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).JSZip) {
        resolve((window as any).JSZip);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve((window as any).JSZip);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Custom helper to find closest ancestor node in XML DOM bypassing HTML querySelector limitations
  const findClosestAncestor = (node: Node | null, tagName: string): Element | null => {
    let current = node;
    while (current) {
      if (current.nodeType === 1 && (current as Element).nodeName === tagName) {
        return current as Element;
      }
      current = current.parentNode;
    }
    return null;
  };

  // XML modification helper for 1.품의서 (Pure DOM compliance, error-free)
  const modifyProposalXml = (doc: Document) => {
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const tNodes = Array.from(doc.getElementsByTagName("w:t"));

    // Helper to create w:r with styling
    const createRun = (text: string, bold = false) => {
      const r = doc.createElementNS(ns, "w:r");
      const rPr = doc.createElementNS(ns, "w:rPr");
      const rFonts = doc.createElementNS(ns, "w:rFonts");
      rFonts.setAttributeNS(ns, "w:ascii", "함초롬바탕");
      rFonts.setAttributeNS(ns, "w:eastAsia", "함초롬바탕");
      rFonts.setAttributeNS(ns, "w:hAnsi", "함초롬바탕");
      rPr.appendChild(rFonts);
      const sz = doc.createElementNS(ns, "w:sz");
      sz.setAttributeNS(ns, "w:val", "24");
      rPr.appendChild(sz);
      if (bold) {
        rPr.appendChild(doc.createElementNS(ns, "w:b"));
      }
      r.appendChild(rPr);
      const t = doc.createElementNS(ns, "w:t");
      t.textContent = text;
      r.appendChild(t);
      return r;
    };

    const createJc = (align: string) => {
      const jc = doc.createElementNS(ns, "w:jc");
      jc.setAttributeNS(ns, "w:val", align);
      return jc;
    };

    // 1. 기안일자
    const dateLabelNode = tNodes.find(n => n.textContent?.replace(/\s+/g, '') === "기안일자");
    if (dateLabelNode) {
      const tc = findClosestAncestor(dateLabelNode, "w:tc");
      const nextTc = tc?.nextElementSibling;
      if (nextTc) {
        const p = nextTc.querySelector("w:p");
        if (p) {
          const pPr = p.querySelector("w:pPr")?.cloneNode(true);
          p.innerHTML = '';
          if (pPr) p.appendChild(pPr);
          p.appendChild(createRun(reportDate));
        }
      }
    }

    // 2. 기안자(부장)
    const drafterLabelNode = tNodes.find(n => n.textContent?.includes("기안자") ?? false);
    if (drafterLabelNode) {
      const tc = findClosestAncestor(drafterLabelNode, "w:tc");
      const nextTc = tc?.nextElementSibling;
      if (nextTc) {
        const p = nextTc.querySelector("w:p");
        if (p) {
          const pPr = p.querySelector("w:pPr")?.cloneNode(true);
          p.innerHTML = '';
          if (pPr) p.appendChild(pPr);
          p.appendChild(createRun(draftUser));
        }
      }
    }

    // 3. 예산
    const budgetT = tNodes.find(n => n.textContent?.includes("1. 예") ?? false);
    if (budgetT) {
      const p = findClosestAncestor(budgetT, "w:p");
      if (p) {
        const pPr = p.querySelector("w:pPr")?.cloneNode(true);
        p.innerHTML = '';
        if (pPr) p.appendChild(pPr);
        p.appendChild(createRun("1. 예 산 : "));
        p.appendChild(createRun(`${numberToKoreanText(totalAmount)} (￦${totalAmount.toLocaleString()})`, true));
      }
    }

    // 4. 내용 표
    const tbl = doc.getElementsByTagName("w:tbl")[1]; // 두 번째 테이블
    if (tbl) {
      const rows = Array.from(tbl.getElementsByTagName("w:tr"));
      const templateRow = rows[1]; 
      const templateSumRow = rows[rows.length - 1]; 

      // 기존 데이터 & 합계 행 제거
      for (let i = 1; i < rows.length; i++) {
        tbl.removeChild(rows[i]);
      }

      // 국가 데이터 행들 생성 및 추가
      selectedCountries.forEach((country, index) => {
        const newRow = templateRow.cloneNode(true) as Element;
        
        // 첫 번째 셀 (국가명)
        const cell1 = newRow.getElementsByTagName("w:tc")[0];
        const p1 = cell1.querySelector("w:p");
        if (p1) {
          const pPr = p1.querySelector("w:pPr")?.cloneNode(true) || doc.createElementNS(ns, "w:pPr");
          p1.innerHTML = '';
          p1.appendChild(pPr);
          pPr.appendChild(createJc("center"));
          p1.appendChild(createRun(country.name));
        }

        // 두 번째 셀 (금액)
        const cell2 = newRow.getElementsByTagName("w:tc")[1];
        const p2 = cell2.querySelector("w:p");
        if (p2) {
          const pPr = p2.querySelector("w:pPr")?.cloneNode(true) || doc.createElementNS(ns, "w:pPr");
          p2.innerHTML = '';
          p2.appendChild(pPr);
          pPr.appendChild(createJc("right"));
          p2.appendChild(createRun(`${country.amount.toLocaleString()}원`));
        }

        // 세 번째 셀 (재정구분 - 세로 병합 vMerge 처리)
        const cell3 = newRow.getElementsByTagName("w:tc")[2];
        if (cell3) {
          const p3 = cell3.querySelector("w:p");
          if (p3) {
            const pPr = p3.querySelector("w:pPr")?.cloneNode(true) || doc.createElementNS(ns, "w:pPr");
            p3.innerHTML = '';
            p3.appendChild(pPr);
            pPr.appendChild(createJc("center"));
            p3.appendChild(createRun("부서 재정"));
          }
          
          const vMerge = cell3.querySelector("w:vMerge");
          if (vMerge) {
            if (index === 0) {
              vMerge.setAttributeNS(ns, "w:val", "restart");
            } else {
              vMerge.removeAttributeNS(ns, "w:val");
              vMerge.removeAttribute("w:val");
            }
          }
        }

        tbl.appendChild(newRow);
      });

      // 합계 행 생성 및 추가
      const sumRow = templateSumRow.cloneNode(true) as Element;
      
      const sumCell1 = sumRow.getElementsByTagName("w:tc")[0];
      const pSum1 = sumCell1?.querySelector("w:p");
      if (pSum1) {
        const pPr = pSum1.querySelector("w:pPr")?.cloneNode(true) || doc.createElementNS(ns, "w:pPr");
        pSum1.innerHTML = '';
        pSum1.appendChild(pPr);
        pPr.appendChild(createJc("center"));
        pSum1.appendChild(createRun("합계", true));
      }

      const sumCell2 = sumRow.getElementsByTagName("w:tc")[1];
      const pSum2 = sumCell2?.querySelector("w:p");
      if (pSum2) {
        const pPr = pSum2.querySelector("w:pPr")?.cloneNode(true) || doc.createElementNS(ns, "w:pPr");
        pSum2.innerHTML = '';
        pSum2.appendChild(pPr);
        pPr.appendChild(createJc("right"));
        pSum2.appendChild(createRun(`${totalAmount.toLocaleString()}원`, true));
      }

      const sumCell3 = sumRow.getElementsByTagName("w:tc")[2];
      if (sumCell3) {
        const vMerge = sumCell3.querySelector("w:vMerge");
        if (vMerge) {
          vMerge.removeAttributeNS(ns, "w:val");
          vMerge.removeAttribute("w:val");
        }
      }

      tbl.appendChild(sumRow);
    }
  };

  // XML modification helper for 2.중진회의록 (Pure DOM compliance)
  const modifyMinutesXml = (doc: Document) => {
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const tNodes = Array.from(doc.getElementsByTagName("w:t"));

    const createRun = (text: string, bold = false) => {
      const r = doc.createElementNS(ns, "w:r");
      const rPr = doc.createElementNS(ns, "w:rPr");
      const rFonts = doc.createElementNS(ns, "w:rFonts");
      rFonts.setAttributeNS(ns, "w:ascii", "함초롬바탕");
      rFonts.setAttributeNS(ns, "w:eastAsia", "함초롬바탕");
      rFonts.setAttributeNS(ns, "w:hAnsi", "함초롬바탕");
      rPr.appendChild(rFonts);
      const sz = doc.createElementNS(ns, "w:sz");
      sz.setAttributeNS(ns, "w:val", "24");
      rPr.appendChild(sz);
      if (bold) {
        rPr.appendChild(doc.createElementNS(ns, "w:b"));
      }
      r.appendChild(rPr);
      const t = doc.createElementNS(ns, "w:t");
      t.textContent = text;
      r.appendChild(t);
      return r;
    };

    // 1. 회의 일시
    const timeLabelNode = tNodes.find(n => n.textContent?.trim() === "일시");
    if (timeLabelNode) {
      const tc = findClosestAncestor(timeLabelNode, "w:tc");
      const nextTc = tc?.nextElementSibling;
      if (nextTc) {
        const p = nextTc.querySelector("w:p");
        if (p) {
          const pPr = p.querySelector("w:pPr")?.cloneNode(true);
          p.innerHTML = '';
          if (pPr) p.appendChild(pPr);
          p.appendChild(createRun(meetingDate));
        }
      }
    }

    // 2. 안건
    const pNodes = Array.from(doc.getElementsByTagName("w:p"));
    const agendaPara = pNodes.find(p => p.textContent?.includes("전도업무비") ?? false);
    if (agendaPara) {
      const pPr = agendaPara.querySelector("w:pPr")?.cloneNode(true);
      agendaPara.innerHTML = '';
      if (pPr) agendaPara.appendChild(pPr);
      agendaPara.appendChild(createRun("재정지출", true));
      
      const rBr = doc.createElementNS(ns, "w:r");
      rBr.appendChild(doc.createElementNS(ns, "w:br"));
      agendaPara.appendChild(rBr);
      
      agendaPara.appendChild(createRun(`(전도업무비 : ${Math.round(totalAmount / 10000)}만원)`));
    }

    // 3. 보고 및 브리핑 세부사항
    const reportBriefCell = tNodes.find(n => n.textContent?.includes("가. 보고 및 브리핑") ?? false)?.closest("w:tc");
    if (reportBriefCell) {
      const cellTc = findClosestAncestor(reportBriefCell, "w:tc");
      if (cellTc) {
        const pElements = Array.from(cellTc.getElementsByTagName("w:p"));
        pElements.forEach(p => {
          const text = p.textContent?.replace(/\s+/g, '') ?? '';
          if (text.includes("금액:")) {
            p.innerHTML = '';
            const pPr = doc.createElementNS(ns, "w:pPr");
            const ind = doc.createElementNS(ns, "w:ind");
            ind.setAttributeNS(ns, "w:left", "720");
            pPr.appendChild(ind);
            p.appendChild(pPr);
            p.appendChild(createRun(`   가) 금액 : ${totalAmount.toLocaleString()}원`, true));
          } else if (text.includes("지출대상:")) {
            const names = selectedCountries.map(c => c.name.replace('교회','').replace('지역','')).join(', ');
            p.innerHTML = '';
            const pPr = doc.createElementNS(ns, "w:pPr");
            const ind = doc.createElementNS(ns, "w:ind");
            ind.setAttributeNS(ns, "w:left", "720");
            pPr.appendChild(ind);
            p.appendChild(pPr);
            p.appendChild(createRun(`   나) 지출대상: 해외 ${numCountries}개국(${names})`, true));
          } else if (text.includes("지출예정일:")) {
            p.innerHTML = '';
            const pPr = doc.createElementNS(ns, "w:pPr");
            const ind = doc.createElementNS(ns, "w:ind");
            ind.setAttributeNS(ns, "w:left", "720");
            pPr.appendChild(ind);
            p.appendChild(pPr);
            p.appendChild(createRun(`   다) 지출예정일 : ${expenseDate}`, true));
          }
        });
      }
    }
  };

  // Fetch docx zip, modify inner XML, and trigger download
  const handleExportToWord = async (type: 'proposal' | 'minutes') => {
    try {
      const JSZip = await loadJSZip();
      const templatePath = type === 'proposal'
        ? '/OverseasPortal/모델링/1.품의서-해외선교지역 선교비(원)43.7.docx'
        : '/OverseasPortal/모델링/2.중진회의록_해외선교부-선교비 (43.7월(원)).docx';
      
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`템플릿 파일을 찾을 수 없습니다: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const zip = await JSZip.loadAsync(blob);
      
      // Read & parse word/document.xml
      let xmlText = await zip.file('word/document.xml').async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');
      
      // Modify
      if (type === 'proposal') {
        modifyProposalXml(doc);
      } else {
        modifyMinutesXml(doc);
      }
      
      // Serialize
      const serializer = new XMLSerializer();
      const newXmlText = serializer.serializeToString(doc);
      
      // Update in zip
      zip.file('word/document.xml', newXmlText);
      const outputBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(outputBlob);
      link.download = type === 'proposal'
        ? `1.품의서-해외선교지역 선교비(원)43.7.docx`
        : `2.중진회의록_해외선교부-선교비 (43.7월(원)).docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("진짜 워드(.docx) 파일 생성 중 오류가 발생했습니다: \n" + err);
    }
  };

  // Local printer utility
  const handlePrint = (type: 'proposal' | 'minutes') => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("팝업 차단이 설정되어 있습니다. 팝업 허용 후 다시 시도해 주세요.");
      return;
    }

    const proposalHtml = `
      <div style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; max-width: 210mm; margin: 0 auto; color: #000; padding: 20px;">
        <div style="border: 2px solid #000000; padding: 0; width: 100%; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; min-height: 250mm;">
          
          <div>
            <!-- Upper Table -->
            <table style="width: 100%; border-collapse: collapse; border-top: none; border-left: none; border-right: none; border-bottom: 2px solid #000000;">
              <tbody>
                <tr>
                  <td rowspan="2" style="font-size: 26pt; font-weight: bold; text-align: center; letter-spacing: 20px; padding: 15px 0; border-bottom: 1.5px solid #000000; border-right: 1.5px solid #000000;">품 의 서</td>
                  <td rowspan="2" style="width: 20px; text-align: center; font-weight: bold; font-size: 10pt; border-bottom: 1.5px solid #000000; border-right: 1.5px solid #000000; vertical-align: middle;">결<br>재</td>
                  <td style="width: 80px; text-align: center; font-weight: bold; font-size: 9.5pt; border-bottom: 1.5px solid #000000; border-right: 1.5px solid #000000; padding: 4px 0;">지파총무</td>
                  <td style="width: 80px; text-align: center; font-weight: bold; font-size: 9.5pt; border-bottom: 1.5px solid #000000; padding: 4px 0;">지파장</td>
                </tr>
                <tr>
                  <td style="height: 52px; border-bottom: 1.5px solid #000000; border-right: 1.5px solid #000000;"></td>
                  <td style="height: 52px; border-bottom: 1.5px solid #000000;"></td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; font-size: 10pt; text-align: center; border-bottom: 1px solid #000000; border-right: 1.5px solid #000000; padding: 6px 0; letter-spacing: 2px;">기 안 일 자</td>
                  <td colspan="3" style="border-bottom: 1px solid #000000; padding-left: 15px; font-size: 10pt;">${reportDate}</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; font-size: 10pt; text-align: center; border-bottom: 1px solid #000000; border-right: 1.5px solid #000000; padding: 6px 0; letter-spacing: 2px;">담 당 부 서</td>
                  <td colspan="3" style="border-bottom: 1px solid #000000; padding-left: 15px; font-size: 10pt;">맛디아지파 해외선교부</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; font-size: 10pt; text-align: center; border-bottom: 1px solid #000000; border-right: 1.5px solid #000000; padding: 6px 0;">기안자(부장)</td>
                  <td colspan="3" style="border-bottom: 1px solid #000000; padding-left: 15px; font-size: 10pt;">${draftUser}</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; font-size: 10pt; text-align: center; border-bottom: 1px solid #000000; border-right: 1.5px solid #000000; padding: 6px 0; letter-spacing: 2px;">협 조 부 서</td>
                  <td colspan="3" style="border-bottom: 1px solid #000000; padding-left: 15px; font-size: 10pt;">재정부 (   )</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; font-size: 10pt; text-align: center; border-right: 1.5px solid #000000; padding: 6px 0; letter-spacing: 6px;">제&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목</td>
                  <td colspan="3" style="padding-left: 15px; font-size: 10.5pt; font-weight: bold;">해외지역 선교비 지급의 건</td>
                </tr>
              </tbody>
            </table>

            <!-- Content Area inside outer border -->
            <div style="padding: 25px 35px 15px 35px;">
              <div style="font-size: 11pt; line-height: 2.0; margin-bottom: 25px;">
                해외선교부에서는 해외지역 선교비용을 아래와 같이 신청하오니 검토 후 재가하여 주시기 바랍니다.
              </div>

              <div style="text-align: center; font-weight: bold; font-size: 12pt; margin: 25px 0 15px 0;">- 아  래 -</div>

              <div style="width: 75%; margin: 0 auto;">
                <div style="font-size: 11pt; margin-bottom: 14px;">
                  <b>1. 예 산 : </b>${numberToKoreanText(totalAmount)} (￦${totalAmount.toLocaleString()})
                </div>

                <div style="font-size: 11pt; margin-bottom: 8px;">
                  <b>2. 내 용 : </b>
                </div>
              </div>

              <table style="width: 75%; border-collapse: collapse; margin: 5px auto 20px auto; border: 1.5px solid #000000;">
                <thead>
                  <tr>
                    <th style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; width: 50%; font-size: 9.5pt;">지 역</th>
                    <th style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; width: 30%; font-size: 9.5pt;">금 액</th>
                    <th style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; text-align: center; width: 20%; font-size: 9.5pt;">재 정</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedCountries.map((c, index) => `
                    <tr style="height: 30px;">
                      <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-size: 9.5pt;">${c.name}</td>
                      <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-weight: bold; font-size: 9.5pt;">${c.amount.toLocaleString()}원</td>
                      ${index === 0 ? `<td rowspan="${selectedCountries.length + 1}" style="border: 1px solid #000000; padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 10pt;">부서 재정</td>` : ''}
                    </tr>
                  `).join('')}
                  <tr style="font-weight: bold; height: 30px;">
                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-size: 9.5pt;">합 계</td>
                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-size: 9.5pt;">${totalAmount.toLocaleString()}원</td>
                  </tr>
                </tbody>
              </table>

              <div style="font-size: 10pt; color: #475569; margin-top: 20px;">
                &lt;붙임&gt; 중진회의록.  끝.
              </div>
            </div>
          </div>

          <!-- Footer Signature at the bottom of outer border -->
          <div style="text-align: right; font-size: 13pt; font-weight: bold; letter-spacing: 2px; padding: 15px; border-top: 1px solid #000000; margin-top: auto;">
            신천지예수교 맛디아지파 대전교회
          </div>

        </div>
      </div>
    `;

    const minutesHtml = `
      <div style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; max-width: 210mm; margin: 0 auto; color: #000; line-height: 2.0; padding: 20px;">
        <div style="border: 2px solid #000000; padding: 25px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; min-height: 250mm;">
          <div>
            <div style="font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 35px; letter-spacing: 12px; text-decoration: underline; text-underline-position: under;">
              회 의 록
            </div>

            <h4 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0; border-left: 4px solid #000; padding-left: 8px;">
              1. 기본 정보
            </h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1.5px solid #000;">
              <tbody>
                <tr>
                  <td style="font-weight: bold; text-align: center; border: 1px solid #000; width: 130px; padding: 8px; font-size: 10pt;">회 의 명</td>
                  <td style="border: 1px solid #000; padding: 8px 12px; font-size: 10pt;">맛디아지파 중진회의</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px; font-size: 10pt;">일 시</td>
                  <td style="border: 1px solid #000; padding: 8px 12px; font-size: 10pt;">${meetingDate}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px; font-size: 10pt;">장 소</td>
                  <td style="border: 1px solid #000; padding: 8px 12px; font-size: 10pt;">중진회의실</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px; font-size: 10pt;">대 상 / 참석</td>
                  <td style="border: 1px solid #000; padding: 8px 12px; font-size: 10pt;">지파 24부장, 내무부 각 회장 / 27명 중 27명 참석</td>
                </tr>
              </tbody>
            </table>

            <h4 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0; border-left: 4px solid #000; padding-left: 8px;">
              2. 회의 안건
            </h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1.5px solid #000;">
              <thead>
                <tr>
                  <th style="border: 1px solid #000; padding: 10px; text-align: center; width: 12%; font-size: 10pt;">번호</th>
                  <th style="border: 1px solid #000; padding: 10px; text-align: center; width: 58%; font-size: 10pt;">안건</th>
                  <th style="border: 1px solid #000; padding: 10px; text-align: center; width: 30%; font-size: 10pt;">결정 사항 (계획 포함)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid #000; padding: 15px; text-align: center;">1</td>
                  <td style="border: 1px solid #000; padding: 15px; font-size: 10pt;">
                    <b>재정지출</b><br>
                    (전도업무비 : ${Math.round(totalAmount / 10000)}만원)
                  </td>
                  <td style="font-weight: bold; border: 1px solid #000; padding: 15px; text-align: center; font-size: 10pt;">지출 결정</td>
                </tr>
              </tbody>
            </table>

            <h4 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0; border-left: 4px solid #000; padding-left: 8px;">
              3. 기타 사항 (보고 및 브리핑 등)
            </h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1.5px solid #000;">
              <tbody>
                <tr>
                  <td style="border: 1.5px solid #000; padding: 20px; line-height: 1.9; font-size: 10.5pt;">
                    <b>가. 보고 및 브리핑</b><br>
                    1) 내용: 전도업무비 재정 지출의 건<br>
                    &nbsp;&nbsp;&nbsp;가) 금액 : ${totalAmount.toLocaleString()}원<br>
                    &nbsp;&nbsp;&nbsp;나) 지출대상: 해외 ${numCountries}개국(${selectedCountries.map(c => c.name.replace('교회','').replace('지역','')).join(', ')})<br>
                    &nbsp;&nbsp;&nbsp;다) 지출예정일 : ${expenseDate}<br>
                    &nbsp;&nbsp;&nbsp;라) 재정 : 교회재정
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="font-size: 11pt; text-align: center; font-style: italic; color: #000; margin-top: 30px; margin-bottom: 30px;">
              상기 안건에 대하여 전원 동의하고 서명·날인하다.
            </div>
          </div>

          <div style="border-top: 1px solid #000000; padding-top: 15px;">
            <div style="font-size: 8.5pt; color: #475569; line-height: 1.6; margin-bottom: 20px;">
              <b>&lt;참석 중진 명단&gt;</b><br>
              지파총무 ( ), 내무부장 ( ), 기획부장 ( ), 재정부장 ( ), 교육부장 ( ), 해외선교부장( ), 전도부장 ( ) 등 중진 부장 전원.
            </div>

            <div style="text-align: right; font-size: 13pt; font-weight: bold; letter-spacing: 2px; margin-top: 15px;">
              신천지예수교 맛디아지파 대전교회
            </div>
          </div>
        </div>
      </div>
    `;

    const htmlContent = type === 'proposal' ? proposalHtml : minutesHtml;
    const styleTag = `
      body { background: white; color: black; padding: 40px; }
      @media print { body { padding: 0; } }
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>${type === 'proposal' ? '품의서' : '중진회의록'}</title>
          <style>${styleTag}</style>
        </head>
        <body onload="window.print(); window.close();">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', color: '#1e293b', fontFamily: '"Malgun Gothic", "맑은 고딕", sans-serif' }}>
      
      {/* CSS overrides to clean contentEditable hover states & apply HWP Batang Font */}
      <style>{`
        .hwp-editable-text {
          background: transparent;
          border: none;
          outline: none;
          padding: 2px 4px;
          border-radius: 3px;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .hwp-editable-text:hover {
          background: #eff6ff;
          box-shadow: 0 0 0 1px #3b82f6 inset;
          cursor: text;
        }
        .hwp-editable-text:focus {
          background: #eff6ff;
          box-shadow: 0 0 0 1.5px #2563eb inset;
          outline: none;
        }
        .hwp-document-font {
          font-family: "Malgun Gothic", "맑은 고딕", Arial, sans-serif !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* 1. LEDGER VIEW */}
      {activeTab === 'ledger' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🩺 해외교회 원장헌금 월별 집계
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
                매월 수신된 국가별 원장헌금 현황을 한눈에 조회합니다 (원장헌금 실적 기재용).
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {!isEditMode ? (
                <>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>조회 연도</span>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <option value="2026">2026년</option>
                    <option value="2025">2025년</option>
                  </select>
                  <button
                    onClick={handleStartEdit}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                  >
                    ✍️ 실적 수정
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', marginRight: '10px' }}>
                    ⚠️ 수정 모드 ({selectedYear}년)
                  </span>
                  <button
                    onClick={handleAddChurch}
                    style={{
                      background: '#475569',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#475569'}
                  >
                    ➕ 교회 추가
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                  >
                    💾 저장
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("변경 내용을 폐기하고 수정 모드를 종료하시겠습니까?")) {
                        setIsEditMode(false);
                      }
                    }}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(239,68,68,0.2)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                  >
                    ❌ 취소
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #e6edf8', 
            padding: '24px', 
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '16px 12px', textAlign: 'left', minWidth: '150px', fontWeight: 800 }}>해외교회 / 개척지역</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i + 1} style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 800 }}>{i + 1}월</th>
                    ))}
                    <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 800, background: '#f1f5f9', color: '#0f172a' }}>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {isEditMode ? (
                    <>
                      {editData.map(row => {
                        const rowSum = Object.values(row.months).reduce((sum: number, val) => sum + (val || 0), 0);
                        return (
                          <tr key={row.country} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 8px', fontWeight: 700, color: '#1e293b' }}>
                              🌎 {row.country}
                            </td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const month = i + 1;
                              const val = row.months[month];
                              return (
                                <td key={month} style={{ padding: '6px 4px' }}>
                                  <input
                                    type="text"
                                    value={val !== '' ? val.toLocaleString() : ''}
                                    onChange={(e) => handleCellChange(row.country, month, e.target.value)}
                                    placeholder="-"
                                    style={{
                                      width: '100%',
                                      minWidth: '80px',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      textAlign: 'right',
                                      fontSize: '0.82rem',
                                      fontWeight: val !== '' ? 700 : 500,
                                      color: '#2563eb',
                                      outline: 'none',
                                      background: '#f8fafc',
                                      transition: 'all 0.15s'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = '#3b82f6';
                                      e.target.style.background = '#ffffff';
                                      e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = '#cbd5e1';
                                      e.target.style.background = '#f8fafc';
                                      e.target.style.boxShadow = 'none';
                                    }}
                                  />
                                </td>
                              );
                            })}
                            <td style={{ 
                              padding: '12px 8px', 
                              textAlign: 'right', 
                              fontWeight: 800, 
                              color: '#1e3a8a', 
                              background: '#f8fafc' 
                            }}>
                              {rowSum.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Live Totals Row in Edit Mode */}
                      {(() => {
                        const monthSums = Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          return editData.reduce((sum, row) => sum + (row.months[month] || 0), 0);
                        });
                        const grandTotal = monthSums.reduce((sum, val) => sum + val, 0);
                        return (
                          <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                            <td style={{ padding: '16px 12px', color: '#0f172a' }}>
                              📊 합계
                            </td>
                            {monthSums.map((sum, i) => (
                              <td key={i} style={{ 
                                padding: '16px 12px', 
                                textAlign: 'right', 
                                color: sum > 0 ? '#0f172a' : '#cbd5e1'
                              }}>
                                {sum > 0 ? sum.toLocaleString() : '-'}
                              </td>
                            ))}
                            <td style={{ 
                              padding: '16px 12px', 
                              textAlign: 'right', 
                              color: '#1e3a8a', 
                              background: '#e2e8f0', 
                              fontWeight: 900,
                              fontSize: '0.9rem' 
                            }}>
                              {grandTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })()}
                    </>
                  ) : (
                    // VIEW MODE (Original Code)
                    <>
                      {matrixRows.length === 0 ? (
                        <tr>
                          <td colSpan={14} style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                            선택한 연도({selectedYear}년)에 등록된 원장헌금 실적 데이터가 존재하지 않습니다.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {matrixRows.map(row => {
                            const rowSum = Object.values(row.months).reduce((sum: number, val) => sum + (val || 0), 0);
                            return (
                              <tr key={row.country} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                                <td style={{ padding: '16px 12px', fontWeight: 700, color: '#1e293b' }}>
                                  🌎 {row.country}
                                </td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const val = row.months[i + 1];
                                  return (
                                    <td key={i + 1} style={{ 
                                      padding: '16px 12px', 
                                      textAlign: 'right', 
                                      fontWeight: val !== null ? 700 : 500,
                                      color: val !== null ? '#2563eb' : '#cbd5e1'
                                    }}>
                                      {val !== null ? val.toLocaleString() : '-'}
                                    </td>
                                  );
                                })}
                                <td style={{ 
                                  padding: '16px 12px', 
                                  textAlign: 'right', 
                                  fontWeight: 800, 
                                  color: '#1e3a8a', 
                                  background: '#f8fafc' 
                                }}>
                                  {rowSum.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Monthly Totals Row */}
                          {(() => {
                            const monthSums = Array.from({ length: 12 }, (_, i) => {
                              const month = i + 1;
                              return matrixRows.reduce((sum, row) => sum + (row.months[month] || 0), 0);
                            });
                            const grandTotal = monthSums.reduce((sum, val) => sum + val, 0);
                            return (
                              <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                                <td style={{ padding: '16px 12px', color: '#0f172a' }}>
                                  📊 합계
                                </td>
                                {monthSums.map((sum, i) => (
                                  <td key={i} style={{ 
                                    padding: '16px 12px', 
                                    textAlign: 'right', 
                                    color: sum > 0 ? '#0f172a' : '#cbd5e1'
                                  }}>
                                    {sum > 0 ? sum.toLocaleString() : '-'}
                                  </td>
                                ))}
                                <td style={{ 
                                  padding: '16px 12px', 
                                  textAlign: 'right', 
                                  color: '#1e3a8a', 
                                  background: '#e2e8f0', 
                                  fontWeight: 900,
                                  fontSize: '0.9rem' 
                                }}>
                                  {grandTotal.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })()}
                        </>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. REPORT WRITER VIEW */}
      {activeTab === 'ledger_report' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📝 품의서 및 중진회의록 자동 작성
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
                기안서 템플릿과 100% 동일하게 실제 워드 파일(.docx)을 자동 생성하고 실시간 미리보기/인라인 편집을 지원합니다.
              </p>
            </div>

            {/* Target Year / Month Dropdown to select and load/save data */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f1f5f9', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>작성 대상 월</span>
              <select 
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.82rem' }}
              >
                <option value="2026">2026년</option>
                <option value="2025">2025년</option>
              </select>
              <select 
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.82rem' }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}월</option>
                ))}
              </select>
              <button 
                onClick={handleSaveData}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={14} /> 💾 데이터 저장
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '28px', alignItems: 'start' }}>
            
            {/* Left Control Panel */}
            <div style={{ 
              background: '#ffffff', 
              border: '1px solid #e6edf8', 
              borderRadius: '16px', 
              padding: '24px',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ 기안 설정 제어 ({reportYear}년 {reportMonth}월)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>기안 일자</label>
                  <input 
                    type="text" 
                    value={reportDate} 
                    onChange={(e) => setReportDate(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>기안자 (부장)</label>
                  <input 
                    type="text" 
                    value={draftUser} 
                    onChange={(e) => setDraftUser(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>지출 예정일</label>
                  <input 
                    type="text" 
                    value={expenseDate} 
                    onChange={(e) => setExpenseDate(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>회의록 일시</label>
                  <input 
                    type="text" 
                    value={meetingDate} 
                    onChange={(e) => setMeetingDate(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid #f1f5f9', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  🌍 대상 국가 및 금액
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    onClick={() => setNumCountries(prev => Math.max(1, prev - 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}
                  >
                    <MinusCircle size={20} />
                  </button>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, width: '40px', textAlign: 'center' }}>{numCountries}개국</span>
                  <button 
                    onClick={() => setNumCountries(prev => Math.min(10, prev + 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 0, display: 'flex' }}
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {selectedCountries.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1.1fr', 
                    gap: '8px', 
                    background: '#f8fafc', 
                    padding: '10px', 
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div>
                      <select 
                        value={item.name} 
                        onChange={(e) => {
                          const updated = [...selectedCountries];
                          updated[idx].name = e.target.value;
                          setSelectedCountries(updated);
                        }}
                        style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem' }}
                      >
                        {availableChurches.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <input 
                        type="number" 
                        value={item.amount || ''} 
                        placeholder="금액 입력"
                        onChange={(e) => {
                          const updated = [...selectedCountries];
                          updated[idx].amount = parseInt(e.target.value) || 0;
                          setSelectedCountries(updated);
                        }}
                        style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ 
                background: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                borderRadius: '8px', 
                padding: '12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>총 예산액</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e3a8a' }}>₩ {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Right Sheet Preview Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
                  <button 
                    onClick={() => setPreviewTab('proposal')}
                    style={{
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      transition: 'all 0.15s',
                      background: previewTab === 'proposal' ? '#ffffff' : 'transparent',
                      color: previewTab === 'proposal' ? '#0f172a' : '#64748b'
                    }}
                  >
                    📃 품의서 양식
                  </button>
                  <button 
                    onClick={() => setPreviewTab('minutes')}
                    style={{
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      transition: 'all 0.15s',
                      background: previewTab === 'minutes' ? '#ffffff' : 'transparent',
                      color: previewTab === 'minutes' ? '#0f172a' : '#64748b'
                    }}
                  >
                    📋 중진회의록 양식
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleExportToWord(previewTab)}
                    style={{
                      padding: '8px 14px',
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Download size={14} /> 진짜 워드(.docx) 다운로드
                  </button>
                  <button 
                    onClick={() => handlePrint(previewTab)}
                    style={{
                      padding: '8px 14px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Printer size={14} /> 인쇄 / 출력
                  </button>
                </div>
              </div>

              {/* Exact Paper Layout container simulating MS Word / Hangul document */}
              <div style={{ 
                background: '#e2e8f0', 
                padding: '35px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid #cbd5e1'
              }}>
                <div className="hwp-document-font" style={{ 
                  fontFamily: '"함초롬바탕", Batang, "Times New Roman", serif',
                  background: '#ffffff', 
                  width: '210mm', 
                  minHeight: '297mm', 
                  padding: '20mm 20mm 20mm 20mm', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                  boxSizing: 'border-box',
                  color: '#000000',
                  fontSize: '10.5pt',
                  lineHeight: '1.6',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {/* Decorative corner marks simulating page margins */}
                  <div style={{ position: 'absolute', left: '15px', top: '15px', width: '10px', height: '10px', borderLeft: '1px solid #cbd5e1', borderTop: '1px solid #cbd5e1' }}></div>
                  <div style={{ position: 'absolute', right: '15px', top: '15px', width: '10px', height: '10px', borderRight: '1px solid #cbd5e1', borderTop: '1px solid #cbd5e1' }}></div>
                  <div style={{ position: 'absolute', left: '15px', bottom: '15px', width: '10px', height: '10px', borderLeft: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}></div>
                  <div style={{ position: 'absolute', right: '15px', bottom: '15px', width: '10px', height: '10px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}></div>

                  {/* 1. 품의서 UI (동일하게 재현) */}
                  {previewTab === 'proposal' && (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: '2px solid #000000', 
                      boxSizing: 'border-box',
                      padding: '0',
                      justifyContent: 'space-between',
                      minHeight: '250mm'
                    }}>
                      
                      <div>
                        {/* Upper Table - border-top/left/right removed to merge seamlessly with outer border */}
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          borderTop: 'none', 
                          borderLeft: 'none', 
                          borderRight: 'none', 
                          borderBottom: '2px solid #000000' 
                        }}>
                          <tbody>
                            <tr>
                              <td rowSpan={2} style={{ 
                                fontSize: '26pt', 
                                fontWeight: 'bold', 
                                textAlign: 'center', 
                                letterSpacing: '20px', 
                                padding: '16px 0 16px 20px', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000' 
                              }}>
                                품 의 서
                              </td>
                              <td rowSpan={2} style={{ 
                                width: '20px', 
                                textAlign: 'center', 
                                fontWeight: 'bold', 
                                fontSize: '10pt', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000',
                                verticalAlign: 'middle'
                              }}>
                                결<br/>재
                              </td>
                              <td style={{ 
                                width: '80px', 
                                textAlign: 'center', 
                                fontWeight: 'bold', 
                                fontSize: '9.5pt', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000',
                                padding: '5px 0'
                              }}>
                                지파총무
                              </td>
                              <td style={{ 
                                width: '80px', 
                                textAlign: 'center', 
                                fontWeight: 'bold', 
                                fontSize: '9.5pt', 
                                borderBottom: '1.5px solid #000000',
                                padding: '5px 0'
                              }}>
                                지파장
                              </td>
                            </tr>
                            <tr>
                              <td style={{ height: '52px', borderBottom: '1.5px solid #000000', borderRight: '1.5px solid #000000' }}></td>
                              <td style={{ height: '52px', borderBottom: '1.5px solid #000000' }}></td>
                            </tr>
                            <tr style={{ height: '32px' }}>
                              <td style={{ 
                                width: '110px', 
                                fontWeight: 'bold', 
                                fontSize: '10pt', 
                                textAlign: 'center', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000',
                                letterSpacing: '2px'
                              }}>
                                기 안 일 자
                              </td>
                              <td colSpan={3} style={{ borderBottom: '1.5px solid #000000', paddingLeft: '15px', fontSize: '10pt' }}>
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  {reportDate}
                                </span>
                              </td>
                            </tr>
                            <tr style={{ height: '32px' }}>
                              <td style={{ 
                                width: '110px', 
                                fontWeight: 'bold', 
                                fontSize: '10pt', 
                                textAlign: 'center', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000',
                                letterSpacing: '2px'
                              }}>
                                담 당 부 서
                              </td>
                              <td colSpan={3} style={{ borderBottom: '1.5px solid #000000', paddingLeft: '15px', fontSize: '10pt' }}>
                                맛디아지파 해외선교부
                              </td>
                            </tr>
                            <tr style={{ height: '32px' }}>
                              <td style={{ 
                                width: '110px', 
                                fontWeight: 'bold', 
                                fontSize: '10pt', 
                                textAlign: 'center', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000'
                              }}>
                                기안자(부장)
                              </td>
                              <td colSpan={3} style={{ borderBottom: '1.5px solid #000000', paddingLeft: '15px', fontSize: '10pt' }}>
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  {draftUser}
                                </span>
                              </td>
                            </tr>
                            <tr style={{ height: '32px' }}>
                              <td style={{ 
                                width: '110px', 
                                fontWeight: 'bold', 
                                fontSize: '10pt', 
                                textAlign: 'center', 
                                borderBottom: '1.5px solid #000000', 
                                borderRight: '1.5px solid #000000',
                                letterSpacing: '2px'
                              }}>
                                협 조 부 서
                              </td>
                              <td colSpan={3} style={{ borderBottom: '1.5px solid #000000', paddingLeft: '15px', fontSize: '10pt' }}>
                                재정부 (      )
                              </td>
                            </tr>
                            <tr style={{ height: '36px' }}>
                              <td style={{ 
                                width: '110px', 
                                fontWeight: 'bold', 
                                fontSize: '10pt', 
                                textAlign: 'center', 
                                borderRight: '1.5px solid #000000',
                                letterSpacing: '6px'
                              }}>
                                제&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목
                              </td>
                              <td colSpan={3} style={{ paddingLeft: '15px', fontSize: '10.5pt', fontWeight: 'bold' }}>
                                해외지역 선교비 지급의 건
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Content Area inside outer border */}
                        <div style={{ padding: '25px 35px 15px 35px' }}>
                          
                          <div style={{ fontSize: '11pt', lineHeight: '2.0', marginBottom: '25px' }}>
                            해외선교부에서는 해외지역 선교비용을 아래와 같이 신청하오니 검토 후 재가하여 주시기 바랍니다.
                          </div>

                          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', margin: '25px 0 15px 0' }}>- 아  래 -</div>

                          {/* Budget and Description aligned perfectly with table left border */}
                          <div style={{ width: '75%', margin: '0 auto' }}>
                            <div style={{ fontSize: '11pt', marginBottom: '14px' }}>
                              <b>1. 예 산 : </b>
                              <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                {numberToKoreanText(totalAmount)} (￦{totalAmount.toLocaleString()})
                              </span>
                            </div>

                            <div style={{ fontSize: '11pt', marginBottom: '8px' }}>
                              <b>2. 내 용 : </b>
                            </div>
                          </div>

                          {/* 내용 세부 중첩 표 (Narrower width: 75%, matching HWP template, pure white table header) */}
                          <table style={{ width: '75%', borderCollapse: 'collapse', margin: '5px auto 20px auto', border: '1.5px solid #000000' }}>
                            <thead>
                              <tr style={{ height: '32px' }}>
                                <th style={{ border: '1px solid #000000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center', width: '50%', fontSize: '9.5pt' }}>지 역</th>
                                <th style={{ border: '1px solid #000000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center', width: '30%', fontSize: '9.5pt' }}>금 액</th>
                                <th style={{ border: '1px solid #000000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'center', width: '20%', fontSize: '9.5pt' }}>재 정</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCountries.map((c, index) => (
                                <tr key={index} style={{ height: '30px' }}>
                                  <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontSize: '9.5pt' }}>
                                    <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                      {c.name}
                                    </span>
                                  </td>
                                  <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '9.5pt' }}>
                                    <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                      {c.amount.toLocaleString()}원
                                    </span>
                                  </td>
                                  
                                  {/* 세로 병합 셀 표현 - rowSpan을 selectedCountries 개수 + 합계(1) 만큼 적용 */}
                                  {index === 0 && (
                                    <td 
                                      rowSpan={selectedCountries.length + 1} 
                                      style={{ border: '1px solid #000000', padding: '10px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', verticalAlign: 'middle', background: '#ffffff' }}
                                    >
                                      부서 재정
                                    </td>
                                  )}
                                </tr>
                              ))}
                              <tr style={{ fontWeight: 'bold', height: '30px' }}>
                                <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontSize: '9.5pt' }}>합 계</td>
                                <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right', fontSize: '9.5pt' }}>
                                  <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                    {totalAmount.toLocaleString()}원
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <div style={{ fontSize: '10pt', color: '#475569', marginTop: '20px' }}>
                            &lt;붙임&gt; 중진회의록.  끝.
                          </div>
                        </div>
                      </div>

                      {/* Bottom signature line (Merged as the footer of the Outer Box, with top border) */}
                      <div style={{ 
                        textAlign: 'right', 
                        fontSize: '13pt', 
                        fontWeight: 'bold', 
                        letterSpacing: '2px',
                        padding: '15px 25px 15px 15px',
                        borderTop: '1px solid #000000',
                        color: '#000000',
                        marginTop: 'auto'
                      }}>
                        신천지예수교 맛디아지파 대전교회
                      </div>

                    </div>
                  )}

                  {/* 2. 중진회의록 UI (동일하게 재현) */}
                  {previewTab === 'minutes' && (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: '2px solid #000000',
                      padding: '25px',
                      boxSizing: 'border-box',
                      justifyContent: 'space-between',
                      minHeight: '250mm'
                    }}>
                      <div>
                        <div style={{ fontSize: '24pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '35px', letterSpacing: '12px', textDecoration: 'underline', textUnderlinePosition: 'under' }}>
                          회 의 록
                        </div>

                        <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0 0 10px 0', borderLeft: '4px solid #000000', paddingLeft: '8px' }}>
                          1. 기본 정보
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', border: '1.5px solid #000000' }}>
                          <tbody>
                            <tr style={{ height: '35px' }}>
                              <td style={{ fontWeight: 'bold', textAlign: 'center', border: '1px solid #000000', width: '130px', padding: '8px', fontSize: '10pt' }}>회 의 명</td>
                              <td style={{ border: '1px solid #000000', padding: '8px 12px', fontSize: '10pt' }}>맛디아지파 중진회의</td>
                            </tr>
                            <tr style={{ height: '35px' }}>
                              <td style={{ fontWeight: 'bold', textAlign: 'center', border: '1px solid #000000', padding: '8px', fontSize: '10pt' }}>일 시</td>
                              <td style={{ border: '1px solid #000000', padding: '8px 12px', fontSize: '10pt' }}>
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  {meetingDate}
                                </span>
                              </td>
                            </tr>
                            <tr style={{ height: '35px' }}>
                              <td style={{ fontWeight: 'bold', textAlign: 'center', border: '1px solid #000000', padding: '8px', fontSize: '10pt' }}>장 소</td>
                              <td style={{ border: '1px solid #000000', padding: '8px 12px', fontSize: '10pt' }}>중진회의실</td>
                            </tr>
                            <tr style={{ height: '35px' }}>
                              <td style={{ fontWeight: 'bold', textAlign: 'center', border: '1px solid #000000', padding: '8px', fontSize: '10pt' }}>대 상 / 참석</td>
                              <td style={{ border: '1px solid #000000', padding: '8px 12px', fontSize: '10pt' }}>지파 24부장, 내무부 각 회장 / 27명 중 27명 참석</td>
                            </tr>
                          </tbody>
                        </table>

                        <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0 0 10px 0', borderLeft: '4px solid #000000', paddingLeft: '8px' }}>
                          2. 회의 안건
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', border: '1.5px solid #000000' }}>
                          <thead>
                            <tr style={{ height: '32px' }}>
                              <th style={{ border: '1px solid #000000', padding: '10px', textAlign: 'center', width: '12%', fontSize: '10pt' }}>번호</th>
                              <th style={{ border: '1px solid #000000', padding: '10px', textAlign: 'center', width: '58%', fontSize: '10pt' }}>안건</th>
                              <th style={{ border: '1px solid #000000', padding: '10px', textAlign: 'center', width: '30%', fontSize: '10pt' }}>결정 사항 (계획 포함)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ height: '55px' }}>
                              <td style={{ border: '1px solid #000000', padding: '15px', textAlign: 'center' }}>1</td>
                              <td style={{ border: '1px solid #000000', padding: '15px', fontSize: '10pt' }}>
                                <b>재정지출</b><br/>
                                (전도업무비 : 
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  {Math.round(totalAmount / 10000)}만원
                                </span>
                                )
                              </td>
                              <td style={{ fontWeight: 'bold', border: '1px solid #000000', padding: '10px', textAlign: 'center', fontSize: '10pt', color: '#2563eb' }}>지출 결정</td>
                            </tr>
                          </tbody>
                        </table>

                        <h4 style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0 0 10px 0', borderLeft: '4px solid #000000', paddingLeft: '8px' }}>
                          3. 기타 사항 (보고 및 브리핑 등)
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1.5px solid #000000' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '20px', lineHeight: 2.0, textIndent: '5px', fontSize: '10.5pt' }}>
                                <b>가. 보고 및 브리핑</b><br/>
                                1) 내용: 전도업무비 재정 지출의 건<br/>
                                &nbsp;&nbsp;&nbsp;가) 금액 : 
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  {totalAmount.toLocaleString()}원
                                </span>
                                <br/>
                                &nbsp;&nbsp;&nbsp;나) 지출대상: 
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  해외 {numCountries}개국({selectedCountries.map(c => c.name.replace('교회','').replace('지역','')).join(', ')})
                                </span>
                                <br/>
                                &nbsp;&nbsp;&nbsp;다) 지출예정일 : 
                                <span style={{ background: '#ffff00', color: '#000000', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                  {expenseDate}
                                </span>
                                <br/>
                                &nbsp;&nbsp;&nbsp;라) 재정 : 교회재정
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ fontSize: '11pt', textAlign: 'center', fontStyle: 'italic', color: '#475569', marginTop: '25px', marginBottom: '25px' }}>
                          상기 안건에 대하여 전원 동의하고 서명·날인하다.
                        </div>
                      </div>

                      {/* Footer Signature block inside outer border */}
                      <div style={{ borderTop: '1px solid #000000', paddingTop: '15px' }}>
                        <div style={{ fontSize: '8.5pt', color: '#64748b', lineHeight: 1.6, marginBottom: '15px' }}>
                          <b>&lt;참석 중진 명단&gt;</b><br/>
                          지파총무 ( ), 내무부장 ( ), 기획부장 ( ), 재정부장 ( ), 교육부장 ( ), 해외선교부장( ), 전도부장 ( ) 등 중진 부장 전원.
                        </div>

                        <div style={{ 
                          textAlign: 'right', 
                          fontSize: '13pt', 
                          fontWeight: 'bold', 
                          letterSpacing: '2px',
                          color: '#000000'
                        }}>
                          신천지예수교 맛디아지파 대전교회
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 3. FRUIT VIEW */}
      {activeTab === 'fruit' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              🍇 해외선교 열매헌금 내역
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              인도자별 등록/수료 감사 열매헌금 실적을 조회하고 보고서를 확인합니다.
            </p>
          </div>
          
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6edf8', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>열매헌금 최근 집계</h3>
            <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
              (이 파트는 이후 원장헌금과 유사한 보고서 작성 로직으로 순차 개발 예정입니다.)
            </div>
          </div>
        </div>
      )}

      {/* 4. TRANSPORT VIEW */}
      {activeTab === 'transport' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              🚗 해외 파송 사역자 교통비 정산
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              사역자 출장 여비 및 교통 정산비 청구 내역을 취합합니다.
            </p>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6edf8', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>교통비 이력</h3>
            <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
              (이 파트는 이후 원장헌금과 유사한 보고서 작성 로직으로 순차 개발 예정입니다.)
            </div>
          </div>
        </div>
      )}

      {/* 5. MISSION VIEW */}
      {activeTab === 'mission' && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              🌍 해외교회 선교 보조비 관리
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              국가별 매월 지급되는 정기 및 특별 선교비 지원 청구 현황을 관리합니다.
            </p>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6edf8', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>선교 보조금 이력</h3>
            <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
              (이 파트는 이후 원장헌금과 유사한 보고서 작성 로직으로 순차 개발 예정입니다.)
            </div>
          </div>
        </div>
      )}

      {/* 6. ARCHIVES (원장헌금, 열매헌금, 교통비, 선교비 품의서 및 회의록 보관함) */}
      {['ledger_archive', 'fruit_archive', 'transport_archive', 'mission_archive'].includes(activeTab) && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeTab === 'ledger_archive' ? '📁 원장헌금 품의서 및 회의록 보관함' :
                 activeTab === 'fruit_archive' ? '📁 열매헌금 품의서 및 회의록 보관함' :
                 activeTab === 'transport_archive' ? '📁 교통비 품의서 및 회의록 보관함' :
                 activeTab === 'mission_archive' ? '📁 선교비 품의서 및 회의록 보관함' :
                 '📁 품의서 및 회의록 보관함'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
                {activeTab === 'ledger_archive' ? '월별로 결재 완료된 원장헌금 품의서와 중진회의록 문서를 업로드하고 안전하게 보관 및 조회할 수 있습니다.' :
                 activeTab === 'fruit_archive' ? '월별로 결재 완료된 열매헌금 품의서와 중진회의록 문서를 업로드하고 안전하게 보관 및 조회할 수 있습니다.' :
                 activeTab === 'transport_archive' ? '월별로 결재 완료된 교통비 품의서와 중진회의록 문서를 업로드하고 안전하게 보관 및 조회할 수 있습니다.' :
                 activeTab === 'mission_archive' ? '월별로 결재 완료된 선교비 품의서와 중진회의록 문서를 업로드하고 안전하게 보관 및 조회할 수 있습니다.' :
                 '월별로 결재 완료된 품의서와 중진회의록 문서를 업로드하고 안전하게 보관 및 조회할 수 있습니다.'}
              </p>
            </div>
            
            {/* Year Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>조회 연도:</span>
              <select
                value={archiveYear}
                onChange={(e) => setArchiveYear(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {(() => {
                  const startYear = 2026;
                  const currentYear = new Date().getFullYear();
                  const endYear = Math.max(startYear, currentYear);
                  const options = [];
                  for (let y = startYear; y <= endYear; y++) {
                    options.push(
                      <option key={y} value={y.toString()}>{y}년</option>
                    );
                  }
                  return options;
                })()}
              </select>
            </div>
          </div>

          {/* Calendar style compact 12-month Grid (Grid of 4 columns, auto-adjusting) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
            gap: '16px', 
            marginTop: '20px' 
          }}>
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const proposalKey = `${month}_proposal`;
              const minutesKey = `${month}_minutes`;
              
              const proposalFile = archiveFiles[proposalKey];
              const minutesFile = archiveFiles[minutesKey];

              return (
                <div key={month} style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
                }}>
                  
                  {/* Calendar Box Header */}
                  <div style={{ 
                    background: '#f8fafc', 
                    borderBottom: '1px solid #f1f5f9', 
                    padding: '10px 14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📅 {month}월
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                      {archiveYear}년
                    </span>
                  </div>

                  {/* Calendar Box Body */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    
                    {/* 1. 품의서 Slot */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input 
                        type="file" 
                        id={`file-input-${month}-proposal`} 
                        style={{ display: 'none' }} 
                        onChange={(e) => handleFileUpload(month, 'proposal', e)}
                      />
                      {proposalFile ? (
                        <div 
                          onClick={() => setPreviewModalFile({ month, docType: 'proposal', file: proposalFile })}
                          style={{
                            background: '#f0fdf4', // light green accent indicating loaded file
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                          title="클릭하여 미리보기"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <FileCheck size={14} color="#15803d" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={proposalFile.name}>
                              품의서 완료
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button 
                              onClick={(e) => handleFileDownload(month, 'proposal', proposalFile.name, e)}
                              style={{ background: 'none', border: 'none', color: '#16a34a', padding: '3px', cursor: 'pointer', borderRadius: '4px' }}
                              title="다운로드"
                            >
                              <Download size={13} />
                            </button>
                            <button 
                              onClick={(e) => handleFileDelete(month, 'proposal', e)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', padding: '3px', cursor: 'pointer', borderRadius: '4px' }}
                              title="삭제"
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => document.getElementById(`file-input-${month}-proposal`)?.click()}
                          style={{
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.background = '#eff6ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#64748b';
                            e.currentTarget.style.background = '#f8fafc';
                          }}
                        >
                          <Plus size={14} /> 품의서 등록
                        </button>
                      )}
                    </div>

                    {/* 2. 회의록 Slot */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input 
                        type="file" 
                        id={`file-input-${month}-minutes`} 
                        style={{ display: 'none' }} 
                        onChange={(e) => handleFileUpload(month, 'minutes', e)}
                      />
                      {minutesFile ? (
                        <div 
                          onClick={() => setPreviewModalFile({ month, docType: 'minutes', file: minutesFile })}
                          style={{
                            background: '#f0fdf4', // light green accent indicating loaded file
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                          title="클릭하여 미리보기"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <FileCheck size={14} color="#15803d" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={minutesFile.name}>
                              회의록 완료
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button 
                              onClick={(e) => handleFileDownload(month, 'minutes', minutesFile.name, e)}
                              style={{ background: 'none', border: 'none', color: '#16a34a', padding: '3px', cursor: 'pointer', borderRadius: '4px' }}
                              title="다운로드"
                            >
                              <Download size={13} />
                            </button>
                            <button 
                              onClick={(e) => handleFileDelete(month, 'minutes', e)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', padding: '3px', cursor: 'pointer', borderRadius: '4px' }}
                              title="삭제"
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => document.getElementById(`file-input-${month}-minutes`)?.click()}
                          style={{
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            color: '#64748b',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.color = '#3b82f6';
                            e.currentTarget.style.background = '#eff6ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#64748b';
                            e.currentTarget.style.background = '#f8fafc';
                          }}
                        >
                          <Plus size={14} /> 회의록 등록
                        </button>
                      )}
                    </div>

                    {/* 3. 기타 첨부파일 Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        📎 기타 첨부파일
                      </label>
                      <input 
                        type="file" 
                        id={`file-input-${month}-etc`} 
                        style={{ display: 'none' }} 
                        onChange={(e) => handleFileUpload(month, 'etc', e)}
                      />
                      
                      {/* Uploaded ETC Files List */}
                      {(() => {
                        const etcKey = `${month}_etc`;
                        const etcFiles = archiveFiles[etcKey];
                        const fileList = Array.isArray(etcFiles) ? etcFiles : [];
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {fileList.map((f, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setPreviewModalFile({ month, docType: 'etc', file: f })}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                                title="클릭하여 미리보기"
                              >
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={f.name}>
                                  {f.name}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                  <button 
                                    onClick={(e) => handleFileDownload(month, 'etc', f.name, e)}
                                    style={{ background: 'none', border: 'none', color: '#475569', padding: '2px', cursor: 'pointer', borderRadius: '4px' }}
                                    title="다운로드"
                                  >
                                    <Download size={11} />
                                  </button>
                                  <button 
                                    onClick={(e) => handleFileDelete(month, 'etc', e, idx)}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', padding: '2px', cursor: 'pointer', borderRadius: '4px' }}
                                    title="삭제"
                                  >
                                    <XCircle size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Plus button to add more etc files, or to upload the first one */}
                            <button 
                              onClick={() => document.getElementById(`file-input-${month}-etc`)?.click()}
                              style={{
                                background: 'transparent',
                                border: '1px dashed #cbd5e1',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                color: '#64748b',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                transition: 'all 0.15s',
                                marginTop: fileList.length > 0 ? '2px' : '0'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.color = '#3b82f6';
                                e.currentTarget.style.background = '#eff6ff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = '#64748b';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Plus size={12} /> {fileList.length > 0 ? '파일 추가' : '파일 등록'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. PREVIEW MODAL */}
      {previewModalFile && (() => {
        const { month, docType, file } = previewModalFile;
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const isXlsx = file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setPreviewModalFile(null)}>
            
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{
                padding: '20px 28px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <span style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    flexShrink: 0
                  }}>
                    {month}월 {docType === 'proposal' ? '품의서' : docType === 'minutes' ? '회의록' : '기타 첨부파일'}
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                    {file.name}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <button 
                    onClick={() => handleFileDownload(month, docType, file.name)}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                  >
                    <Download size={15} /> 다운로드
                  </button>
                  <button 
                    onClick={() => setPreviewModalFile(null)}
                    style={{
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.color = '#334155';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#64748b';
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{
                padding: '24px',
                flex: 1,
                overflowY: 'auto',
                background: '#f1f5f9',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px'
              }}>
                {isImage ? (
                  <img 
                    src={file.data} 
                    alt={file.name} 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '60vh', 
                      objectFit: 'contain', 
                      borderRadius: '12px', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' 
                    }} 
                  />
                ) : isPdf ? (
                  <iframe 
                    src={file.data} 
                    title={file.name} 
                    style={{ 
                      width: '100%', 
                      height: '60vh', 
                      border: 'none', 
                      borderRadius: '12px', 
                      background: '#ffffff', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' 
                    }} 
                  />
                ) : (isDocx || isXlsx) ? (
                  <div style={{ width: '100%', minHeight: '500px', maxHeight: '70vh', background: '#ffffff', borderRadius: '12px', overflow: 'auto', border: '1px solid #cbd5e1', padding: '15px', display: 'flex', flexDirection: 'column' }}>
                    {previewLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '12px', flex: 1 }}>
                        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #cbd5e1', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>문서를 불러오는 중입니다...</span>
                      </div>
                    )}
                    {previewError && (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>{previewError}</p>
                      </div>
                    )}
                    <div id="preview-doc-container" style={{ display: previewLoading || previewError ? 'none' : 'block', width: '100%' }}></div>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    background: '#ffffff', 
                    padding: '48px 32px', 
                    borderRadius: '20px', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', 
                    maxWidth: '440px', 
                    width: '100%' 
                  }}>
                    <FileText size={56} color="#3b82f6" style={{ marginBottom: '16px', display: 'inline-block' }} />
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#0f172a', wordBreak: 'break-all', fontWeight: 800 }}>
                      {file.name}
                    </h4>
                    <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                      파일 크기: {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <div style={{ 
                      background: '#f8fafc', 
                      padding: '16px 20px', 
                      borderRadius: '16px', 
                      color: '#475569', 
                      fontSize: '0.82rem', 
                      lineHeight: '1.6', 
                      border: '1px solid #e2e8f0', 
                      marginBottom: '24px',
                      textAlign: 'left'
                    }}>
                      💡 <b>미지원 파일 형식</b> <br/><br/>
                      이 파일 형식은 브라우저 미리보기를 직접 지원하지 않습니다. 상단의 녹색 <b>[다운로드]</b> 버튼을 클릭하여 확인해 주세요.
                    </div>
                    <button
                      onClick={() => handleFileDownload(month, docType, file.name)}
                      style={{
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                      <Download size={16} /> 파일 다운로드 받기
                    </button>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div style={{
                padding: '16px 28px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#f8fafc'
              }}>
                <button
                  onClick={() => setPreviewModalFile(null)}
                  style={{
                    background: '#64748b',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#64748b'}
                >
                  닫기
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 8. ADD CHURCH MODAL */}
      {isAddChurchModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setIsAddChurchModalOpen(false)}>
          <div style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}
          onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              해외교회 추가
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
              등록된 해외교회 및 개척지 목록에서 추가할 대상을 선택해 주세요.
            </p>
            <select
              value={selectedChurchToAdd}
              onChange={e => setSelectedChurchToAdd(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem',
                fontWeight: 700,
                marginBottom: '20px'
              }}
            >
              <option value="">-- 해외교회 선택 --</option>
              {allChurches
                .filter(c => !editData.some(row => row.country === c.name))
                .map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))
              }
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsAddChurchModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (!selectedChurchToAdd) {
                    alert("교회를 선택해 주세요.");
                    return;
                  }
                  const months: Record<number, number | ''> = {};
                  for (let m = 1; m <= 12; m++) {
                    months[m] = '';
                  }
                  setEditData(prev => [...prev, { country: selectedChurchToAdd, months }]);
                  setIsAddChurchModalOpen(false);
                  setSelectedChurchToAdd("");
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
