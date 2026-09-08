import { httpClient } from "./ApiService";
import { getCompleteUrlV1 } from "../utils";
import { IndustryTypeResponse, IndustryType } from "../types";

export interface GetIndustryTypesParams {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
  sort?: string;
  sortOrder?: number;
}

export interface CreateIndustryTypePayload {
  name: string;
  description?: string;
  status: "active" | "inactive";
}

export interface UpdateIndustryTypePayload {
  _id: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
}

export class IndustryTypeService {
  static async getIndustryTypes(
    params: GetIndustryTypesParams = {}
  ): Promise<IndustryTypeResponse> {
    const cleanParams: Record<string, string | number> = {};
    if (params.limit !== undefined) cleanParams.limit = params.limit;
    if (params.page !== undefined) cleanParams.page = params.page;
    if (params.search && params.search.trim() !== "") cleanParams.search = params.search.trim();
    if (params.status && params.status !== "all") cleanParams.status = params.status;
    if (params.sort) cleanParams.sort = params.sort;
    if (params.sortOrder !== undefined) cleanParams.sortOrder = params.sortOrder;

    const url = getCompleteUrlV1("industry-type", cleanParams);
    const response = await httpClient.get(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to fetch industry types");
    }
    return response.json();
  }

  static async createIndustryType(
    payload: CreateIndustryTypePayload
  ): Promise<{ type: string; message: string; data?: IndustryType }> {
    const url = getCompleteUrlV1("industry-type");
    const response = await httpClient.post(url, {
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : "",
      status: payload.status,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to create industry type");
    }
    return data;
  }

  static async updateIndustryType(
    payload: UpdateIndustryTypePayload
  ): Promise<{ type: string; message: string; data?: IndustryType }> {
    const url = getCompleteUrlV1("industry-type");
    const response = await httpClient.put(url, {
      _id: payload._id,
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : "",
      status: payload.status,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to update industry type");
    }
    return data;
  }

  static async deleteIndustryType(
    id: string
  ): Promise<{ type: string; message: string }> {
    const url = getCompleteUrlV1(`industry-type/${id}`);
    const response = await httpClient.delete(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to delete industry type");
    }
    return data;
  }
}
