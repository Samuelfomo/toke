import type { Component } from 'vue'

export interface PlanningMenuItem {
  id: string
  title: string
  description: string
  routeName: string
  icon: Component
  featured?: boolean
  badge?: string
}

export interface PlanningMenuGroup {
  id: string
  title: string
  description: string
  items: PlanningMenuItem[]
}
