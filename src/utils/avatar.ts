function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

export function getAvatarInitials(email: string): string {
  const letters = email.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 2) || '?';
}

export function getAvatarColor(email: string): string {
  const hue = Math.abs(hashString(email)) % 360;
  return `hsl(${hue}, 45%, 45%)`;
}
