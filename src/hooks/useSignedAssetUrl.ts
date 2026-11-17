import { useQuery } from '@tanstack/react-query'
import { isSupabaseProvider } from '@/lib/config'
import { createSignedDownloadUrl } from '@/services/storage/upload'
import { needsSignedUrl, resolvePublicAssetUrl } from '@/services/storage/resolveUrl'

export function useResolvedAssetUrl(path?: string) {
  const publicUrl = resolvePublicAssetUrl(path)
  const signed = useQuery({
    queryKey: ['signed-asset', path],
    enabled: isSupabaseProvider() && !!path && needsSignedUrl(path),
    queryFn: () => createSignedDownloadUrl(path!, 300),
    staleTime: 240_000,
  })
  if (publicUrl) return { url: publicUrl, loading: false }
  if (!path || !needsSignedUrl(path)) return { url: path, loading: false }
  return { url: signed.data ?? undefined, loading: signed.isLoading }
}