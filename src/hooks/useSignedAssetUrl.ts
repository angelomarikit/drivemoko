import { useQuery } from '@tanstack/react-query'
import { isSupabaseProvider } from '@/lib/config'
import { parseStorageObjectPath } from '@/services/storage/paths'
import { createSignedDownloadUrl } from '@/services/storage/upload'
import { needsSignedUrl, resolvePublicAssetUrl } from '@/services/storage/resolveUrl'

export function useResolvedAssetUrl(path?: string) {
  const publicUrl = resolvePublicAssetUrl(path)
  const wantsSigned = isSupabaseProvider() && !!path && needsSignedUrl(path)
  const signed = useQuery({
    queryKey: ['signed-asset', path],
    enabled: wantsSigned,
    queryFn: () => createSignedDownloadUrl(path!, 300),
    staleTime: 240_000,
    retry: 1,
  })
  if (publicUrl) return { url: publicUrl, loading: false }
  if (!path) return { url: undefined, loading: false }
  if (wantsSigned) {
    return { url: signed.data ?? undefined, loading: signed.isLoading, error: signed.error }
  }
  if (parseStorageObjectPath(path)) {
    return { url: undefined, loading: false, error: new Error('Invalid storage path') }
  }
  return { url: path, loading: false }
}