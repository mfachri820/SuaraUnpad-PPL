import Cookies from "js-cookie";

const getAuthHeaders = () => {
  const token = Cookies.get("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const fetchComments = async (
  postId?: string,
  policyId?: string
) => {
  if (!postId && !policyId) {
    throw new Error("postId atau policyId wajib diisi untuk mengambil komentar");
  }

  const params = new URLSearchParams();
  if (postId) params.append("postId", postId);
  if (policyId) params.append("policyId", policyId);
  params.append("limit", "50");

  const res = await fetch(`/api/comments?${params.toString()}`, {
    headers: getAuthHeaders(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Gagal mengambil komentar");
  const result = await res.json();
  return result.data.data; // Backend mengembalikan { data: { data: [...], meta: {...} } }
};

export const createComment = async (
  content: string,
  postId?: string,
  policyId?: string,
  parentId?: string
) => {
  const payload = { content, postId, policyId, parentId };
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Gagal mengirim komentar");
  return await res.json();
};

export const updateComment = async (id: string, content: string) => {
  const res = await fetch(`/api/comments/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error("Gagal mengedit komentar");
  return await res.json();
};

export const deleteComment = async (id: string) => {
  const res = await fetch(`/api/comments/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Gagal menghapus komentar");
  return await res.json();
};

export const toggleUpvoteComment = async (id: string) => {
  const res = await fetch(`/api/comments/${id}/upvote`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Gagal melakukan upvote");
  return await res.json();
};
