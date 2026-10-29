"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ClipboardList,
  Clock3,
  CircleCheck,
  CircleAlert,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  X,
  ArrowUpRight,
  MapPin,
  ChevronRight,
} from "lucide-react";
import {
  Activity,
  DemoData,
  Employee,
  initials,
  statusClass,
  visibleStatus,
  statuses,
  images,
} from "@/lib/demanda";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">DEMANDA DIÁRIA</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status ${statusClass(status)}`}>
      <i />
      {status}
    </span>
  );
}
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return <span className={`avatar avatar-${index % 4}`}>{initials(name)}</span>;
}
export function Summary({
  activities,
  compact = false,
}: {
  activities: Activity[];
  compact?: boolean;
}) {
  const cards = [
    {
      label: "Total de atividades",
      value: activities.length,
      icon: ClipboardList,
      color: "info",
      caption: "Programadas para hoje",
    },
    {
      label: "Concluídas",
      value: activities.filter((a) => visibleStatus(a) === "Concluída").length,
      icon: CircleCheck,
      color: "success",
      caption: "Atividades finalizadas",
    },
    {
      label: "Pendentes",
      value: activities.filter((a) => visibleStatus(a) === "Pendente").length,
      icon: Clock3,
      color: "warning",
      caption: "Aguardando início",
    },
    {
      label: "Em andamento",
      value: activities.filter((a) => visibleStatus(a) === "Em andamento")
        .length,
      icon: LoaderCircle,
      color: "info",
      caption: "Em execução agora",
    },
    {
      label: "Não realizadas / atrasadas",
      value: activities.filter((a) =>
        ["Não realizada", "Atrasada"].includes(visibleStatus(a)),
      ).length,
      icon: CircleAlert,
      color: "danger",
      caption: "Precisam de atenção",
    },
  ];
  return (
    <div className={`summary-grid ${compact ? "employee-summary" : ""}`}>
      {(compact ? [cards[0], cards[2], cards[1]] : cards).map((c) => (
        <div className="summary-card" key={c.label}>
          <div className="summary-top">
            <span>{c.label}</span>
            <span className={`metric-icon ${c.color}`}>
              <c.icon size={17} />
            </span>
          </div>
          <strong>{String(c.value).padStart(2, "0")}</strong>
          <small>{c.caption}</small>
        </div>
      ))}
    </div>
  );
}
export function ActivityTable({
  activities,
  employees,
  onView,
  onEdit,
  onDelete,
  compact = false,
}: {
  activities: Activity[];
  employees: Employee[];
  onView: (a: Activity) => void;
  onEdit?: (a: Activity) => void;
  onDelete?: (a: Activity) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState(false);
  const [page, setPage] = useState(0);
  const filtered = activities
    .filter(
      (a) =>
        (!status || visibleStatus(a) === status) &&
        (!priority || a.priority === priority) &&
        `${a.title} ${a.location} ${employees.find((e) => e.matricula === a.employee)?.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort ? b.time.localeCompare(a.time) : a.time.localeCompare(b.time),
    );
  const limit = compact ? 5 : 10;
  return (
    <>
      <div className="table-toolbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Buscar atividades"
            placeholder="Buscar atividade, colaborador ou local..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="priority-filter">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Filtrar prioridade"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Prioridade</option>
            {["Alta", "Média", "Baixa"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Prioridade</th>
              <th>Atividade</th>
              <th>Colaborador</th>
              <th>
                <button onClick={() => setSort(!sort)}>
                  Horário <ArrowUpDown size={12} />
                </button>
              </th>
              <th>Local</th>
              <th>Status</th>
              {!compact && <th>Motivo</th>}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * limit, (page + 1) * limit).map((a) => {
              const employee = employees.find(
                (e) => e.matricula === a.employee,
              );
              return (
                <tr key={a.id}>
                  <td>
                    <span className={`priority priority-${a.priority}`}>
                      <i />
                      {a.priority}
                    </span>
                  </td>
                  <td>
                    <button
                      className="activity-title"
                      onClick={() => onView(a)}
                    >
                      {a.title}
                    </button>
                    <small>
                      {a.id} · {a.equipment}
                    </small>
                  </td>
                  <td>
                    <div className="person">
                      <Avatar
                        name={employee?.name || "Colaborador"}
                        index={employees.indexOf(employee!)}
                      />
                      <span>{employee?.name}</span>
                    </div>
                  </td>
                  <td className="time-cell">
                    <Clock3 size={13} /> {a.time}
                  </td>
                  <td>{a.location}</td>
                  <td>
                    <StatusBadge status={visibleStatus(a)} />
                  </td>
                  {!compact && <td>{a.reason || "—"}</td>}
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label={`Visualizar ${a.title}`}
                        onClick={() => onView(a)}
                      >
                        <Eye size={15} />
                      </button>
                      {onEdit && (
                        <button
                          aria-label={`Editar ${a.title}`}
                          onClick={() => onEdit(a)}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          aria-label={`Excluir ${a.title}`}
                          onClick={() => onDelete(a)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">
            <Search />
            <h3>Nenhuma atividade encontrada</h3>
            <p>Tente ajustar a busca ou os filtros.</p>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>
          Mostrando {Math.min(page * limit + 1, filtered.length)}–
          {Math.min((page + 1) * limit, filtered.length)} de {filtered.length}{" "}
          atividades
        </span>
        <div>
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <button className="page-number">{page + 1}</button>
          <button
            disabled={(page + 1) * limit >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Próxima <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
}
export function TeamCards({
  data,
  onEdit,
  compact = false,
}: {
  data: DemoData;
  onEdit?: (e: Employee) => void;
  compact?: boolean;
}) {
  return (
    <div className={`team-grid ${compact ? "compact" : ""}`}>
      {data.employees.map((e, i) => {
        const own = data.activities.filter((a) => a.employee === e.matricula);
        const done = own.filter((a) => a.status === "Concluída").length;
        const alert = own.some((a) =>
          ["Não realizada", "Atrasada"].includes(visibleStatus(a)),
        );
        return (
          <article className="team-card" key={e.matricula}>
            <div className="team-top">
              <Avatar name={e.name} index={i} />
              <span
                className={`status ${!e.active ? "neutral" : alert ? "warning" : "success"}`}
              >
                <i />
                {!e.active ? "Desativado" : alert ? "Atenção" : "Em dia"}
              </span>
              {onEdit && (
                <button
                  className="icon-button"
                  aria-label={`Editar ${e.name}`}
                  onClick={() => onEdit(e)}
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
            <h3>{e.name}</h3>
            <small>
              {e.team} <span>·</span> Turno {e.shift.toLowerCase()}
            </small>
            {!compact && <p className="muted">Matrícula {e.matricula}</p>}
            <div className="progress-label">
              <span>Atividades concluídas</span>
              <strong>
                {done}
                <span> / {own.length}</span>
              </strong>
            </div>
            <progress value={done} max={own.length || 1} />
          </article>
        );
      })}
    </div>
  );
}
export function OperationalPanels({
  data,
  onTeam,
}: {
  data: DemoData;
  onTeam: () => void;
}) {
  const failed = data.activities.filter((a) => a.status === "Não realizada");
  return (
    <>
      <div className="insights-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Motivos de não realização</h3>
            <span className="count">{failed.length}</span>
          </div>
          {failed.length ? (
            failed.slice(0, 3).map((a) => (
              <div className="reason-row" key={a.id}>
                <span className="reason-icon">
                  <CircleAlert size={17} />
                </span>
                <div>
                  <strong>{a.reason}</strong>
                  <small>{a.title}</small>
                </div>
                <span className="reason-count">1</span>
              </div>
            ))
          ) : (
            <p className="empty">Nenhuma ocorrência registrada.</p>
          )}
          <div className="panel-note">
            <span className="dot danger-dot" /> {failed.length} atividades
            precisam de acompanhamento
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>Visão por setor</h3>
            <span className="muted">Concluídas / total</span>
          </div>
          <div className="sector-list">
            {data.settings.sectors.map((s, i) => {
              const all = data.activities.filter((a) => a.sector === s);
              const done = all.filter((a) => a.status === "Concluída").length;
              return (
                <div className="sector" key={s}>
                  <img
                    src={[images.pump, images.tanks, images.well][i % 3]}
                    alt=""
                  />
                  <div>
                    <div className="progress-label">
                      <strong>{s}</strong>
                      <span>
                        {done} <span className="muted">/ {all.length}</span>
                      </span>
                    </div>
                    <progress value={done} max={all.length || 1} />
                  </div>
                  <strong className="sector-percent">
                    {Math.round((done / (all.length || 1)) * 100)}%
                  </strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel distribution">
          <div className="panel-heading">
            <h3>Situação das atividades</h3>
            <span className="muted">Hoje</span>
          </div>
          <div className="distribution-body">
            <div
              className="donut"
              style={{
                background: `conic-gradient(var(--success) 0 ${(data.activities.filter((a) => visibleStatus(a) === "Concluída").length / (data.activities.length || 1)) * 100}%,var(--warning) 0 ${(data.activities.filter((a) => ["Concluída", "Pendente"].includes(visibleStatus(a))).length / (data.activities.length || 1)) * 100}%,var(--primary) 0 ${(data.activities.filter((a) => ["Concluída", "Pendente", "Em andamento"].includes(visibleStatus(a))).length / (data.activities.length || 1)) * 100}%,var(--danger) 0)`,
              }}
            >
              <div>
                <strong>
                  {Math.round(
                    (data.activities.filter((a) => a.status === "Concluída")
                      .length /
                      (data.activities.length || 1)) *
                      100,
                  )}
                  <small>%</small>
                </strong>
                <span>concluído</span>
              </div>
            </div>
            <div className="legend">
              {statuses.map((s) => (
                <div key={s}>
                  <span className={`dot ${statusClass(s)}-dot`} />
                  <span>{s}</span>
                  <strong>
                    {
                      data.activities.filter((a) => visibleStatus(a) === s)
                        .length
                    }
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <section className="panel team-panel">
        <div className="panel-heading">
          <div>
            <h3>Equipe em operação</h3>
            <p>Acompanhe o progresso de cada colaborador.</p>
          </div>
          <button className="text-link" onClick={onTeam}>
            Ver equipe <ArrowUpRight size={15} />
          </button>
        </div>
        <TeamCards data={data} compact />
      </section>
    </>
  );
}
