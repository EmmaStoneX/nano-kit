import { create } from 'zustand'
import { createUISlice, type UISlice } from './slices/uiSlice'
import { createProviderSlice, type ProviderSlice } from './slices/providerSlice'
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice'
import { createMessageSlice, type MessageSlice } from './slices/messageSlice'
import { createInputSlice, type InputSlice } from './slices/inputSlice'
import { createModalSlice, type ModalSlice } from './slices/modalSlice'
import { createAuthSlice, type AuthSlice } from './slices/authSlice'
import { createUsageSlice, type UsageSlice } from './slices/usageSlice'

export type AppState =
  UISlice &
  ProviderSlice &
  SessionSlice &
  MessageSlice &
  InputSlice &
  ModalSlice &
  AuthSlice &
  UsageSlice

export const useAppStore = create<AppState>()((...args) => ({
  ...createUISlice(...args),
  ...createProviderSlice(...args),
  ...createSessionSlice(...args),
  ...createMessageSlice(...args),
  ...createInputSlice(...args),
  ...createModalSlice(...args),
  ...createAuthSlice(...args),
  ...createUsageSlice(...args)
}))
