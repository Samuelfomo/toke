export interface NavItem {
    id: string
    label: string
    sublabel: string
    icon: string
    routeName: string
    group: string
}

export interface NavGroup {
    id: string
    label: string
    items: NavItem[]
}