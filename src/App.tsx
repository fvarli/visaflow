import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router/routes'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'

function App() {
  return (
    <DossierProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </DossierProvider>
  )
}

export default App
