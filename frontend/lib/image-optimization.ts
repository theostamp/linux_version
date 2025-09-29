// Image optimization utilities for kiosk application

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  placeholder?: boolean;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
}

// Generate optimized image URL
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!src) return '';
  
  // If it's already an external URL, return as is
  if (src.startsWith('http') || src.startsWith('data:')) {
    return src;
  }

  // Default options
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'webp',
    placeholder = false
  } = options;

  // For local images, we can use Next.js Image Optimization
  if (src.startsWith('/')) {
    const params = new URLSearchParams({
      w: width.toString(),
      h: height.toString(),
      q: quality.toString(),
      f: format
    });

    if (placeholder) {
      params.set('blur', '1');
    }

    return `${src}?${params.toString()}`;
  }

  return src;
}

// Generate placeholder image
export function generatePlaceholder(width: number, height: number): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
        Loading...
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Lazy loading image component
export function createOptimizedImageProps(
  src: string,
  alt: string,
  options: ImageOptimizationOptions & {
    className?: string;
    loading?: 'lazy' | 'eager';
  } = {}
): OptimizedImageProps {
  const {
    className,
    loading = 'lazy',
    placeholder = true,
    ...optimizationOptions
  } = options;

  const optimizedSrc = getOptimizedImageUrl(src, optimizationOptions);
  const placeholderSrc = placeholder ? generatePlaceholder(
    optimizationOptions.width || 800,
    optimizationOptions.height || 600
  ) : undefined;

  return {
    src: optimizedSrc,
    alt,
    width: optimizationOptions.width,
    height: optimizationOptions.height,
    className,
    loading,
    placeholder: placeholderSrc
  };
}

// Preload critical images
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Batch preload images
export async function preloadImages(srcs: string[]): Promise<void[]> {
  const promises = srcs.map(src => preloadImage(src));
  return Promise.all(promises);
}

// Image compression utility (for canvas-based compression)
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

// Check if image format is supported
export function isWebPSupported(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Get best image format based on browser support
export function getBestImageFormat(): 'webp' | 'jpeg' | 'png' {
  if (isWebPSupported()) {
    return 'webp';
  }
  return 'jpeg';
}

// Responsive image srcset generator
export function generateSrcSet(
  baseSrc: string,
  sizes: number[] = [320, 640, 1024, 1920]
): string {
  return sizes
    .map(size => `${getOptimizedImageUrl(baseSrc, { width: size })} ${size}w`)
    .join(', ');
}

// Responsive image sizes attribute
export function generateSizes(
  breakpoints: { [key: string]: string } = {
    '(max-width: 640px)': '100vw',
    '(max-width: 1024px)': '50vw',
    '(min-width: 1025px)': '33vw'
  }
): string {
  return Object.entries(breakpoints)
    .map(([condition, size]) => `${condition} ${size}`)
    .join(', ');
}

// Image optimization for kiosk banners
export function optimizeKioskBanner(src: string): string {
  return getOptimizedImageUrl(src, {
    width: 1200,
    height: 400,
    quality: 85,
    format: getBestImageFormat()
  });
}

// Image optimization for widget icons
export function optimizeWidgetIcon(src: string): string {
  return getOptimizedImageUrl(src, {
    width: 64,
    height: 64,
    quality: 90,
    format: getBestImageFormat()
  });
}

// Image optimization for profile pictures
export function optimizeProfilePicture(src: string): string {
  return getOptimizedImageUrl(src, {
    width: 200,
    height: 200,
    quality: 85,
    format: getBestImageFormat()
  });
}
