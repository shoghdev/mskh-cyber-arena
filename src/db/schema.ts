import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------ Users & auth ------------------------------ */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("jury"), // 'admin' | 'jury'
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'admin' | 'jury' | 'team'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_team_idx").on(t.teamId), index("sessions_user_idx").on(t.userId)],
);

/* --------------------------- Structure: schools --------------------------- */

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortCode: text("short_code").notNull(), // EAST / WEST / NORTH / SOUTH
  color: text("color").notNull().default("#22d3ee"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    schoolId: integer("school_id")
      .references(() => schools.id, { onDelete: "cascade" })
      .notNull(),
    grade: text("grade").notNull().default(""),
    members: text("members").notNull().default(""),
    accessCode: text("access_code").notNull().unique(),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("teams_school_idx").on(t.schoolId)],
);

/* ------------------------------ Tournaments ------------------------------- */

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  date: text("date").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft|ready|live|paused|finished
  scoringMethod: text("scoring_method").notNull().default("average"), // average
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stages = pgTable(
  "stages",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id")
      .references(() => tournaments.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    order: integer("order").notNull().default(0),
    status: text("status").notNull().default("pending"), // pending|active|completed
  },
  (t) => [index("stages_tournament_idx").on(t.tournamentId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    stageId: integer("stage_id")
      .references(() => stages.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: text("type").notNull().default("scenario"), // quiz|threat|scenario|video|game
    order: integer("order").notNull().default(0),
    durationSec: integer("duration_sec").notNull().default(300),
    maxScore: integer("max_score").notNull().default(100),
    mediaUrl: text("media_url").notNull().default(""),
    answerFormat: text("answer_format").notNull().default("text"), // choice|text|link
    autoGrade: boolean("auto_grade").notNull().default(false),
    status: text("status").notNull().default("draft"), // draft|ready|active|closed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tasks_stage_idx").on(t.stageId)],
);

export const taskOptions = pgTable(
  "task_options",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("task_options_task_idx").on(t.taskId)],
);

export const criteria = pgTable(
  "evaluation_criteria",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    maxPoints: integer("max_points").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("criteria_task_idx").on(t.taskId)],
);

/* ----------------------------- Submissions -------------------------------- */

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    teamId: integer("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    textAnswer: text("text_answer").notNull().default(""),
    linkUrl: text("link_url").notNull().default(""),
    selectedOptions: jsonb("selected_options").$type<number[]>().notNull().default([]),
    autoScore: integer("auto_score"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("submissions_task_team_unique").on(t.taskId, t.teamId),
    index("submissions_task_idx").on(t.taskId),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    juryId: integer("jury_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    criteriaScores: jsonb("criteria_scores").$type<Record<string, number>>().notNull().default({}),
    totalScore: integer("total_score").notNull().default(0),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("evaluations_submission_jury_unique").on(t.submissionId, t.juryId),
    index("evaluations_submission_idx").on(t.submissionId),
  ],
);

export const scores = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    teamId: integer("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(0),
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    unique("scores_task_team_unique").on(t.taskId, t.teamId),
    index("scores_team_idx").on(t.teamId),
  ],
);

/* --------------------------- Live tournament state ------------------------ */

export const tournamentState = pgTable("tournament_state", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id, { onDelete: "set null" }),
  screenMode: text("screen_mode").notNull().default("lobby"),
  // lobby|task_intro|task_live|time_up|submissions_closed|judging|leaderboard|break|winners
  activeStageId: integer("active_stage_id").references(() => stages.id, { onDelete: "set null" }),
  activeTaskId: integer("active_task_id").references(() => tasks.id, { onDelete: "set null" }),
  timerState: text("timer_state").notNull().default("idle"), // idle|running|paused|finished
  timerDurationSec: integer("timer_duration_sec").notNull().default(0),
  timerEndsAt: timestamp("timer_ends_at", { withTimezone: true }),
  timerRemainingMs: integer("timer_remaining_ms").notNull().default(0),
  submissionsOpen: boolean("submissions_open").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* --------------------------------- Types ---------------------------------- */

export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type School = typeof schools.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskOption = typeof taskOptions.$inferSelect;
export type Criterion = typeof criteria.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type TournamentState = typeof tournamentState.$inferSelect;
