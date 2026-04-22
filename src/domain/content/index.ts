// domain/content/index.ts — Pure business logic for content management
import type { Result } from '@/lib/result';
import { ok, err } from '@/lib/result';

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

/**
 * Validate a PDF file upload.
 * Max 50 MB, must be a PDF.
 */
export function validatePdfUpload(file: {
  size: number;
  type: string;
}): Result<void> {
  if (!file) {
    return err('لم يتم رفع أي ملف');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return err('يجب أن يكون الملف بصيغة PDF فقط');
  }

  if (file.size <= 0) {
    return err('الملف فارغ');
  }

  if (file.size > MAX_PDF_SIZE) {
    const maxMB = MAX_PDF_SIZE / (1024 * 1024);
    return err(`حجم الملف يتجاوز الحد المسموح (${maxMB} ميجابايت)`);
  }

  return ok(undefined);
}

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
