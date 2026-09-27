/**
 * Auth entity boundary.
 *
 * New application code should consume auth state from this module. The
 * existing store remains the implementation for now so the migration can be
 * incremental without changing the API client contract.
 */
export { useAuthStore } from '@/stores/authStore';
export type { User, Permission, Role } from '@de/web-types';
