import { create } from 'zustand'

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
}

interface UiState {
  sidebarOpen: boolean
  confirm: ConfirmRequest | null
  setSidebarOpen: (open: boolean) => void
  askConfirm: (confirm: ConfirmRequest) => void
  closeConfirm: () => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  confirm: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  askConfirm: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
}))
