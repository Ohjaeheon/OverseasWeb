import React, { useState, useEffect, useRef } from 'react';
import { adminService, ChurchItem } from '../../services/adminService';
import { diagnosisService } from '../../services/diagnosisService';
import { organizationService, OrgChartData, OrgCard, OrgColumn } from '../../services/organizationService';
import { Plus, Trash2, Edit2, Save, X, Upload, User, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export const OrganizationPage: React.FC = () => {
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedChurch, setSelectedChurch] = useState<ChurchItem | null>(null);
  const [chartData, setChartData] = useState<OrgChartData | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal Section Expand/Collapse State (Empty means all collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // File Upload Helper Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadCardId, setActiveUploadCardId] = useState<string | null>(null); // 'leader' or 'colId_cardId'

  // HaeSeonBu Headquarter dummy church metadata
  const haeseonbu: ChurchItem = {
    churchId: 0,
    name: '해선부',
    gubun: '부서',
    leaderName: '해외선교부장',
    continent: '본부',
    country: '한국',
    jipa: '본부',
    isActive: true
  };

  // Load Church List
  const loadChurches = async () => {
    setLoading(true);
    try {
      let data: ChurchItem[] = [];
      try {
        data = await adminService.getChurches();
      } catch (e) {
        data = await diagnosisService.getChurches();
      }
      setChurches(data || []);
    } catch (err) {
      console.error('Failed to load churches', err);
      setError('교회 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChurches();
  }, []);

  // Fetch Chart Data for Selected Church
  const handleOpenModal = async (church: ChurchItem) => {
    setSelectedChurch(church);
    setIsEditMode(false);
    setExpandedSections({}); // Reset all sections to collapsed by default
    setLoading(true);

    try {
      const res = await organizationService.getChart(church.churchId!);
      if (res && res.chartData) {
        try {
          const parsed = JSON.parse(res.chartData) as OrgChartData;
          setChartData(parsed);
        } catch (e) {
          setChartData(createDefaultChartData(church.leaderName || ''));
        }
        setUpdatedAt(res.updatedAt ? formatDateTime(res.updatedAt) : '기록 없음');
      } else {
        setChartData(createDefaultChartData(church.leaderName || ''));
        setUpdatedAt('신규 등록 필요');
      }
    } catch (err) {
      console.error('Failed to fetch org chart', err);
      setChartData(createDefaultChartData(church.leaderName || ''));
      setUpdatedAt('데이터 조회 실패 (기본 템플릿 로드)');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultChartData = (leaderName: string): OrgChartData => {
    return {
      leaderCard: {
        id: 'leader',
        role: '교회담임',
        name: leaderName || '담임 사역자',
        photo: ''
      },
      columns: [
        {
          id: 'col_default_1',
          title: '중진',
          cards: [
            { id: 'c1', role: '교회 총무', name: '홍길동', photo: '' },
            { id: 'c2', role: '신학부장', name: '이순신', photo: '' },
            { id: 'c3', role: '교육부장', name: '강감찬', photo: '' },
            { id: 'c4', role: '찬양부장', name: '을지문덕', photo: '' }
          ]
        },
        {
          id: 'col_default_2',
          title: '강사',
          cards: []
        }
      ]
    };
  };

  const handleCloseModal = () => {
    setSelectedChurch(null);
    setChartData(null);
    setIsEditMode(false);
  };

  // Image upload and resize (Base64 conversion)
  const handleTriggerUpload = (cardId: string) => {
    if (!isEditMode) return;
    setActiveUploadCardId(cardId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadCardId || !chartData) return;

    try {
      const base64 = await resizeImage(file);
      
      const newChart = { ...chartData };
      if (activeUploadCardId === 'leader') {
        newChart.leaderCard.photo = base64;
      } else {
        const [colId, cardId] = activeUploadCardId.split('__');
        newChart.columns = newChart.columns.map(col => {
          if (col.id === colId) {
            col.cards = col.cards.map(c => {
              if (c.id === cardId) {
                return { ...c, photo: base64 };
              }
              return c;
            });
          }
          return col;
        });
      }
      setChartData(newChart);
    } catch (err) {
      alert('이미지 파일 변환에 실패했습니다.');
      console.error(err);
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 180; // Crop profile photos to max 180x240 for crisp details
          const MAX_HEIGHT = 240;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality JPEG
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Image parsing failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  };

  // Section Management Functions (Add/Remove Hierarchy Section)
  const handleAddSection = () => {
    if (!chartData) return;
    const newColId = 'col_' + Date.now();
    const newChart: OrgChartData = {
      ...chartData,
      columns: [
        ...chartData.columns,
        {
          id: newColId,
          title: '새 하이라커 레벨',
          cards: []
        }
      ]
    };
    setChartData(newChart);
    // Auto expand newly added sections so users can immediately add cards
    setExpandedSections(prev => ({ ...prev, [newColId]: true }));
  };

  const handleRemoveSection = (colId: string) => {
    if (!chartData) return;
    if (!window.confirm('이 하이라커 열과 포함된 모든 직분 카드를 삭제하시겠습니까?')) return;
    const newChart: OrgChartData = {
      ...chartData,
      columns: chartData.columns.filter(c => c.id !== colId)
    };
    setChartData(newChart);
  };

  const handleUpdateSectionTitle = (colId: string, value: string) => {
    if (!chartData) return;
    const newChart = { ...chartData };
    newChart.columns = newChart.columns.map(c => {
      if (c.id === colId) {
        return { ...c, title: value };
      }
      return c;
    });
    setChartData(newChart);
  };

  // Card Management Functions
  const handleAddCard = (colId: string) => {
    if (!chartData) return;
    const newCardId = 'card_' + Date.now();
    const newChart = { ...chartData };
    newChart.columns = newChart.columns.map(col => {
      if (col.id === colId) {
        return {
          ...col,
          cards: [
            ...col.cards,
            {
              id: newCardId,
              role: '직분명',
              name: '성명',
              photo: ''
            }
          ]
        };
      }
      return col;
    });
    setChartData(newChart);
  };

  const handleRemoveCard = (colId: string, cardId: string) => {
    if (!chartData) return;
    const newChart = { ...chartData };
    newChart.columns = newChart.columns.map(col => {
      if (col.id === colId) {
        return {
          ...col,
          cards: col.cards.filter(c => c.id !== cardId)
        };
      }
      return col;
    });
    setChartData(newChart);
  };

  const handleUpdateCardField = (colId: string, cardId: string, field: 'role' | 'name', value: string) => {
    if (!chartData) return;
    const newChart = { ...chartData };
    newChart.columns = newChart.columns.map(col => {
      if (col.id === colId) {
        col.cards = col.cards.map(c => {
          if (c.id === cardId) {
            return { ...c, [field]: value };
          }
          return c;
        });
      }
      return col;
    });
    setChartData(newChart);
  };

  const handleUpdateLeaderField = (field: 'role' | 'name', value: string) => {
    if (!chartData) return;
    setChartData({
      ...chartData,
      leaderCard: {
        ...chartData.leaderCard,
        [field]: value
      }
    });
  };

  // Toggle Modal Section Expand/Collapse
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Save to DB
  const handleSaveChart = async () => {
    if (!selectedChurch || !chartData) return;
    setSaving(true);
    try {
      const jsonStr = JSON.stringify(chartData);
      const res = await organizationService.saveChart(selectedChurch.churchId!, jsonStr);
      setUpdatedAt(res.updatedAt ? formatDateTime(res.updatedAt) : formatDateTime(new Date().toISOString()));
      
      // 새로고침 없이 메인 조직도 트리의 담임 사역자명 등이 갱신되도록 교회 리스트 재조회
      await loadChurches();
      
      setIsEditMode(false);
      alert('조직도가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('조직도 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Helpers
  const formatDateTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}년 ${mm}월 ${dd}일 ${hh}:${min} 갱신`;
    } catch (e) {
      return isoString;
    }
  };

  // Group churches for Tree View (Image 1)
  const churchesByGubun = {
    교회: churches.filter(c => c.gubun === '교회' && c.isActive !== false),
    지역: churches.filter(c => c.gubun === '지역' && c.isActive !== false),
    개척지: churches.filter(c => c.gubun === '개척지' && c.isActive !== false)
  };

  return (
    <div className="org-container">
      {/* Premium CSS Styles */}
      <style>{`
        .org-container {
          font-family: 'Pretendard', 'Outfit', 'Inter', sans-serif;
          color: #1e293b;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #f1f5f9;
          min-height: 90vh;
        }

        .org-header {
          text-align: center;
          margin-bottom: 30px;
          max-width: 800px;
        }

        .org-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .org-subtitle {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Tree Structure Styles */
        .org-tree-card {
          width: 100%;
          max-width: 1000px;
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        /* Interactive Clickable Root Node */
        .org-tree-root-node {
          background: #0f172a;
          color: #f8fafc;
          font-size: 1.1rem;
          font-weight: 800;
          padding: 14px 40px;
          border-radius: 12px;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.2);
          z-index: 10;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .org-tree-root-node:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.3);
          background: #1e293b;
          border-color: #3b82f6;
        }

        /* Root-to-Columns Connector Lines */
        .org-root-branch-vertical {
          width: 2px;
          height: 25px;
          background: #cbd5e1;
          z-index: 1;
        }

        .org-root-branch-horizontal {
          height: 2px;
          background: #cbd5e1;
          width: 66%;
          z-index: 1;
        }

        /* Columns Grid Container */
        .org-columns-container {
          display: flex;
          justify-content: center;
          gap: 60px;
          width: 100%;
          margin-top: 0;
          z-index: 2;
        }

        /* Vertical Column Layout */
        .org-tree-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 240px;
          position: relative;
        }

        /* Line connecting horizontal branch to Column Header */
        .org-column-top-connector {
          width: 2px;
          height: 25px;
          background: #cbd5e1;
        }

        /* Column Headers (Fully Expanded as requested) */
        .org-column-header {
          width: 100%;
          padding: 12px 0;
          font-size: 1.05rem;
          font-weight: 800;
          text-align: center;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
          z-index: 5;
          margin-bottom: 20px;
        }

        /* Distinct Color Themes for Category Headers */
        .org-header-church {
          background: #fff7ed;
          color: #c2410c;
          border: 2px solid #fdba74;
        }
        .org-header-region {
          background: #f0fdf4;
          color: #15803d;
          border: 2px solid #86efac;
        }
        .org-header-pioneer {
          background: #e0e7ff;
          color: #4338ca;
          border: 2px solid #a5b4fc;
        }

        /* Vertical nodes list */
        .org-column-nodes {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 12px;
        }

        /* Node Box (Churches, Regions, Pioneers) */
        .org-node-card-box {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .org-node-card-box:hover {
          transform: translateY(-4px);
          border-color: #3b82f6;
          background: #f0f7ff;
          box-shadow: 0 12px 20px -8px rgba(59,130,246,0.25);
        }

        .org-node-leader-lbl {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Vertical Connector line between nodes in same column */
        .org-node-vertical-connector {
          width: 2px;
          height: 12px;
          background: #cbd5e1;
        }

        /* Large Modal Styling */
        .org-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .org-modal-container {
          background: white;
          width: 100%;
          max-width: 1100px;
          height: 92vh;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid #f1f5f9;
          overflow: hidden;
        }

        .org-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }

        .org-modal-title-area {
          display: flex;
          flex-direction: column;
        }

        .org-modal-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .org-modal-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 4px;
        }

        .org-modal-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* Main modal content body: Split layout */
        .org-modal-content {
          flex: 1;
          display: flex;
          padding: 24px;
          background: #f8fafc;
          overflow: hidden;
        }

        /* 1. Left FIXED Leader Card column (Image 2 left panel) */
        .org-modal-left-fixed {
          width: 200px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-right: 1px solid #cbd5e1;
          padding-right: 24px;
          height: 100%;
        }

        .org-left-badge-header {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 16px;
          background: #dbeafe;
          padding: 6px 14px;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          text-align: center;
          width: 100%;
        }

        /* 2. Right SCROLLABLE custom hierarchy layout */
        .org-modal-right-scroll {
          flex: 1;
          padding-left: 24px;
          overflow-y: auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Vertical Hierarchy Section Container */
        .org-section-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        /* Dark Blue title bar for each hierarchy level (Interactive toggle) */
        .org-section-title-bar {
          background: #104f70;
          color: white;
          padding: 10px 20px;
          font-size: 0.95rem;
          font-weight: 700;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 4px rgba(16, 79, 112, 0.15);
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }

        .org-section-title-bar:hover {
          background: #0d3e58;
        }

        .org-section-title-edit-area {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          max-width: 300px;
        }

        .org-section-title-input {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 2px 8px;
          background: white;
          width: 100%;
          outline: none;
        }

        /* Right side section actions */
        .org-section-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* FLEX-ROW-WRAP GRID FOR CARDS inside each section */
        .org-section-cards-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          width: 100%;
          padding-bottom: 8px;
          animation: slideDownSection 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideDownSection {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Profile Card */
        .org-profile-card {
          width: 170px;
          background: #f8fafc;
          border: 2px solid #e07a3c;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.03);
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          position: relative;
          flex-shrink: 0;
        }

        .org-profile-card:hover {
          box-shadow: 0 8px 16px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }

        /* Image viewport with aspect ratio 3:4 */
        .org-card-img-box {
          width: 100%;
          aspect-ratio: 3/4;
          background: #f1f5f9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          cursor: pointer;
        }

        .org-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .org-card-img-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
        }

        .org-card-img-placeholder span {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .org-card-img-edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .org-card-img-box:hover .org-card-img-edit-overlay {
          opacity: 1;
        }

        /* White inputs area at bottom of card */
        .org-card-content {
          padding: 10px;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .org-card-field-val {
          font-size: 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 8px;
          width: 100%;
          text-align: center;
          background: #f8fafc;
          font-weight: 700;
          color: #334155;
          outline: none;
        }

        /* Read mode values display */
        .org-card-read-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          text-align: center;
          border: 1px solid #e2e8f0;
          padding: 4px 0;
          border-radius: 6px;
          background: #fafafa;
        }

        .org-card-read-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
          border: 1px solid #e2e8f0;
          padding: 4px 0;
          border-radius: 6px;
          background: #ffffff;
        }

        /* Custom buttons styling */
        .org-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }

        .org-btn-primary {
          background: #2563eb;
          color: white;
        }
        .org-btn-primary:hover {
          background: #1d4ed8;
        }

        .org-btn-orange {
          background: #e07a3c;
          color: white;
          border-color: #b45309;
        }
        .org-btn-orange:hover {
          background: #d97706;
        }

        .org-btn-outline {
          background: white;
          border-color: #cbd5e1;
          color: #475569;
        }
        .org-btn-outline:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .org-btn-icon-bar {
          padding: 4px;
          border-radius: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: white;
          transition: all 0.15s;
        }
        .org-btn-icon-bar:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .org-card-delete {
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(239, 68, 68, 0.95);
          color: white;
          border: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        .org-card-delete:hover {
          background: #dc2626;
        }

        .org-section-empty {
          font-size: 0.8rem;
          color: #94a3b8;
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          width: 100%;
          text-align: center;
        }

        .org-adder-dashed-box {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #64748b;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          padding: 24px 0;
          width: 100%;
        }

        .org-adder-dashed-box:hover {
          border-color: #3b82f6;
          color: #2563eb;
          background: #f0f7ff;
        }
      `}</style>

      {/* Header section */}
      <div className="org-header">
        <h1 className="org-title">해외선교부 조직도</h1>
        <p className="org-subtitle">
          해외 교회/지역/개척지의 조직 체계를 한눈에 보고, 노드를 선택하여 상세 하이라커와 사역자를 등록 및 관리할 수 있습니다.
        </p>
      </div>

      {/* Main Tree structure Card */}
      {loading && churches.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 50 }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 600, color: '#64748b' }}>데이터 로딩 중...</span>
        </div>
      ) : error ? (
        <div className="org-section-empty" style={{ borderColor: '#fca5a5', background: 'white' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 12px auto' }} />
          <span style={{ color: '#dc2626', fontWeight: 600 }}>{error}</span>
          <button className="org-btn org-btn-outline" onClick={loadChurches} style={{ marginTop: 12 }}>다시 불러오기</button>
        </div>
      ) : (
        <div className="org-tree-card">
          {/* Centered Root Node - Clickable to edit HaeSeonBu's organization chart */}
          <div 
            className="org-tree-root-node" 
            onClick={() => handleOpenModal(haeseonbu)}
            title="해외선교부(본부) 조직도 보기/편집"
          >
            <span>🌳 해선부 (본부)</span>
          </div>

          {/* Connectors from root to sub-columns */}
          <div className="org-root-branch-vertical"></div>
          <div className="org-root-branch-horizontal"></div>

          {/* Three category columns layout - Fully expanded at all times */}
          <div className="org-columns-container">
            {/* Column 1: 교회 */}
            <div className="org-tree-column">
              <div className="org-column-top-connector"></div>
              <div className="org-column-header org-header-church">교회 ({churchesByGubun.교회.length})</div>
              
              <div className="org-column-nodes">
                {churchesByGubun.교회.map((ch, idx) => (
                  <React.Fragment key={ch.churchId}>
                    {idx > 0 && <div className="org-node-vertical-connector"></div>}
                    <div className="org-node-card-box" onClick={() => handleOpenModal(ch)}>
                      <div>{ch.name}</div>
                      <div className="org-node-leader-lbl">👤 {ch.leaderName || '담임 사역자'}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Column 2: 지역 */}
            <div className="org-tree-column">
              <div className="org-column-top-connector"></div>
              <div className="org-column-header org-header-region">지역 ({churchesByGubun.지역.length})</div>

              <div className="org-column-nodes">
                {churchesByGubun.지역.map((ch, idx) => (
                  <React.Fragment key={ch.churchId}>
                    {idx > 0 && <div className="org-node-vertical-connector"></div>}
                    <div className="org-node-card-box" onClick={() => handleOpenModal(ch)}>
                      <div>{ch.name}</div>
                      <div className="org-node-leader-lbl">👤 {ch.leaderName || '사역자'}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Column 3: 개척지 */}
            <div className="org-tree-column">
              <div className="org-column-top-connector"></div>
              <div className="org-column-header org-header-pioneer">개척지 ({churchesByGubun.개척지.length})</div>

              <div className="org-column-nodes">
                {churchesByGubun.개척지.map((ch, idx) => (
                  <React.Fragment key={ch.churchId}>
                    {idx > 0 && <div className="org-node-vertical-connector"></div>}
                    <div className="org-node-card-box" onClick={() => handleOpenModal(ch)}>
                      <div>{ch.name}</div>
                      <div className="org-node-leader-lbl">👤 {ch.leaderName || '사역자'}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Large Modal Pop-up */}
      {selectedChurch && chartData && (
        <div className="org-modal-overlay">
          <div className="org-modal-container">
            {/* Modal Header */}
            <div className="org-modal-header">
              <div className="org-modal-title-area">
                <div className="org-modal-title">
                  <span>🏢 {selectedChurch.name} 조직도</span>
                  <span style={{ fontSize: '0.75rem', background: '#e07a3c', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    {selectedChurch.gubun}
                  </span>
                </div>
                <div className="org-modal-subtitle">
                  최종 갱신일: {updatedAt}
                </div>
              </div>

              {/* Header Actions */}
              <div className="org-modal-actions">
                {isEditMode ? (
                  <>
                    <button className="org-btn org-btn-primary" onClick={handleSaveChart} disabled={saving}>
                      <Save size={16} />
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button className="org-btn org-btn-outline" onClick={() => setIsEditMode(false)} disabled={saving}>
                      <X size={16} />
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button className="org-btn org-btn-orange" onClick={() => setIsEditMode(true)}>
                      <Edit2 size={16} />
                      수정
                    </button>
                    <button className="org-btn org-btn-outline" onClick={handleCloseModal}>
                      닫기
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Hidden File Input for Card Photos */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />

            {/* Modal Content Split Layout */}
            <div className="org-modal-content">
              {/* 1. Left FIXED Leader Card column */}
              <div className="org-modal-left-fixed">
                <div className="org-left-badge-header">
                  {selectedChurch.churchId === 0 ? '해외선교부장 (고정)' : '교회담임 (좌측 고정)'}
                </div>
                <div className="org-profile-card">
                  <div className="org-card-img-box" onClick={() => handleTriggerUpload('leader')}>
                    {chartData.leaderCard.photo ? (
                      <img src={chartData.leaderCard.photo} alt="담임사역자" className="org-card-img" />
                    ) : (
                      <div className="org-card-img-placeholder">
                        <User size={36} />
                        <span>사진 없음</span>
                      </div>
                    )}
                    {isEditMode && (
                      <div className="org-card-img-edit-overlay">
                        <Upload size={18} />
                      </div>
                    )}
                  </div>
                  <div className="org-card-content">
                    <input
                      type="text"
                      className="org-card-field-val"
                      style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#475569' }}
                      value={chartData.leaderCard.role}
                      disabled
                      title="교회담임 역할은 고정되어 있습니다."
                    />
                    {isEditMode ? (
                      <input
                        type="text"
                        className="org-card-field-val"
                        placeholder="성명"
                        value={chartData.leaderCard.name}
                        onChange={(e) => handleUpdateLeaderField('name', e.target.value)}
                      />
                    ) : (
                      <div className="org-card-read-name">{chartData.leaderCard.name || '미지정'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Right SCROLLABLE custom hierarchy layout with Collapsible Sections */}
              <div className="org-modal-right-scroll">
                {chartData.columns.map(col => {
                  const isExpanded = !!expandedSections[col.id];
                  return (
                    <div key={col.id} className="org-section-container">
                      {/* Collapsible Blue Header Bar */}
                      <div 
                        className="org-section-title-bar" 
                        onClick={() => toggleSection(col.id)}
                        title={`${col.title} ${isExpanded ? '접기' : '펴기'}`}
                      >
                        {isEditMode ? (
                          <div 
                            className="org-section-title-edit-area"
                            onClick={(e) => e.stopPropagation()} // Prevent collapse while renaming
                          >
                            <input
                              type="text"
                              className="org-section-title-input"
                              value={col.title}
                              onChange={(e) => handleUpdateSectionTitle(col.id, e.target.value)}
                              placeholder="레벨 이름 (예: 중진, 강사)"
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{col.title} ({col.cards.length})</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        )}

                        <div className="org-section-actions" onClick={(e) => e.stopPropagation()}>
                          {isEditMode && (
                            <>
                              <button
                                className="org-btn-icon-bar"
                                onClick={() => {
                                  // Auto-expand section if adding card
                                  setExpandedSections(prev => ({ ...prev, [col.id]: true }));
                                  handleAddCard(col.id);
                                }}
                                title="이 섹션에 카드 추가"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <Plus size={14} /> 카드 추가
                              </button>
                              <button
                                className="org-btn-icon-bar"
                                onClick={() => handleRemoveSection(col.id)}
                                title="이 섹션 삭제"
                                style={{ color: '#fca5a5' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Horizontal wrap list of cards - Shown only if Expanded */}
                      {isExpanded && (
                        <div className="org-section-cards-grid">
                          {col.cards.length === 0 ? (
                            <div className="org-section-empty">
                              등록된 직분 카드가 없습니다. {isEditMode && '우측 상단의 "카드 추가" 버튼을 눌러 직원을 등록해보세요.'}
                            </div>
                          ) : (
                            col.cards.map(card => (
                              <div key={card.id} className="org-profile-card">
                                {isEditMode && (
                                  <button
                                    className="org-card-delete"
                                    onClick={() => handleRemoveCard(col.id, card.id)}
                                    title="이 카드 삭제"
                                  >
                                    <X size={12} />
                                  </button>
                                )}

                                <div className="org-card-img-box" onClick={() => handleTriggerUpload(`${col.id}__${card.id}`)}>
                                  {card.photo ? (
                                    <img src={card.photo} alt={card.name} className="org-card-img" />
                                  ) : (
                                    <div className="org-card-img-placeholder">
                                      <User size={32} />
                                      <span>사진 없음</span>
                                    </div>
                                  )}
                                  {isEditMode && (
                                    <div className="org-card-img-edit-overlay">
                                      <Upload size={16} />
                                    </div>
                                  )}
                                </div>

                                <div className="org-card-content">
                                  {isEditMode ? (
                                    <>
                                      <input
                                        type="text"
                                        className="org-card-field-val"
                                        placeholder="직분명"
                                        value={card.role}
                                        onChange={(e) => handleUpdateCardField(col.id, card.id, 'role', e.target.value)}
                                      />
                                      <input
                                        type="text"
                                        className="org-card-field-val"
                                        placeholder="성명"
                                        value={card.name}
                                        onChange={(e) => handleUpdateCardField(col.id, card.id, 'name', e.target.value)}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <div className="org-card-read-label">{card.role}</div>
                                      <div className="org-card-read-name">{card.name}</div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Edit Mode Add Section dashed box */}
                {isEditMode && (
                  <div className="org-adder-dashed-box" onClick={handleAddSection}>
                    <Layers size={20} />
                    <span>새 하이라커 레벨 (예: 중진, 강사, 전도사 등) 추가</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
