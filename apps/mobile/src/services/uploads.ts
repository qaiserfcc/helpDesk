import { apiClient } from "@/services/apiClient";

export type UploadFileInput = {
  uri: string;
  name: string;
  type: string;
};

export async function uploadFile(file: UploadFileInput): Promise<string> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const res = await apiClient.post<{ path: string }>("/uploads/file", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data.path;
}
