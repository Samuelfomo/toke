import type { IUserMini, IPagination } from '../session_model/type'

// Un bloc de travail pour un jour donné
export interface IDayBlock {
    work: [string, string]        // ["08:00", "17:00"]
    pause: [string, string] | null
    tolerance: number
}

// Définition complète : clé = jour (Mon/Tue/...), valeur = blocs | [] | null
export type IDefinition = {
    [day: string]: IDayBlock[] | [] | null
}

export interface ISessionTemplate {
    guid: string
    name: string
    description: string | null
    session_model: SessionModel        // guid de la norme
    definition: IDefinition
    for_rotation: boolean
    default: boolean
    current: boolean
    is_current: boolean
    created_by: IUserMini
    created_at: string
    updated_at: string
}

export interface ISessionTemplateCollection {
    pagination: IPagination
    items: ISessionTemplate[]
}

export interface ISessionTemplateResponseData {
    session_templates: ISessionTemplateCollection
}

export interface SessionModel { guid: string, name: string }