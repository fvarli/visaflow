// Self-hosted variable fonts. Bundled with the app — no network request, so
// this stays compatible with the "no external calls" privacy rule.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'

// Initialises i18next before any component renders. Both locales are bundled
// locally, so this also makes no network request.
import '@/i18n'
import '@/i18n/types'

import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router/routes'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'

function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider delayDuration={200}>
            <RouterProvider router={router} />
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

export default App
