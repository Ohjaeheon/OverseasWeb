import flagImagesJson from './flagImages.json';

// ISO 3166-1 alpha-2 코드 → base64 PNG data URL (오프라인 내장 국기 이미지).
// Ported 1:1 from diagnosisEngine.js window.FLAGIMG.
export const FLAG_IMAGES: Record<string, string> = flagImagesJson as Record<string, string>;
