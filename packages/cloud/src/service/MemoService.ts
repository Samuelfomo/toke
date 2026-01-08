import axiosClient from '@/tools/Fetch.Client';

const baseUrl = '/uploads';

export default class MemoService {
  // static async loadFiles(url: string): Promise<any> {
  //   try {
  //     return await apiRequest<any>({
  //       path: `${baseUrl}/?url=${url}`,
  //       method: 'GET',
  //     });
  //   } catch (error: any) {
  //     console.error('response error', error);
  //     return error;
  //   }
  // }

  static async loadFiles(url: string): Promise<Blob> {
    const response = await axiosClient.get(`${baseUrl}/`, {
      params: { url },
      responseType: 'blob', // 🔥 ESSENTIEL
    });

    return response.data; // ← Blob réel
  }
}