import { createElement } from 'react'
import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { DEFAULT_CALCULATOR_PATH } from '@/features/calculations/registry'
import { tabs } from '@/navigation/tabs'
import { AppShell } from './shell/AppShell'

const childRoutes = tabs.flatMap((tab) => [
  {
    path: tab.path.replace(/^\//, ''),
    element: <Navigate to={tab.subtabs[0]?.path ?? tab.path} replace />,
  },
  ...tab.subtabs.map((subtab) => ({
    path: subtab.path.replace(/^\//, ''),
    element: createElement(subtab.element),
  })),
])

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={DEFAULT_CALCULATOR_PATH} replace /> },
      ...childRoutes,
      { path: '*', element: <Navigate to={DEFAULT_CALCULATOR_PATH} replace /> },
    ],
  },
]

export const router = createHashRouter(routes)
