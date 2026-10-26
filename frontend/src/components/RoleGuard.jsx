export default function RoleGuard({ user, allow, children, fallback = null }) {
  return user && allow.includes(user.role) ? children : fallback;
}
