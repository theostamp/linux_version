declare module 'react-hot-toast';
declare module 'react-hot-toast' {
  interface ToastOptions {
    id?: string;
    duration?: number;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    style?: React.CSSProperties;
    className?: string;
    closeButton?: boolean;
    closeOnClick?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
  }
}
declare module 'react-hot-toast/dist/react-hot-toast.esm' {
  export function toast(
    message: string,
    options?: ToastOptions
  ): string;
  export function dismiss(id?: string): void;
  export function remove(id: string): void;
  export function success(message: string, options?: ToastOptions): string;
  export function error(message: string, options?: ToastOptions): string;
  export function loading(message: string, options?: ToastOptions): string;
  export function promise(
    promise: Promise<any>,
    options?: ToastOptions
  ): Promise<any>;
  export function clearWaitingQueue(): void;
export function onPositionChange(callback: (position: string) => void): void;
}
