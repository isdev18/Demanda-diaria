"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  Camera,
  Check,
  Play,
  CircleAlert,
  Download,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Activity,
  DemoData,
  Employee,
  Settings,
  today,
  visibleStatus,
  images,
  operationalApi,
} from "@/lib/demanda";
import { StatusBadge } from "./operations";

type ActivityDraft = Pick<
  Activity,
  | "title"
  | "description"
  | "why"
  | "priority"
  | "date"
  | "time"
  | "employee"
  | "sector"
  | "location"
  | "equipment"
  | "well"
  | "note"
>;

export function ActivityForm({
  activity,
  data,
  onSave,
  onCancel,
  busy,
}: {
  activity?: Activity;
  data: DemoData;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<ActivityDraft>({
    title: activity?.title || "",
    description: activity?.description || "",
    why: activity?.why || "",
    priority: activity?.priority || "Média",
    date: activity?.date || today(),
    time: activity?.time || "08:00",
    employee: activity?.employee || "",
    sector: activity?.sector || data.settings.sectors[0] || "Operação",
    location: activity?.location || "",
    equipment: activity?.equipment || "",
    well: activity?.well || "",
    note: activity?.note || "",
  });
  const [prompt, setPrompt] = useState("");
  const [askingJennifer, setAskingJennifer] = useState(false);
  const [jenniferMessage, setJenniferMessage] = useState("");

  const set = (key: keyof ActivityDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function askJennifer() {
    if (prompt.trim().length < 3) {
      toast.error("Conte para a Jennifer o que precisa ser feito.");
      return;
    }
    setAskingJennifer(true);
    setJenniferMessage("");
    try {
      const result = await operationalApi.jennifer({ prompt: prompt.trim() });
      setDraft((current) => ({ ...current, ...result.draft }));
      const employee = data.employees.find(
        (item) => item.matricula === result.draft.employee,
      );
      setJenniferMessage(
        `${employee?.name || "Responsável sugerido"} · ${result.reason}`,
      );
      toast.success("A IA da Jennifer preparou a atividade.");
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "A IA da Jennifer não conseguiu preparar a atividade.",
      );
    } finally {
      setAskingJennifer(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const employee = data.employees.find(
      (item) => item.matricula === draft.employee,
    );
    if (!employee) {
      toast.error("Selecione um colaborador responsável.");
      return;
    }
    onSave({
      ...activity,
      ...draft,
      id: activity?.id || "",
      description: draft.description || draft.title,
      why: draft.why || "Atender à demanda operacional.",
      sector: draft.sector || data.settings.sectors[0] || "Operação",
      location: draft.location || data.settings.locations[0] || "Não informado",
      equipment: draft.equipment || data.settings.equipment[0] || "Não informado",
      well: draft.well || "Não informado",
      team: employee.team,
      shift: employee.shift,
      status: activity?.status || "Pendente",
      reason: activity?.reason || "",
      createdAt: activity?.createdAt || new Date().toISOString(),
      completedAt: activity?.completedAt || "",
      justificationAt: activity?.justificationAt || "",
      attachments: activity?.attachments || [],
    });
  }

  return (
    <form onSubmit={submit} className="quick-activity-form">
      {!activity && (
        <section className="jennifer-box">
          <div className="jennifer-heading">
            <span className="jennifer-icon"><Sparkles size={18} /></span>
            <div>
              <strong>IA da Jennifer</strong>
              <p>Descreva em uma frase. A Jennifer completa e distribui a atividade.</p>
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder='Ex.: "Revisar o painel elétrico amanhã às 8h, prioridade alta"'
            rows={2}
          />
          <button
            type="button"
            className="button jennifer-button"
            disabled={askingJennifer || !data.employees.some((item) => item.active)}
            onClick={askJennifer}
          >
            <Sparkles size={16} />
            {askingJennifer ? "Jennifer está analisando..." : "Preparar com a Jennifer"}
          </button>
          {jenniferMessage && <small>{jenniferMessage}</small>}
        </section>
      )}

      <div className="quick-fields">
        <label className="full">
          O que precisa ser feito? <span className="required">*</span>
          <input
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Título curto da atividade"
            required
            autoFocus={!activity}
          />
        </label>
        <label>
          Responsável <span className="required">*</span>
          <select
            value={draft.employee}
            onChange={(event) => set("employee", event.target.value)}
            required
          >
            <option value="">Selecione</option>
            {data.employees
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.matricula} value={item.matricula}>
                  {item.name} · {item.specialties.join(", ") || "Sem especialidade"}
                </option>
              ))}
          </select>
        </label>
        <label>
          Prioridade
          <select
            value={draft.priority}
            onChange={(event) => set("priority", event.target.value)}
          >
            <option>Média</option>
            <option>Alta</option>
            <option>Baixa</option>
          </select>
        </label>
        <label>
          Data <span className="required">*</span>
          <input
            type="date"
            value={draft.date}
            onChange={(event) => set("date", event.target.value)}
            required
          />
        </label>
        <label>
          Horário <span className="required">*</span>
          <input
            type="time"
            value={draft.time}
            onChange={(event) => set("time", event.target.value)}
            required
          />
        </label>
      </div>

      <details className="optional-details">
        <summary>Detalhes opcionais</summary>
        <div className="form-grid">
          <label className="full">
            Descrição
            <textarea value={draft.description} onChange={(event) => set("description", event.target.value)} />
          </label>
          <label className="full">
            Motivo
            <input value={draft.why} onChange={(event) => set("why", event.target.value)} />
          </label>
          <label>
            Setor
            <select value={draft.sector} onChange={(event) => set("sector", event.target.value)}>
              {data.settings.sectors.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Local
            <select value={draft.location} onChange={(event) => set("location", event.target.value)}>
              <option value="">Usar padrão</option>
              {data.settings.locations.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Equipamento
            <select value={draft.equipment} onChange={(event) => set("equipment", event.target.value)}>
              <option value="">Não informar</option>
              {data.settings.equipment.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Poço
            <input value={draft.well} onChange={(event) => set("well", event.target.value)} />
          </label>
          <label className="full">
            Observação
            <textarea value={draft.note} onChange={(event) => set("note", event.target.value)} />
          </label>
        </div>
      </details>

      <div className="form-footer">
        <button type="button" className="button" onClick={onCancel}>Cancelar</button>
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando..." : activity?.id ? "Salvar alterações" : "Criar atividade"}
        </button>
      </div>
    </form>
  );
}

function LegacyActivityForm({
  activity,
  data,
  onSave,
  onCancel,
  busy,
}: {
  activity?: Activity;
  data: DemoData;
  onSave: (a: Activity) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [assignedEmployee, setAssignedEmployee] = useState(activity?.employee || "");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    onSave({
      ...activity,
      ...v,
      id: activity?.id || "",
      status: activity?.status || "Pendente",
      createdAt: activity?.createdAt || new Date().toISOString(),
      completedAt: activity?.completedAt || "",
      justificationAt: activity?.justificationAt || "",
      attachments: activity?.attachments || [],
      reason: activity?.reason || "",
    } as Activity);
  };
  const fields = [
    ["title", "Título da atividade"],
    ["why", "Motivo da realização"],
    ["description", "Descrição"],
    ["priority", "Prioridade", ["Alta", "Média", "Baixa"]],
    ["date", "Data"],
    ["time", "Horário"],
    [
      "employee",
      "Colaborador",
      data.employees
        .filter((e) => e.active)
        .map((e) => `${e.matricula}|${e.name}`),
    ],
    ["team", "Equipe", data.settings.teams],
    ["shift", "Turno", data.settings.shifts],
    ["sector", "Setor", data.settings.sectors],
    ["location", "Local", data.settings.locations],
    ["equipment", "Equipamento", data.settings.equipment],
    ["well", "Poço"],
    ["note", "Observação"],
  ];
  return (
    <form ref={formRef} onSubmit={submit}>
      {!activity && (
        <div className="form-note">
          <strong>Assistente de distribuição</strong>
          <p>Preencha o título, a descrição ou o setor e deixe a IA sugerir o profissional mais adequado.</p>
          <button
            type="button"
            className="button"
            disabled={suggesting || !data.employees.some((employee) => employee.active)}
            onClick={async () => {
              if (!formRef.current) return;
              const values = Object.fromEntries(new FormData(formRef.current));
              setSuggesting(true);
              setSuggestion("");
              try {
                const result = await operationalApi.suggest({
                  title: String(values.title || ""),
                  description: String(values.description || ""),
                  sector: String(values.sector || ""),
                });
                setAssignedEmployee(result.employee);
                const person = data.employees.find((item) => item.matricula === result.employee);
                setSuggestion(`${person?.name || result.employee} · ${result.confidence}% — ${result.reason}`);
              } catch (reason) {
                toast.error(reason instanceof Error ? reason.message : "Não foi possível gerar a sugestão.");
              } finally {
                setSuggesting(false);
              }
            }}
          >
            <Sparkles size={16} />
            {suggesting ? "Analisando..." : "Sugerir colaborador com IA"}
          </button>
          {suggestion && <small>{suggestion}</small>}
        </div>
      )}
      <div className="form-grid">
        {fields.map(([key, label, options]) => (
          <label
            className={
              ["title", "why", "description", "note"].includes(key as string)
                ? "full"
                : ""
            }
            key={key as string}
          >
            {label}
            <span className="required"> *</span>
            {options ? (
              <select
                name={key as string}
                value={key === "employee" ? assignedEmployee : undefined}
                defaultValue={key === "employee" ? undefined : (activity?.[key as keyof Activity] as string) || ""}
                onChange={key === "employee" ? (event) => setAssignedEmployee(event.target.value) : undefined}
                required
              >
                <option value="">Selecione</option>
                {(options as string[]).map((o) => (
                  <option key={o} value={o.split("|")[0]}>
                    {o.split("|")[1] || o}
                  </option>
                ))}
              </select>
            ) : ["description", "note"].includes(key as string) ? (
              <textarea
                required
                name={key as string}
                defaultValue={activity?.[key as keyof Activity] as string}
              />
            ) : (
              <input
                required
                name={key as string}
                type={
                  key === "date" ? "date" : key === "time" ? "time" : "text"
                }
                defaultValue={
                  (activity?.[key as keyof Activity] as string) ||
                  (key === "date" ? today() : "")
                }
              />
            )}
          </label>
        ))}
      </div>
      <div className="form-footer">
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando..." : "Salvar atividade"}
        </button>
      </div>
    </form>
  );
}
export function EmployeeForm({
  employee,
  onSave,
  busy,
}: {
  employee?: Employee;
  onSave: (e: Employee) => void;
  busy: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.currentTarget));
        if (v.password !== v.confirm) {
          toast.error("As senhas não coincidem.");
          return;
        }
        onSave({
          matricula: String(v.matricula),
          name: String(v.name),
          team: String(v.team),
          shift: String(v.shift),
          specialties: String(v.specialties)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          active: v.active === "true",
          password: String(v.password || "") || undefined,
        });
      }}
    >
      <div className="form-grid">
        {[
          ["matricula", "Matrícula"],
          ["name", "Nome"],
          ["team", "Equipe"],
          ["shift", "Turno"],
          ["specialties", "Especialidades (separadas por vírgula)"],
          ...(!employee
            ? [["password", "Senha de acesso"], ["confirm", "Confirmação da senha"]]
            : []),
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              name={key}
              required={!employee || !["password", "confirm"].includes(key)}
              readOnly={!!employee && key === "matricula"}
              type={["password", "confirm"].includes(key) ? "password" : "text"}
              minLength={["password", "confirm"].includes(key) ? 6 : 1}
              defaultValue={
                key === "specialties"
                  ? employee?.specialties.join(", ") || ""
                  : (employee?.[key as keyof Employee] as string) || ""
              }
            />
          </label>
        ))}
        <label>
          Status
          <select name="active" defaultValue={String(employee?.active ?? true)}>
            <option value="true">Ativo</option>
            <option value="false">Desativado</option>
          </select>
        </label>
      </div>
      <p className="form-note">
        As especialidades orientam a sugestão automática de atividades. O colaborador acessará com matrícula e senha.
      </p>
      <div className="form-footer">
        <button disabled={busy} className="button primary">
          {busy ? "Salvando..." : "Salvar colaborador"}
        </button>
      </div>
    </form>
  );
}
export function ActivityDetails({
  activity: a,
  data,
  employeeMode,
  onSave,
  busy,
}: {
  activity: Activity;
  data: DemoData;
  employeeMode: boolean;
  onSave: (a: Activity) => void;
  busy: boolean;
}) {
  const [justifying, setJustifying] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState(a.attachments);
  const [uploading, setUploading] = useState(false);
  const open = ["Pendente", "Em andamento"].includes(a.status);
  return (
    <div className="detail">
      <div className="detail-top">
        <StatusBadge status={visibleStatus(a)} />
        <span className="muted">
          {a.id} · Prioridade {a.priority}
        </span>
      </div>
      <p>{a.description}</p>
      <div className="detail-grid">
        {[
          [
            "Responsável",
            data.employees.find((e) => e.matricula === a.employee)?.name,
          ],
          [
            "Data e horário",
            `${a.date.split("-").reverse().join("/")} às ${a.time}`,
          ],
          ["Motivo", a.why],
          ["Local", a.location],
          ["Setor", a.sector],
          ["Equipamento", a.equipment],
          ["Poço", a.well],
          ["Equipe / turno", `${a.team} · ${a.shift}`],
          ["Observações", a.note || "Sem observações"],
          ["Justificativa", a.reason || "—"],
          [
            "Concluída em",
            a.completedAt
              ? new Date(a.completedAt).toLocaleString("pt-BR")
              : "—",
          ],
          [
            "Justificada em",
            a.justificationAt
              ? new Date(a.justificationAt).toLocaleString("pt-BR")
              : "—",
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <h3>
        Fotos da atividade <span className="muted">({photos.length}/4)</span>
      </h3>
      <div className="photos">
        {photos.map((p) => (
          <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
            <img src={p.url} alt={p.name} />
          </a>
        ))}
      </div>
      {!photos.length && <p className="form-note">Nenhuma foto anexada.</p>}
      {employeeMode && open && (
        <label className="upload">
          <Camera size={20} />
          {uploading
            ? "Preparando imagens..."
            : "Selecionar fotos · JPG, PNG ou WEBP · até 5 MB"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading || busy}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length + photos.length > 4) {
                toast.error("São permitidas até 4 fotos.");
                return;
              }
              if (
                files.some(
                  (f) =>
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      f.type,
                    ) || f.size > 5 * 1024 * 1024,
                )
              ) {
                toast.error("Use JPG, PNG ou WEBP com até 5 MB.");
                return;
              }
              setUploading(true);
              try {
                const added = await Promise.all(
                  files.map(
                    (f) =>
                      new Promise<{ id: string; url: string; name: string }>(
                        (resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () =>
                            resolve({
                              id: crypto.randomUUID(),
                              url: String(reader.result),
                              name: f.name,
                            });
                          reader.onerror = reject;
                          reader.readAsDataURL(f);
                        },
                      ),
                  ),
                );
                setPhotos([...photos, ...added]);
              } catch {
                toast.error("Não foi possível ler a imagem.");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
      )}
      {photos.length !== a.attachments.length && (
        <button
          className="button primary"
          disabled={busy}
          onClick={() => onSave({ ...a, attachments: photos })}
        >
          Salvar fotos
        </button>
      )}
      <h3>Histórico da atividade</h3>
      <div className="activity-log">
        {data.history
          .filter((h) => h.activityId === a.id)
          .map((h) => (
            <div key={h.id}>
              <span className="dot info-dot" />
              <p>
                <strong>{h.action}</strong>
                <small>
                  {h.user} · {new Date(h.timestamp).toLocaleString("pt-BR")}
                </small>
              </p>
            </div>
          ))}
        <div>
          <span className="dot neutral-dot" />
          <p>
            Atividade criada
            <small>{new Date(a.createdAt).toLocaleString("pt-BR")}</small>
          </p>
        </div>
      </div>
      {employeeMode && open && (
        <div className="form-footer">
          {a.status === "Pendente" ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                onSave({ ...a, status: "Em andamento", attachments: photos })
              }
            >
              <Play size={16} />
              Iniciar atividade
            </button>
          ) : (
            <>
              <button className="button" onClick={() => setJustifying(true)}>
                <CircleAlert size={16} />
                Não realizada
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Confirmar conclusão desta atividade?"))
                    onSave({
                      ...a,
                      status: "Concluída",
                      completedAt: new Date().toISOString(),
                      attachments: photos,
                    });
                }}
              >
                <Check size={16} />
                Concluir atividade
              </button>
            </>
          )}
        </div>
      )}
      {justifying && (
        <form
          className="justify-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (window.confirm("Confirmar atividade não realizada?"))
              onSave({
                ...a,
                status: "Não realizada",
                reason,
                note,
                justificationAt: new Date().toISOString(),
                attachments: photos,
              });
          }}
        >
          <label>
            Motivo obrigatório
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Selecione o motivo</option>
              {[
                "Equipamento indisponível",
                "Condições climáticas",
                "Falha operacional",
                "Acesso não disponível",
                "Outro",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Observação {reason === "Outro" ? "(obrigatória)" : ""}
            <textarea
              required={reason === "Outro"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy}>
            Confirmar justificativa
          </button>
        </form>
      )}
    </div>
  );
}
export function SettingsForm({
  settings,
  onSave,
  busy,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
  busy: boolean;
}) {
  return (
    <form
      className="panel settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm("Salvar as configurações operacionais?")) return;
        const values = Object.fromEntries(new FormData(e.currentTarget));
        const next = { ...settings };
        Object.keys(settings).forEach((k) => {
          (next as unknown as Record<string, unknown>)[k] = Array.isArray(
            settings[k as keyof Settings],
          )
            ? String(values[k])
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : String(values[k]);
        });
        onSave(next);
      }}
    >
      <div className="panel-heading">
        <div>
          <h3>Unidade e conta</h3>
          <p>Personalize as informações da sua operação.</p>
        </div>
      </div>
      <div className="form-grid">
        {Object.entries({
          organization: "Nome da unidade",
          supervisorName: "Nome da supervisora",
          supervisorMatricula: "Matrícula da supervisora",
          teams: "Equipes",
          shifts: "Turnos",
          sectors: "Setores",
          locations: "Locais",
          equipment: "Equipamentos",
        }).map(([key, label]) => (
          <label key={key} className={key === "organization" ? "full" : ""}>
            {label}
            <input
              required
              name={key}
              defaultValue={
                Array.isArray(settings[key as keyof Settings])
                  ? (settings[key as keyof Settings] as string[]).join(", ")
                  : (settings[key as keyof Settings] as string)
              }
            />
            {Array.isArray(settings[key as keyof Settings]) && (
              <small>Separe os valores por vírgula.</small>
            )}
          </label>
        ))}
      </div>
      <p className="form-note">
        As alterações são salvas no banco de dados e passam a valer para toda a equipe.
      </p>
      <div className="form-footer">
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
export function Login({
  onDemo,
}: {
  onDemo: (role: "supervisor" | "employee") => void;
}) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <section
        className="login-visual"
        style={{
          backgroundImage: `linear-gradient(180deg,rgba(3,24,40,.35),rgba(3,24,40,.94)),url('${images.login}')`,
        }}
      >
        <img
          src={images.logo}
          alt="Demanda Diária — Produção em foco, todos os dias"
        />
        <div>
          <span className="eyebrow">CONECTANDO PESSOAS E OPERAÇÕES</span>
          <h1>
            Uma operação segura.
            <br />
            Um dia mais produtivo.
          </h1>
          <p>
            Planeje, acompanhe e transforme as atividades do dia em resultados
            para sua unidade.
          </p>
        </div>
        <small>Demanda Diária · Gestão de operações</small>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">BEM-VINDO À DEMANDA DIÁRIA</span>
          <h1>Acessar o sistema</h1>
          <p className="muted">
            Entre com suas credenciais para acompanhar a operação.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              await new Promise((r) => setTimeout(r, 500));
              setError(
                "Esta tela legada não está habilitada. Use a página de acesso principal.",
              );
              setBusy(false);
            }}
          >
            <label>
              Matrícula
              <input
                required
                placeholder="Digite sua matrícula"
                autoComplete="username"
              />
            </label>
            <label>
              Senha
              <div className="password-input">
                <input
                  required
                  type={show ? "text" : "password"}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label="Mostrar senha"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Conectando..." : "Entrar"}
            </button>
          </form>
          <div className="demo-login">
            <span>ACESSO OPERACIONAL</span>
            <p>Use suas credenciais cadastradas pela supervisão.</p>
            <button className="button" onClick={() => onDemo("supervisor")}>
              Entrar como supervisora
            </button>
            <button className="button" onClick={() => onDemo("employee")}>
              Entrar como colaborador
            </button>
          </div>
        </div>
        <small className="muted">Produção em foco, todos os dias.</small>
      </section>
    </main>
  );
}
