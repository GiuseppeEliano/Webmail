import { useQuery } from "@tanstack/react-query";
import { SYSTEM_FOLDERS } from "@/lib/system-folders";
import type { Folder } from "@shared/schema";

export function useFolders(userId: number) {
  // Fetch custom folders from database
  const { data: customFolders = [], isLoading } = useQuery<Folder[]>({
    queryKey: [`/api/folders/${userId}`],
    enabled: !!userId,
  });

  // Convert system folders to Folder type for compatibility
  const systemFolders: Folder[] = SYSTEM_FOLDERS.map(systemFolder => ({
    id: systemFolder.id,
    userId: userId,
    name: systemFolder.name,
    type: 'system' as const,
    systemType: systemFolder.type,
    color: systemFolder.color,
    icon: systemFolder.type,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  // Combine system and custom folders
  const allFolders = [...systemFolders, ...customFolders];

  return {
    folders: allFolders,
    customFolders,
    systemFolders: SYSTEM_FOLDERS,
    isLoading
  };
}