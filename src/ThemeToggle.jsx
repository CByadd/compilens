import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const KEY = 'compilens-theme'

// Light by default; dark only when the viewer picks it. The choice is remembered in this browser.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' } })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(KEY, theme) } catch { /* private mode */ }
  }, [theme])

  const dark = theme === 'dark'
  return (
    <button
      className="icon-btn theme-btn"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
