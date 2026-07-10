const PASSWORD_MIN_LENGTH = 8;

export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /\p{Ll}/u.test(password) &&
    /\p{Lu}/u.test(password) &&
    /\p{N}/u.test(password)
  );
}
