import { createRoot } from 'react-dom/client'
import Page from '@/app/page'
import { Toaster } from '@/components/ui/sonner'

document.documentElement.classList.add('dark')
document.body.classList.add('antialiased', 'min-h-screen', 'flex', 'flex-col')
const el = document.getElementById('root')!
el.style.display = 'contents'
createRoot(el).render(
  <>
    <Page />
    <Toaster position="top-center" theme="dark" />
  </>
)
