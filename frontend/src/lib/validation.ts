const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File, maxMb: number = 10): ValidationResult {
  if (!file) {
    return { valid: false, error: 'Please select an image file.' };
  }

  // Check file size
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `The image is larger than ${maxMb} MB. Please upload a smaller image.`,
    };
  }

  // Check extension
  const parts = file.name.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : '';
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.',
    };
  }

  // Check MIME if present
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type) && file.type !== 'application/octet-stream') {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.',
    };
  }

  return { valid: true };
}
