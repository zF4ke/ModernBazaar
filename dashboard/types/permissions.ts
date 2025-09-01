import { Permission } from '@/constants/permissions'

export interface UserPermissions {
  permissions: Permission[]
  subscriptionTier: string
  expiresAt: string | null
}

export interface PermissionsResponse {
  permissions: UserPermissions
}

export interface PermissionCheckResult {
  hasPermission: boolean
  hasAdminAccess: boolean
  loading: boolean
  error: string | null
  checkPermission: () => Promise<void>
}
