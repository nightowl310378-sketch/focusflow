import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (!('randomUUID' in crypto)) {
  ;(crypto as any).randomUUID = vi.fn(() =>
    'test-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    }),
  )
}
