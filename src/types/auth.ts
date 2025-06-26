// src/types/auth.ts
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    registerSource?: string
    avatarType?: string
    twoFactorEnabled?: boolean
    phoneNumber?: string
    groupId?: string
    linkedEmails?: string[]
    linkedPhones?: any[]
    linkedProviders?: string[]
    hasLinkedAccounts?: boolean
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      registerSource?: string
      avatarType?: string
      twoFactorEnabled?: boolean
      groupId?: string
      hasLinkedAccounts?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    registerSource?: string
    avatarType?: string
    twoFactorEnabled?: boolean
    groupId?: string
    hasLinkedAccounts?: boolean
  }
}

export interface TwoFactorSetupResponse {
  success: boolean
  enabled: boolean
  secret?: string
  qrCode?: string
  manualEntryKey?: string
  backupCodes?: string[]
  hasBackupCodes?: boolean
  error?: string
}

export interface TwoFactorStatusResponse {
  success: boolean
  status: {
    enabled: boolean
    hasBackupCodes: boolean
    backupCodesCount: number
    setupInProgress: boolean
    lastEnabledAt?: Date
    lastDisabledAt?: Date
  }
  error?: string
}

export interface Check2FAResponse {
  success: boolean
  requires2FA: boolean
  exists: boolean
  hasPassword?: boolean
  requiresOAuth?: boolean
  provider?: string
  error?: string
}

export interface SignInCredentials {
  email: string
  password: string
  twoFactorCode?: string
}

export interface PhoneCredentials {
  phoneNumber: string
  code: string
}

export interface AuthActivityLog {
  event: string
  timestamp: Date
  ip: string
  userAgent: string
  details?: any
}

export interface UserSecuritySettings {
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  tempTwoFactorSecret?: string
  backupCodes?: string[]
  securityLog?: AuthActivityLog[]
}