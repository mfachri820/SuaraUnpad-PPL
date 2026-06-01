import Cookies from "js-cookie";

const getAuthHeaders = () => {
  const token = Cookies.get("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const fetchPolicies = async (status?: string) => {
  const url = status ? `/api/policies?status=${status}` : "/api/policies";
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Gagal mengambil kebijakan");
  const result = await res.json();
  return result.data;
};

export const fetchPolicyDetail = async (id: string) => {
  const res = await fetch(`/api/policies/${id}`, {
    headers: getAuthHeaders(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Gagal mengambil detail kebijakan");
  const result = await res.json();
  return result.data;
};

export const createPolicy = async (title: string, content: string) => {
  const res = await fetch("/api/policies", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, content })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Gagal membuat kebijakan");
  return result.data;
};

export const updatePolicyStatus = async (
  id: string,
  status: "DRAFT" | "ACTIVE" | "CLOSED"
) => {
  const res = await fetch(`/api/policies/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Gagal memperbarui status kebijakan");
  return result.data;
};

export const submitVotePolicy = async (
  id: string,
  choice: "AGREE" | "DISAGREE"
) => {
  const res = await fetch(`/api/policies/${id}/vote`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ choice })
  });
  if (!res.ok) throw new Error("Gagal memberikan vote");
  return await res.json();
};

export const removeVotePolicy = async (id: string) => {
  const res = await fetch(`/api/policies/${id}/vote`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Gagal mencabut vote");
  return await res.json();
};
