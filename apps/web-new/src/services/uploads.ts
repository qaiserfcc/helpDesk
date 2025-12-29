import { apiClient } from "@/services/apiClient";

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiClient.post("/uploads/file", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data.path as string;
}
