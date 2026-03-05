export async function validateGitHubToken(token: string): Promise<{ email: string } | null> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const user = (await res.json()) as { email?: string | null };
  if (typeof user.email === "string") return { email: user.email };

  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!emailsRes.ok) return null;

  const emails = (await emailsRes.json()) as Array<{
    email?: string;
    primary?: boolean;
  }>;
  const primary = emails.find((e) => e.primary);
  if (primary && typeof primary.email === "string") return { email: primary.email };

  return null;
}
