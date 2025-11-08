import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Mimic',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/mimic_logo.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/mimic_logo.png',
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/app', replace: true })
  }, [navigate])

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-dark">
      <div className="text-white">Redirecting...</div>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
