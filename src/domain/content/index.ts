// domain/content/index.ts — Pure business logic for content management
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';

const DEFAULT_MAX_SIZE_MB = 200; // 200 MB default — configurable via admin settings (MAX_FILE_SIZE_MB)
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

/**
 * Validate a file upload (PDF or image).
 * Max size configurable via admin settings, default 200 MB.
 */
export function validateFileUpload(file: {
  size: number;
  type: string;
}, maxSizeMB: number = DEFAULT_MAX_SIZE_MB): Result<void> {
  if (!file) {
    return err('لم يتم رفع أي ملف');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return err('صيغة الملف غير مدعومة. الصيغ المدعومة: PDF, PNG, JPG, WEBP');
  }

  if (file.size <= 0) {
    return err('الملف فارغ');
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return err(`حجم الملف يتجاوز الحد المسموح (${maxSizeMB} ميجابايت)`);
  }

  return ok(undefined);
}

// Backward compatible alias
export const validatePdfUpload = validateFileUpload;

/**
 * Build watermark data for PDF downloads to prevent sharing.
 */
export function buildWatermarkData(user: {
  name: string;
  phone: string;
}): {
  name: string;
  phone: string;
  date: string;
  platform: string;
} {
  return {
    name: user.name,
    phone: maskPhone(user.phone),
    date: new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    platform: 'منهج AI',
  };
}

/**
 * Mask a phone number for privacy: show first 3 and last 2 digits.
 * e.g. 01012345678 → 010*****78
 */
function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 2);
  const middle = '*'.repeat(phone.length - 5);
  return `${start}${middle}${end}`;
}
