import {
  boolean,
  jsonb,
  text,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const userProfile = pgTable("user_profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("employee"), // 'supervisor' | 'employee'
  employeeCode: text("employeeCode"),
  team: text("team"),
  unit: text("unit"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const employee = pgTable("employee", {
  matricula: text("matricula").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  team: text("team").notNull(),
  shift: text("shift").notNull(),
  specialties: text("specialties").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activity = pgTable("activity", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  why: text("why").notNull(),
  priority: text("priority").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  equipment: text("equipment").notNull(),
  sector: text("sector").notNull(),
  well: text("well").notNull(),
  employee: text("employee")
    .notNull()
    .references(() => employee.matricula),
  team: text("team").notNull(),
  shift: text("shift").notNull(),
  status: text("status").notNull().default("Pendente"),
  note: text("note").notNull().default(""),
  reason: text("reason").notNull().default(""),
  attachments: jsonb("attachments").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  justificationAt: timestamp("justification_at"),
});

export const activityHistory = pgTable("activity_history", {
  id: text("id").primaryKey(),
  activityId: text("activity_id")
    .notNull()
    .references(() => activity.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  user: text("user_name").notNull(),
  action: text("action").notNull(),
  from: text("from_status").notNull(),
  to: text("to_status").notNull(),
  reason: text("reason").notNull().default(""),
  note: text("note").notNull().default(""),
});

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("default"),
  organization: text("organization").notNull(),
  supervisorName: text("supervisor_name").notNull(),
  supervisorMatricula: text("supervisor_matricula").notNull(),
  teams: text("teams").array().notNull().default([]),
  shifts: text("shifts").array().notNull().default([]),
  sectors: text("sectors").array().notNull().default([]),
  locations: text("locations").array().notNull().default([]),
  equipment: text("equipment").array().notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  sessions: many(session),
  accounts: many(account),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
