const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function formatImageSizeLimit() {
  return `${Math.round(MAX_IMAGE_FILE_SIZE_BYTES / 1024 / 1024)}MB`;
}

export function validateImageBlob(blob: Blob) {
  if (blob.size <= 0) {
    return { ok: false as const, error: "Image file is empty" };
  }

  if (blob.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return {
      ok: false as const,
      error: `Image file cannot exceed ${formatImageSizeLimit()}`,
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(blob.type)) {
    return {
      ok: false as const,
      error: "Image must be a JPG/JPEG, PNG, WebP, or GIF file",
    };
  }

  return { ok: true as const };
}

export function imageValidationMessage(
  error: string,
  language: "en" | "zh" = "zh",
) {
  if (error === "Image file is empty") {
    return language === "en" ? error : "图片文件为空";
  }

  if (error.startsWith("Image file cannot exceed")) {
    return language === "en" ? error : `图片不能超过 ${formatImageSizeLimit()}`;
  }

  return language === "en" ? error : "请选择 JPG/JPEG、PNG、WebP 或 GIF 图片";
}
