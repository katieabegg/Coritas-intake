// Minimal Asana task creation over fetch (no SDK) — used to mirror new leads
// into an Asana board. Auth is a Personal Access Token passed as a Bearer header
// (stored as a Worker Secret, never committed). Entirely optional: the caller
// only invokes this when a token + project are configured.
// https://developers.asana.com/reference/createtask

const TASKS_URL = "https://app.asana.com/api/1.0/tasks";

export interface AsanaTaskInput {
  token: string;
  projectGid: string;
  /** Optional board column / section to drop the task into (e.g. "New"). */
  sectionGid?: string;
  name: string;
  notes: string;
}

interface AsanaResponse {
  data?: { gid?: string };
  errors?: Array<{ message?: string }>;
}

/** Create an Asana task. Returns the new task gid. Throws on API error. */
export async function createAsanaTask(input: AsanaTaskInput): Promise<string> {
  const placement = input.sectionGid
    ? { memberships: [{ project: input.projectGid, section: input.sectionGid }] }
    : { projects: [input.projectGid] };

  const res = await fetch(TASKS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      data: { name: input.name, notes: input.notes, ...placement },
    }),
  });

  const data = (await res.json()) as AsanaResponse;
  if (!res.ok) {
    throw new Error(
      `Asana ${res.status}: ${data.errors?.[0]?.message ?? "request failed"}`,
    );
  }
  return data.data?.gid ?? "";
}
