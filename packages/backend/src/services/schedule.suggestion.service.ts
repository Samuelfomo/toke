import { getApiClient } from '../tools/api.factory.js';

const BASE = '/schedule-suggestion';

export class ScheduleSuggestionService {
  static async generate(reference: string, managerGuid: string, payload: any) {
    try {
      const api = await getApiClient(reference);
      return await api.post(`${BASE}/${managerGuid}/generate`, payload);
    } catch (error: any) {
      return error.response;
    }
  }

  static async list(reference: string, managerGuid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.get(`${BASE}/${managerGuid}/list`);
    } catch (error: any) {
      return error.response;
    }
  }

  static async load(reference: string, guid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.get(`${BASE}/${guid}`);
    } catch (error: any) {
      return error.response;
    }
  }

  static async patchItem(reference: string, guid: string, itemGuid: string, payload: any) {
    try {
      const api = await getApiClient(reference);
      return await api.patch(`${BASE}/${guid}/item/${itemGuid}`, payload);
    } catch (error: any) {
      return error.response;
    }
  }

  static async approve(reference: string, guid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.post(`${BASE}/${guid}/approve`);
    } catch (error: any) {
      return error.response;
    }
  }

  static async reject(reference: string, guid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.post(`${BASE}/${guid}/reject`);
    } catch (error: any) {
      return error.response;
    }
  }

  static async remove(reference: string, guid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.delete(`${BASE}/${guid}`);
    } catch (error: any) {
      return error.response;
    }
  }

  static async removeItem(reference: string, guid: string, itemGuid: string) {
    try {
      const api = await getApiClient(reference);
      return await api.delete(`${BASE}/${guid}/item/${itemGuid}`);
    } catch (error: any) {
      return error.response;
    }
  }
}
