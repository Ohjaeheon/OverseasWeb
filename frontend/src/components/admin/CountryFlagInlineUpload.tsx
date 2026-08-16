import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { countryFlagService } from '../../services/countryFlagService';
import { resizeImageFileToDataUrl } from '../../utils/imageResize';
import { useCountryFlags } from '../../contexts/CountryFlagContext';

/** 교회 등록/수정 폼의 국가명 옆에 붙는 국기 이미지 업로드 컨트롤. 국가 단위로 저장되며,
 * 같은 국가를 쓰는 다른 교회에도 함께 적용된다(홈 화면 "해외선교부 현황판" 등에서 우선 표시). */
export const CountryFlagInlineUpload: React.FC<{ country: string }> = ({ country }) => {
  const { getFlag, hasCustom, refetch } = useCountryFlags();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trimmed = country.trim();
  const src = trimmed ? getFlag(trimmed) : null;
  const isCustom = hasCustom(trimmed);

  const handleFileChange = async (file: File | undefined) => {
    if (!file || !trimmed) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImageFileToDataUrl(file);
      await countryFlagService.upload(trimmed, dataUrl);
      refetch();
    } catch (e: any) {
      alert('국기 이미지 업로드에 실패했습니다: ' + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!trimmed) return;
    if (!confirm(`${trimmed} 국기를 기본 이미지로 되돌릴까요?`)) return;
    try {
      await countryFlagService.remove(trimmed);
      refetch();
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
        국기 이미지 {!trimmed && <span style={{ color: '#94a3b8', fontWeight: 500 }}>(국가명을 먼저 입력하세요)</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px' }}>
        {src
          ? <img src={src} alt={trimmed} style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 3, border: '1px solid #e2e8f0' }} />
          : <div style={{ width: 36, height: 24, background: '#eef2f7', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🏳️</div>}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!trimmed || uploading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
            background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', cursor: trimmed ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem', fontWeight: 700, opacity: trimmed ? 1 : 0.6,
          }}
        >
          <Upload size={13} /> {uploading ? '업로드 중...' : '이미지 업로드'}
        </button>

        {isCustom && (
          <button
            type="button"
            onClick={handleRemove}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6,
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
            }}
          >
            <X size={13} /> 기본값으로
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      </div>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
        같은 국가명을 쓰는 다른 교회/지역에도 함께 적용됩니다.
      </div>
    </div>
  );
};
