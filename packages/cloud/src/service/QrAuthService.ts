import axios from 'axios'
import { io } from 'socket.io-client'

export interface QrAuthSession {
  sessionId: string
  qr_data: string
  expiresIn: number
}

export interface QrAuthSocketHandlers {
  authenticated: () => void
  rejected: () => void
  expired: () => void
  connectError?: (error: Error) => void
}

interface QrInitResponse {
  success: boolean
  data?: QrAuthSession
  message?: string
}

const DEFAULT_QR_AUTH_ORIGIN = 'https://my.toke.cm'

/**
 * Service dédié à l'authentification QR.
 *
 * La vue ne connaît aucune URL ni configuration Socket.IO.
 * Par défaut, le QR utilise l'infrastructure publique Toké historique.
 * VITE_QR_AUTH_ORIGIN permet uniquement de surcharger cette origine si besoin.
 */
export default class QrAuthService {
  private static getOrigin(): string {
    const configuredOrigin = String(import.meta.env.VITE_QR_AUTH_ORIGIN || '').trim()
    return (configuredOrigin || DEFAULT_QR_AUTH_ORIGIN).replace(/\/$/, '')
  }

  static async initSession(): Promise<QrAuthSession> {
    const origin = this.getOrigin()

    const { data } = await axios.get<QrInitResponse>(
      `${origin}/local/auth/qr/init`,
    )

    if (!data?.success || !data.data?.sessionId || !data.data?.qr_data) {
      throw new Error(data?.message || 'Impossible d’initialiser la connexion QR.')
    }

    return data.data
  }

  static connect(sessionId: string, handlers: QrAuthSocketHandlers): () => void {
    const origin = this.getOrigin()

    const socket = io(`${origin}/qr-auth`, {
      path: '/local/socket.io',
      transports: ['websocket', 'polling'],
      query: { sessionId },
    })

    socket.on('authenticated', handlers.authenticated)
    socket.on('rejected', handlers.rejected)
    socket.on('expired', handlers.expired)
    socket.on('connect_error', (error: Error) => {
      handlers.connectError?.(error)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }
}
