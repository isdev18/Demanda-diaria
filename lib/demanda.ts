export type Status =
  | "Pendente"
  | "Em andamento"
  | "Concluída"
  | "Não realizada"
  | "Atrasada";

export type Attachment = { id: string; url: string; name: string };

export type Activity = {
  id: string;
  title: string;
  description: string;
  why: string;
  priority: string;
  date: string;
  time: string;
  location: string;
  equipment: string;
  sector: string;
  well: string;
  employee: string;
  team: string;
  shift: string;
  status: Status;
  note: string;
  reason: string;
  createdAt: string;
  completedAt: string;
  justificationAt: string;
  attachments: Attachment[];
};

export type Employee = {
  matricula: string;
  name: string;
  team: string;
  shift: string;
  specialties: string[];
  active: boolean;
  password?: string;
};

export type History = {
  id: string;
  activityId: string;
  timestamp: string;
  user: string;
  action: string;
  from: string;
  to: string;
  reason: string;
  note: string;
};

export type Settings = {
  organization: string;
  supervisorName: string;
  supervisorMatricula: string;
  teams: string[];
  shifts: string[];
  sectors: string[];
  locations: string[];
  equipment: string[];
};

export type DemoData = {
  activities: Activity[];
  employees: Employee[];
  settings: Settings;
  history: History[];
};

export const images = {
  hero: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_fundo_dashboard-QXcJnZKM2wCiQG6HBsAf09AHdrMOyn.png",
  login:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_fundo_login-0S3GjCDW5nqOyzf4s4DUFSbLn6kizm.png",
  logo: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_logo_escuro-x61bqSQfP3M3AGU7l47SCkzgPMdr8l.png",
  icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_icone_app-z8DeanHHC4RWjh547im26U9faBiJJN.png",
  tanks:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_tanques-5oD4XnQuYSIlZGyQ78syRPSiDEgKEd.png",
  pump: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_unidade_bombeio-FuCvotrNjUcF2MHlOFUTRA1JNAPA9W.png",
  well: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/demanda_diaria_wellhead-CWvL3t7grSg6xPu8pKESQW8s64thZP.png",
};

export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export const visibleStatus = (activity: Activity): Status =>
  ["Pendente", "Em andamento"].includes(activity.status) &&
  new Date(`${activity.date}T${activity.time}`) < new Date()
    ? "Atrasada"
    : activity.status;

export const statuses: Status[] = [
  "Concluída",
  "Pendente",
  "Em andamento",
  "Não realizada",
  "Atrasada",
];

export const statusClass = (status: string) =>
  ({
    Concluída: "success",
    Pendente: "warning",
    "Em andamento": "info",
    "Não realizada": "danger",
    Atrasada: "danger",
  })[status] || "neutral";

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) {
    window.location.assign("/sign-in");
    throw new Error("Sessão expirada.");
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `Não foi possível concluir (${response.status}).`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const operationalApi = {
  get: () => request<DemoData>("/api/data"),
  saveActivity: (activity: Activity) =>
    request<void>(
      activity.id ? `/api/activities/${encodeURIComponent(activity.id)}` : "/api/activities",
      activity.id ? "PUT" : "POST",
      activity,
    ),
  remove: (id: string) =>
    request<void>(`/api/activities/${encodeURIComponent(id)}`, "DELETE"),
  employee: (employee: Employee, create = false) =>
    request<void>(
      `/api/employees/${encodeURIComponent(employee.matricula)}`,
      create ? "POST" : "PUT",
      employee,
    ),
  settings: (settings: Settings) => request<void>("/api/settings", "PUT", settings),
  suggest: (body: { title: string; description: string; sector: string }) =>
    request<{ employee: string; confidence: number; reason: string; source: "ai" | "rules" }>(
      "/api/ai/assign",
      "POST",
      body,
    ),
  jennifer: (body: { prompt: string }) =>
    request<{
      draft: {
        title: string;
        description: string;
        why: string;
        priority: string;
        date: string;
        time: string;
        employee: string;
        sector: string;
        location: string;
        equipment: string;
        well: string;
        note: string;
      };
      reason: string;
      source: "ai" | "rules";
    }>("/api/ai/jennifer", "POST", body),
};
