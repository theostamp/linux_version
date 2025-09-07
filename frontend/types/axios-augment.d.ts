// Type augmentation for Axios to support custom request config flags
import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig<D = any> {
    xToastSuppress?: boolean;
    xToastSuccess?: string;
    xToastError?: string;
  }
}



