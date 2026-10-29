"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { Toaster, toast } from "sonner";
import { signOut, updateUser } from "@/lib/auth-client";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  History,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  CalendarDays,
  Building2,
  Sun,
  ArrowUpRight,
  Download,
  RefreshCw,
  PanelLeftClose,
  Menu,
  Check,
  ArrowRight,
  HardHat,
  CircleHelp,
  Radio,
  Clock3,
  MapPin,
  X,
  UserRound,
  Sparkles,
  Send,
  Pencil,
} from "lucide-react";
import {
  Activity,
  Employee,
  History as HistoryItem,
  operationalApi,
  images,
  today,
  visibleStatus,
  statuses,
  initials,
} from "@/lib/demanda";
import {
  ActivityTable,
  Summary,
  OperationalPanels,
  Modal,
  TeamCards,
  Avatar,
  StatusBadge,
} from "./operations";
import {
  ActivityForm,
  EmployeeForm,
  ActivityDetails,
  SettingsForm,
} from "./operation-forms";
const nav = [
  { id: "overview", name: "Visão geral", icon: LayoutDashboard },
  { id: "activities", name: "Atividades", icon: ClipboardList },
  { id: "team", name: "Equipe", icon: Users },
  { id: "history", name: "Histórico", icon: History },
  { id: "reports", name: "Relatórios", icon: ChartNoAxesCombined },
  { id: "settings", name: "Configurações", icon: Settings },
];
export default function DemandaApp({
  initialPage = "overview",
  role: sessionRole,
  userName,
  userEmail,
}: {
  initialPage?: string;
  role: "supervisor" | "employee";
  userName: string;
  userEmail: string;
}) {
  const [page, setPage] = useState(initialPage);
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState<
    "new" | "edit" | "detail" | "employee" | null
  >(null);
  const [selected, setSelected] = useState<Activity>();
  const [employee, setEmployee] = useState<Employee>();
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const [profileMessage, setProfileMessage] = useState("");
  const [date, setDate] = useState(today());
  const [tab, setTab] = useState("Todas");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [audit, setAudit] = useState<HistoryItem>();
  const [jenniferPrompt, setJenniferPrompt] = useState("");
  const [jenniferBusy, setJenniferBusy] = useState(false);
  const [jenniferPreview, setJenniferPreview] = useState<{
    activity: Activity;
    reason: string;
  }>();
  const [employeePreview, setEmployeePreview] = useState<string | null>(null);
  const role =
    sessionRole === "supervisor" && employeePreview !== null
      ? "employee"
      : sessionRole;
  const { data, error, mutate, isLoading } = useSWR(
    page === "login" ? null : "demanda-operacional",
    () => operationalApi.get(),
    { refreshInterval: 30000 },
  );
  useEffect(() => {
    const handle = () =>
      setPage(
        location.pathname === "/login"
          ? "login"
          : location.hash.slice(1) || initialPage,
      );
    handle();
    window.addEventListener("popstate", handle);
    return () => {
      window.removeEventListener("popstate", handle);
    };
  }, [initialPage]);
  function go(next: string) {
    setPage(next);
    setMobile(false);
    window.history.pushState(null, "", `/#${next}`);
  }
  async function logout() {
    await signOut();
    window.location.href = "/sign-in";
  }
  async function action(fn: () => Promise<void>, message: string) {
    setBusy(true);
    try {
      await fn();
      await mutate();
      setModal(null);
      toast.success(message);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  if (isLoading || !data)
    return (
      <main className="loading">
        <RefreshCw className="spin" />
        <p>
  {error
              ? "Não foi possível carregar seus dados."
              : "Preparando a operação..."}
        </p>
        {error && <button onClick={() => mutate()}>Tentar novamente</button>}
      </main>
    );
  const sessionName = profileName || userName || userEmail.split("@")[0];
  const previewEmployee =
    employeePreview !== null
      ? data.employees.find((item) => item.matricula === employeePreview)
      : undefined;
  const name =
    sessionRole === "supervisor" && role === "employee"
      ? previewEmployee?.name || "Colaborador"
      : sessionName;
  const currentHour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const greeting =
    currentHour < 12
      ? "Bom dia"
      : currentHour < 18
        ? "Boa tarde"
        : "Boa noite";
  const all =
    sessionRole === "supervisor" && role === "employee"
      ? data.activities.filter((activity) => activity.employee === employeePreview)
      : data.activities;
  const activities = all.filter((a) => a.date === date);
  const current = nav.find((n) => n.id === page) || nav[0];
  const actualSelected = selected
    ? data.activities.find((a) => a.id === selected.id) || selected
    : undefined;
  const view = (a: Activity) => {
    setSelected(a);
    setModal("detail");
  };
  const edit = (a: Activity) => {
    setSelected(a);
    setModal("edit");
  };
  const remove = (a: Activity) => {
    if (
      window.confirm(
        `Excluir a atividade “${a.title}”? Esta ação não pode ser desfeita.`,
      )
    )
      action(() => operationalApi.remove(a.id), "Atividade excluída.");
  };
  async function askJenniferFromDashboard() {
    if (jenniferPrompt.trim().length < 3) {
      toast.error("Conte para a Jennifer o que precisa ser feito.");
      return;
    }
    setJenniferBusy(true);
    try {
      const result = await operationalApi.jennifer({
        prompt: jenniferPrompt.trim(),
      });
      const employee = data!.employees.find(
        (item) => item.matricula === result.draft.employee,
      );
      if (!employee) throw new Error("A Jennifer não encontrou um responsável ativo.");
      setJenniferPreview({
        reason: result.reason,
        activity: {
          ...result.draft,
          id: "",
          description: result.draft.description || result.draft.title,
          why: result.draft.why || "Atender à demanda operacional.",
          location:
            result.draft.location || data!.settings.locations[0] || "Não informado",
          equipment:
            result.draft.equipment || data!.settings.equipment[0] || "Não informado",
          sector: result.draft.sector || data!.settings.sectors[0] || "Operação",
          well: result.draft.well || "Não informado",
          team: employee.team,
          shift: employee.shift,
          status: "Pendente",
          reason: "",
          createdAt: new Date().toISOString(),
          completedAt: "",
          justificationAt: "",
          attachments: [],
        },
      });
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "A IA da Jennifer não conseguiu analisar o pedido.",
      );
    } finally {
      setJenniferBusy(false);
    }
  }
  async function exportReport(excel = false) {
    const rows = all.map((a) => ({
      Código: a.id,
      Atividade: a.title,
      Colaborador: data!.employees.find((e) => e.matricula === a.employee)
        ?.name,
      Data: a.date,
      Horário: a.time,
      Status: visibleStatus(a),
      Prioridade: a.priority,
      Setor: a.sector,
      Equipe: a.team,
      Motivo: a.reason,
    }));
    if (excel) {
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(rows),
        "Atividades",
      );
      XLSX.writeFile(book, "demanda-diaria.xlsx");
    } else {
      const safe = (v: unknown) => {
        let s = String(v ?? "");
        if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
        return `"${s.replaceAll('"', '""')}"`;
      };
      const csv = [
        Object.keys(rows[0] || { Atividade: "" })
          .map(safe)
          .join(";"),
        ...rows.map((r) => Object.values(r).map(safe).join(";")),
      ].join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "demanda-diaria.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success("Relatório exportado.");
  }
  const allowedNav =
    role === "supervisor"
      ? nav
      : nav
          .filter((n) => ["overview", "activities", "history"].includes(n.id))
          .concat(
            sessionRole === "employee"
              ? [{ id: "profile", name: "Meu perfil", icon: UserRound }]
              : [],
          );
  return (
    <div className="app-shell">
      <Toaster richColors position="top-right" />
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <a
          className="brand"
          href="/#overview"
          onClick={(e) => {
            e.preventDefault();
            go("overview");
          }}
        >
          <span className="brand-symbol">
            <img src={images.icon} alt="" />
          </span>
          <span>
            Demanda<span className="brand-blue">Diária</span>
            <small>GESTÃO OPERACIONAL</small>
          </span>
        </a>
        <div className="sidebar-divider" />
        <span className="nav-label">PRINCIPAL</span>
        <nav>
          {allowedNav.map((n) => (
            <button
              className={`nav-item ${page === n.id ? "active" : ""}`}
              key={n.id}
              onClick={() => go(n.id)}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.id === "activities" && (
                <span className="nav-count">{all.length}</span>
              )}
              {page === n.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="operation-card">
            <div>
              <Building2 size={17} />
              <span>UNIDADE OPERACIONAL</span>
              <span className="live-dot" />
            </div>
            <strong>
              {data.settings.organization.replace("Unidade de Produção — ", "")}
            </strong>
            <p>
              <Sun size={15} />
              Turno diurno <span>07h — 19h</span>
            </p>
          </div>
          {role === "supervisor" && (
            <button className="help-link" onClick={() => toast.info("Use a IA da Jennifer para criar e distribuir atividades rapidamente.")}>
              <CircleHelp size={17} />
              Central de ajuda
              <ArrowUpRight size={15} />
            </button>
          )}
          <div className="sidebar-profile">
            <Avatar name={name} />
            <div>
              <strong>{name}</strong>
              <small>
                {role === "supervisor"
                  ? "Supervisora de operações"
                  : "Operador de produção"}
              </small>
            </div>
            <button className="sidebar-logout" aria-label="Sair da conta" onClick={logout}>
              <LogOut size={17} />
              <span>Sair</span>
            </button>
          </div>
        </div>
        <div className="sidebar-version">
          <span>Demanda Diária</span>
          <span>v1.0</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="menu-toggle icon-button"
              aria-label="Abrir menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>
              Painel{" "}
              {role === "supervisor" ? "da supervisora" : "do colaborador"}
            </span>
            <ChevronRight size={14} />
            <strong>{current.name}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">AMBIENTE OPERACIONAL</span>
            {sessionRole === "supervisor" && (
              <button
                className={`preview-role-button ${employeePreview !== null ? "active" : ""}`}
                onClick={() => {
                  if (employeePreview !== null) {
                    setEmployeePreview(null);
                  } else {
                    setEmployeePreview(data.employees[0]?.matricula || "");
                  }
                  go("overview");
                }}
              >
                <UserRound size={16} />
                <span>
                  {employeePreview !== null
                    ? "Voltar à supervisão"
                    : "Ver como colaborador"}
                </span>
              </button>
            )}
            <button className="topbar-logout" onClick={logout}>
              <LogOut size={16} />
              <span>Sair da conta</span>
            </button>
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-label="Notificações"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                <i />
              </button>
              {notifications && (
                <div className="notification-popover">
                  <h3>Central de notificações</h3>
                  {activities
                    .filter((a) =>
                      ["Não realizada", "Atrasada"].includes(visibleStatus(a)),
                    )
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          view(a);
                          setNotifications(false);
                        }}
                      >
                        <strong>{a.title}</strong>
                        <small>
                          {a.reason || "Horário programado excedido"}
                        </small>
                      </button>
                    ))}
                  <p className="muted">Notificações da operação de hoje.</p>
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <Avatar name={name} />
            <span className="topbar-name">
              {name}
              <small>
                {role === "supervisor" ? "Supervisora" : "Colaborador"}
              </small>
            </span>
            <span className="profile-pill">
              {role === "supervisor" ? "Supervisora" : "Colaborador"}
            </span>
          </div>
        </header>
        <main className="main-content">
          {sessionRole === "supervisor" && employeePreview !== null && (
            <div className="employee-preview-banner">
              <UserRound size={16} />
              <span>
                Visualização do colaborador: <strong>{previewEmployee?.name || "nenhum colaborador cadastrado"}</strong>
              </span>
              <button onClick={() => { setEmployeePreview(null); go("overview"); }}>
                Sair da visualização
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="heading-eyebrow">
                {page === "overview"
                  ? "ACOMPANHAMENTO OPERACIONAL"
                  : "GESTÃO OPERACIONAL"}
              </div>
              <h1>
                {page === "overview"
                  ? `${greeting}, ${name.split(" ")[0]}`
                  : current.name}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {page === "overview"
                  ? "Uma visão completa da sua operação. Cada atividade faz a diferença."
                  : (
                      {
                        activities:
                          "Organize as demandas e acompanhe cada etapa da execução.",
                        team: "Pessoas conectadas a uma operação mais eficiente.",
                        history:
                          "Transparência e rastreabilidade em cada ação.",
                        reports:
                          "Transforme os resultados da operação em decisões.",
                        settings:
                          "Ajuste o sistema à realidade da sua unidade.",
                      } as Record<string, string>
                    )[page]}
              </p>
            </div>
            <div className="heading-actions">
              {["overview", "activities"].includes(page) && (
                <label className="date-control">
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    aria-label="Data das atividades"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              )}
              {role === "supervisor" &&
                ["overview", "activities"].includes(page) && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setSelected(undefined);
                      setModal("new");
                    }}
                  >
                    <Plus size={17} />
                    Nova atividade
                  </button>
                )}
              {page === "team" && (
                <button
                  className="button primary"
                  onClick={() => {
                    setEmployee(undefined);
                    setModal("employee");
                  }}
                >
                  <Plus size={17} />
                  Novo colaborador
                </button>
              )}
            </div>
          </div>
          {page === "overview" && (
            <>
              {role === "supervisor" && (
                <section className="jennifer-dashboard">
                  <div className="jennifer-dashboard-main">
                    <div className="jennifer-dashboard-title">
                      <span className="jennifer-dashboard-icon">
                        <Sparkles size={21} />
                      </span>
                      <div>
                        <span className="jennifer-kicker">ASSISTENTE OPERACIONAL</span>
                        <h2>IA da Jennifer</h2>
                        <p>Crie e distribua uma atividade direto do dashboard.</p>
                      </div>
                      <span className="jennifer-online"><i /> Online</span>
                    </div>
                    <div className="jennifer-dashboard-input">
                      <textarea
                        value={jenniferPrompt}
                        onChange={(event) => setJenniferPrompt(event.target.value)}
                        placeholder='Ex.: "Revisar o painel elétrico amanhã às 8h, prioridade alta"'
                        rows={2}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void askJenniferFromDashboard();
                          }
                        }}
                      />
                      <button
                        className="button primary"
                        disabled={jenniferBusy || !data.employees.some((item) => item.active)}
                        onClick={() => void askJenniferFromDashboard()}
                      >
                        {jenniferBusy ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}
                        {jenniferBusy ? "Analisando..." : "Pedir à Jennifer"}
                      </button>
                    </div>
                    {!data.employees.some((item) => item.active) && (
                      <button className="jennifer-team-warning" onClick={() => go("team")}>
                        Cadastre um colaborador com especialidades para ativar a Jennifer.
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                  {jenniferPreview && (
                    <div className="jennifer-preview">
                      <span className={`priority priority-${jenniferPreview.activity.priority}`}>
                        {jenniferPreview.activity.priority}
                      </span>
                      <h3>{jenniferPreview.activity.title}</h3>
                      <div className="jennifer-preview-meta">
                        <span><UserRound size={14} />{data.employees.find((item) => item.matricula === jenniferPreview.activity.employee)?.name}</span>
                        <span><CalendarDays size={14} />{new Date(jenniferPreview.activity.date + "T12:00:00").toLocaleDateString("pt-BR")} · {jenniferPreview.activity.time}</span>
                      </div>
                      <p>{jenniferPreview.reason}</p>
                      <div className="jennifer-preview-actions">
                        <button
                          className="button"
                          onClick={() => {
                            setSelected(jenniferPreview.activity);
                            setModal("new");
                          }}
                        >
                          <Pencil size={15} /> Editar detalhes
                        </button>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              await operationalApi.saveActivity(jenniferPreview.activity);
                              setJenniferPreview(undefined);
                              setJenniferPrompt("");
                            }, "Atividade criada pela Jennifer.")
                          }
                        >
                          <Check size={15} /> Criar agora
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
              {role === "supervisor" && (
                <section
                  className="hero"
                  style={{
                    backgroundImage: `linear-gradient(90deg,rgba(4,29,47,.99) 0%,rgba(4,29,47,.87) 38%,rgba(4,29,47,.1) 100%),url('${images.hero}')`,
                  }}
                >
                  <div>
                    <span className="hero-kicker">
                      <span className="live-dot" /> OPERAÇÃO ATIVA
                    </span>
                    <h2>
                      Produção em foco.
                      <br />
                      Todos os dias.
                    </h2>
                    <p>{data.settings.organization}</p>
                    <div className="hero-tags">
                      <span>
                        <Sun size={15} />
                        Turno diurno <b>07h às 19h</b>
                      </span>
                      <i />
                      <span>
                        <Users size={15} />
                        {data.employees.filter((e) => e.active).length}{" "}
                        colaboradores em campo
                      </span>
                    </div>
                  </div>
                  <span className="hero-location">
                    <MapPin size={13} />
                    Alto do Rodrigues · RN
                  </span>
                </section>
              )}
              {role === "employee" && (
                <p className="employee-date">
                  {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <div className="section-label">
                <h2>Resumo do dia</h2>
                <span>
                  <span className="live-dot" />
                  Atualização automática a cada 30s
                </span>
              </div>
              <Summary activities={activities} compact={role === "employee"} />
            </>
          )}
          {["overview", "activities"].includes(page) &&
            (role === "supervisor" ? (
              <section className="panel activities-panel">
                <div className="panel-heading">
                  <div className="title-with-count">
                    <h3>
                      {page === "overview"
                        ? "Atividades do dia"
                        : "Todas as atividades"}
                    </h3>
                    <span className="count">{activities.length}</span>
                  </div>
                  {page === "overview" ? (
                    <button
                      className="text-link"
                      onClick={() => go("activities")}
                    >
                      Ver todas as atividades <ArrowUpRight size={15} />
                    </button>
                  ) : (
                    <button
                      className="text-link"
                      onClick={() => exportReport()}
                    >
                      <Download size={15} />
                      Exportar CSV
                    </button>
                  )}
                </div>
                <ActivityTable
                  activities={activities}
                  employees={data.employees}
                  onView={view}
                  onEdit={edit}
                  onDelete={remove}
                  compact={page === "overview"}
                />
              </section>
            ) : (
              <section className="employee-activities">
                <div className="tabs">
                  {["Todas", "Pendentes", "Concluídas"].map((t) => (
                    <button
                      className={tab === t ? "selected" : ""}
                      key={t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="employee-grid">
                  {activities
                    .filter(
                      (a) =>
                        tab === "Todas" ||
                        (tab === "Concluídas"
                          ? a.status === "Concluída"
                          : ["Pendente", "Em andamento"].includes(a.status)),
                    )
                    .map((a) => (
                      <article className="panel employee-card" key={a.id}>
                        <div className="detail-top">
                          <span className={`priority priority-${a.priority}`}>
                            Prioridade {a.priority.toLowerCase()}
                          </span>
                          <StatusBadge status={visibleStatus(a)} />
                        </div>
                        <h3>{a.title}</h3>
                        <p>{a.description}</p>
                        <div className="employee-meta">
                          <span>
                            <Clock3 size={15} />
                            {a.time}
                          </span>
                          <span>
                            <MapPin size={15} />
                            {a.location}
                          </span>
                        </div>
                        <button className="button" onClick={() => view(a)}>
                          Ver detalhes <ArrowRight size={16} />
                        </button>
                      </article>
                    ))}
                </div>
                {!activities.length && (
                  <div className="empty">Nenhuma atividade para esta data.</div>
                )}
              </section>
            ))}
          {page === "overview" && role === "supervisor" && (
            <OperationalPanels
              data={{ ...data, activities }}
              onTeam={() => go("team")}
            />
          )}
          {page === "team" && role === "supervisor" && (
            <>
              <div className="team-summary">
                <Users size={20} />
                <strong>{data.employees.length} colaboradores</strong>
                <span>
                  · {data.employees.filter((e) => e.active).length} com acesso
                  ativo
                </span>
              </div>
              <TeamCards
                data={data}
                onEdit={(e) => {
                  setEmployee(e);
                  setModal("employee");
                }}
              />
            </>
          )}
          {page === "history" && (
            <section className="panel">
              <div className="panel-heading">
                <h3>Histórico de ações</h3>
                <span className="count">Auditoria</span>
              </div>
              <div className="table-toolbar">
                <input
                  className="history-search"
                  aria-label="Buscar no histórico"
                  placeholder="Buscar atividade, usuário ou ação..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
                <select
                  aria-label="Status no histórico"
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                >
                  <option value="">Todos os status</option>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Data e hora",
                        "Responsável",
                        "Atividade",
                        "Ação",
                        "Status anterior",
                        "Novo status",
                        "Motivo",
                        "Observação",
                        "",
                      ].map((s, i) => (
                        <th key={i}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.history
                      .filter(
                        (h) =>
                          all.some((a) => a.id === h.activityId) &&
                          (!historyStatus || h.to === historyStatus) &&
                          `${h.user} ${h.activityId} ${h.action}`
                            .toLowerCase()
                            .includes(historySearch.toLowerCase()),
                      )
                      .map((h) => (
                        <tr key={h.id}>
                          <td>
                            {new Date(h.timestamp).toLocaleString("pt-BR")}
                          </td>
                          <td>{h.user}</td>
                          <td>{h.activityId}</td>
                          <td>{h.action}</td>
                          <td>{h.from}</td>
                          <td>
                            <StatusBadge status={h.to} />
                          </td>
                          <td>{h.reason || "—"}</td>
                          <td>{h.note || "—"}</td>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => setAudit(h)}
                            >
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!data.history.some(
                  (h) =>
                    all.some((a) => a.id === h.activityId) &&
                    (!historyStatus || h.to === historyStatus) &&
                    `${h.user} ${h.activityId} ${h.action}`
                      .toLowerCase()
                      .includes(historySearch.toLowerCase()),
                ) && <p className="empty">Nenhum registro encontrado.</p>}
              </div>
            </section>
          )}
          {page === "reports" && role === "supervisor" && (
            <>
              <div className="report-actions">
                <span className="muted">
                  Todos os registros operacionais
                </span>
                <button className="button" onClick={() => exportReport()}>
                  <Download size={16} />
                  Exportar CSV
                </button>
                <button
                  className="button primary"
                  onClick={() => exportReport(true)}
                >
                  <Download size={16} />
                  Exportar Excel
                </button>
              </div>
              <Summary activities={all} />
              <div className="report-grid">
                {[
                  ["Taxa de conclusão", "Concluída"],
                  ["Taxa de atraso", "Atrasada"],
                  ["Taxa de não realização", "Não realizada"],
                ].map(([label, status]) => (
                  <section className="panel rate-card" key={label}>
                    <span>{label}</span>
                    <strong>
                      {Math.round(
                        (all.filter((a) => visibleStatus(a) === status).length /
                          (all.length || 1)) *
                          100,
                      )}
                      <small>%</small>
                    </strong>
                    <progress
                      max={all.length || 1}
                      value={
                        all.filter((a) => visibleStatus(a) === status).length
                      }
                    />
                  </section>
                ))}
              </div>
              <div className="report-grid">
                {[
                  ["Distribuição por status", statuses, "status"],
                  ["Distribuição por equipe", data.settings.teams, "team"],
                  ["Distribuição por setor", data.settings.sectors, "sector"],
                ].map(([title, labels, field]) => (
                  <section className="panel" key={title as string}>
                    <div className="panel-heading">
                      <h3>{title}</h3>
                    </div>
                    <div className="report-bars">
                      {(labels as string[]).map((label) => {
                        const n = all.filter(
                          (a) =>
                            (field === "status"
                              ? visibleStatus(a)
                              : a[field as keyof Activity]) === label,
                        ).length;
                        return (
                          <div key={label}>
                            <div className="progress-label">
                              <span>{label}</span>
                              <strong>{n}</strong>
                            </div>
                            <progress max={all.length || 1} value={n} />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "profile" && role === "employee" && (
    <section className="settings-grid">
      <div className="settings-card">
        <div className="card-heading"><div><span className="section-label">CONTA</span><h2>Meu perfil</h2></div><UserRound size={20}/></div>
        <p className="muted">Atualize os dados usados na sua identificação no painel.</p>
        <label className="field-label" htmlFor="profile-name">Nome completo</label>
        <input id="profile-name" className="form-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
        <p className="profile-email">{userEmail}</p>
        <button className="primary-button" onClick={async () => { const result = await updateUser({ name: profileName.trim() }); if (result.error) { setProfileMessage("Não foi possível salvar o perfil."); } else { setProfileMessage("Perfil atualizado com sucesso."); } }}>Salvar alterações</button>
        {profileMessage && <p className="form-success">{profileMessage}</p>}
      </div>
    </section>
  )}
  {page === "settings" && role === "supervisor" && (
            <SettingsForm
              settings={data.settings}
              busy={busy}
              onSave={(s) =>
                action(
                  () => operationalApi.settings(s),
                  "Configurações atualizadas.",
                )
              }
            />
          )}
          <footer className="page-footer">
            <span>
              Demanda Diária <i /> Produção em foco, todos os dias.
            </span>
            <span>
              <span className="live-dot" />
              Ambiente operacional · Dados protegidos
            </span>
          </footer>
        </main>
      </div>
      {role === "employee" && (
        <nav className="mobile-bottom">
          {allowedNav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "selected" : ""}
              onClick={() => go(n.id)}
            >
              <n.icon size={21} />
              {n.id === "overview" ? "Início" : n.name}
            </button>
          ))}
          <button onClick={logout}>
            <LogOut size={21} />
            Sair
          </button>
        </nav>
      )}
      {modal && (
        <Modal
          title={
            modal === "new"
              ? "Nova atividade"
              : modal === "edit"
                ? "Editar atividade"
                : modal === "employee"
                  ? employee
                    ? "Editar colaborador"
                    : "Novo colaborador"
                  : actualSelected?.title || "Detalhes"
          }
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          {(modal === "new" || modal === "edit") && (
            <ActivityForm
              activity={modal === "edit" || (modal === "new" && !selected?.id) ? selected : undefined}
              data={data}
              busy={busy}
              onCancel={() => setModal(null)}
              onSave={(a) =>
                action(
                  () => operationalApi.saveActivity(a),
                  "Atividade salva com sucesso.",
                )
              }
            />
          )}
          {modal === "employee" && (
            <EmployeeForm
              employee={employee}
              busy={busy}
              onSave={(e) => {
                if (
                  employee &&
                  employee.active &&
                  !e.active &&
                  !window.confirm("Desativar o acesso deste colaborador?")
                )
                  return;
                action(() => operationalApi.employee(e, !employee), "Colaborador atualizado.");
              }}
            />
          )}
          {modal === "detail" && actualSelected && (
            <ActivityDetails
              activity={actualSelected}
              data={data}
              employeeMode={role === "employee"}
              busy={busy}
              onSave={(a) =>
                action(
                  () => operationalApi.saveActivity(a),
                  "Atividade atualizada com sucesso.",
                )
              }
            />
          )}
        </Modal>
      )}
      {audit && (
        <Modal title="Detalhes da ação" onClose={() => setAudit(undefined)}>
          <div className="detail-grid">
            {Object.entries({
              Atividade: audit.activityId,
              Usuário: audit.user,
              Ação: audit.action,
              Data: new Date(audit.timestamp).toLocaleString("pt-BR"),
              "Status anterior": audit.from,
              "Novo status": audit.to,
              Motivo: audit.reason || "—",
              Observação: audit.note || "—",
            }).map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
