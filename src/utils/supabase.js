// Supabase removed. Mobile is an employee-only PIN app on the shared Neon
// backend (app.worktracksmb.com/api/*) — there is no email/SSO login here, so
// there is nothing for Supabase to do. AuthContext's email/Google paths are
// guarded by `if (supabase)` and become no-ops with this null export.
export const supabase = null
