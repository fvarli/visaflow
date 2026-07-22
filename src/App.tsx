// Self-hosted variable fonts. Bundled with the app — no network request, so
// this stays compatible with the "no external calls" privacy rule.
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'

import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router/routes'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <DossierProvider>
        <TooltipProvider delayDuration={200}>
          <RouterProvider router={router} />
        </TooltipProvider>
      </DossierProvider>
    </ThemeProvider>
  )
}

export default App
