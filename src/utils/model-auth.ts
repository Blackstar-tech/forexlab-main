import { cookies } from "next/headers";
import { getSupabase, readLocalDb, useLocalDataStore } from "@/utils/server-db";

export interface ModelUser {
  id: string;
  name: string;
  email: string;
}

export async function getModelUser(): Promise<ModelUser | null> {
  const token = cookies().get("fj_session")?.value;
  if (!token) return null;

  if (useLocalDataStore) {
    const db = await readLocalDb();
    const session = db.sessions.find((entry) => entry.token === token);
    const user = session ? db.users.find((entry) => entry.id === session.userId) : null;
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  const { data: session, error } = await getSupabase()
    .from("sessions")
    .select("*, users(*)")
    .eq("token", token)
    .single();

  if (error || !session?.users) return null;
  return { id: session.users.id, name: session.users.name, email: session.users.email };
}
