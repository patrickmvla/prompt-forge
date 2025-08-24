import { create } from 'zustand'
import { api } from '@/lib/api'
import type { PromptBlueprint } from '@promptforge/shared'

interface ExecutionState {
  loading: boolean
  response: any | null
  error: string | null
  duration: number | null
  execute: (blueprint: PromptBlueprint, inputs: Record<string, any>) => Promise<void>
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  loading: false,
  response: null,
  error: null,
  duration: null,
  execute: async (blueprint, inputs) => {
    set({ loading: true, error: null, response: null, duration: null })
    try {
      const res = await api.execute.$post({ json: { blueprint, inputs } })
      
      if (!res.ok) {
        const errorData = await res.json()
        if ('message' in errorData && typeof errorData.message === 'string') {
          throw new Error(errorData.message)
        }
        throw new Error('An unknown error occurred')
      }
      const data = await res.json()
      set({ response: data.result, duration: data.duration, loading: false })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      set({ error: errorMessage, loading: false })
    }
  },
}))
