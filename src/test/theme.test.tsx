import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JSX } from 'react'

import {
  TEXT_SIZE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from '@/theme/theme'
import { ThemeToggle } from '@/components/theme-toggle'

function Probe(): JSX.Element {
  const { theme, textSize } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="text-size">{textSize}</span>
    </div>
  )
}

function renderWithProvider(ui: JSX.Element) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe('theme system', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-text-size')
  })

  afterEach(() => {
    cleanup()
  })

  it('defaults to light and applies it to the document', () => {
    renderWithProvider(<Probe />)
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('restores a stored theme on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'comfort')
    renderWithProvider(<Probe />)
    expect(screen.getByTestId('theme')).toHaveTextContent('comfort')
    expect(document.documentElement.getAttribute('data-theme')).toBe('comfort')
  })

  it('switches theme via the toggle and persists the choice', async () => {
    const user = userEvent.setup()
    renderWithProvider(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Dark mode' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Eye comfort mode' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('comfort')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('comfort')
  })

  it('marks the active mode with aria-pressed', async () => {
    const user = userEvent.setup()
    renderWithProvider(<ThemeToggle />)
    const dark = screen.getByRole('button', { name: 'Dark mode' })
    expect(dark).toHaveAttribute('aria-pressed', 'false')
    await user.click(dark)
    expect(dark).toHaveAttribute('aria-pressed', 'true')
  })

  it('persists and applies the text size', () => {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, 'large')
    renderWithProvider(<Probe />)
    expect(screen.getByTestId('text-size')).toHaveTextContent('large')
    expect(document.documentElement.getAttribute('data-text-size')).toBe('large')
  })
})
