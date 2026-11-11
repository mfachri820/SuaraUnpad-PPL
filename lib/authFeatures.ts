// Login email + password hanya untuk development lokal & test otomatis (akun hasil seeder).
// Di staging/production biarkan PASSWORD_LOGIN_ENABLED kosong: login lewat PAuS.
export function isPasswordLoginEnabled() {
  return process.env.PASSWORD_LOGIN_ENABLED === 'true';
}
