type DisplayableUser = { name: string; nickname?: string | null };

// Nome de exibicao: usa o apelido quando definido; senao, o nome real.
export function getDisplayName(user: DisplayableUser | null | undefined): string {
  if (!user) return "";
  const nickname = user.nickname?.trim();
  return nickname && nickname.length > 0 ? nickname : user.name;
}
