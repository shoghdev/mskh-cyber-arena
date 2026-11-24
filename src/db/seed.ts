/* Seed script — creates the initial tournament data.
   Run: npx tsx src/db/seed.ts  (idempotent: skips if data exists) */
import "dotenv/config";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  users,
  schools,
  teams,
  tournaments,
  stages,
  tasks,
  taskOptions,
  criteria,
  tournamentState,
} from "./schema";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped: data already exists.");
    return;
  }

  console.log("Seeding MSKH Cyber Arena…");

  /* Users */
  await db.insert(users).values([
    {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      name: "Կազմակերպիչ",
      role: "admin",
    },
    {
      username: "jury1",
      passwordHash: hashPassword("jury123"),
      name: "Ժյուրի 1",
      role: "jury",
    },
    {
      username: "jury2",
      passwordHash: hashPassword("jury123"),
      name: "Ժյուրի 2",
      role: "jury",
    },
    {
      username: "jury3",
      passwordHash: hashPassword("jury123"),
      name: "Ժյուրի 3",
      role: "jury",
    },
  ]);

  /* Schools */
  const schoolRows = await db
    .insert(schools)
    .values([
      { name: "Արևելյան դպրոց-պարտեզ", shortCode: "EAST", color: "#22d3ee" },
      { name: "Արևմտյան դպրոց-պարտեզ", shortCode: "WEST", color: "#a78bfa" },
      {
        name: "Հյուսիսային դպրոց-պարտեզ",
        shortCode: "NORTH",
        color: "#34d399",
      },
      { name: "Հարավային դպրոց-պարտեզ", shortCode: "SOUTH", color: "#fbbf24" },
    ])
    .returning();

  const byCode = Object.fromEntries(schoolRows.map((s) => [s.shortCode, s.id]));

  /* Teams */
  await db.insert(teams).values([
    {
      name: "ԿիբեռՀսկիչներ",
      schoolId: byCode.EAST,
      grade: "5-րդ",
      members: "Անդամ 1, Անդամ 2, Անդամ 3",
      accessCode: "EAST-K7P2",
    },
    {
      name: "Ցանցային Վահան",
      schoolId: byCode.EAST,
      grade: "6-րդ",
      members: "Անդամ 1, Անդամ 2",
      accessCode: "EAST-M4Q9",
    },
    {
      name: "Ֆայրուոլ Վարպետներ",
      schoolId: byCode.WEST,
      grade: "4-րդ",
      members: "Անդամ 1, Անդամ 2, Անդամ 3",
      accessCode: "WEST-X3T8",
    },
    {
      name: "Պաշտպան Ռոբոտներ",
      schoolId: byCode.WEST,
      grade: "6-րդ",
      members: "Անդամ 1, Անդամ 2",
      accessCode: "WEST-B6N5",
    },
    {
      name: "Վտանգի Որսորդներ",
      schoolId: byCode.NORTH,
      grade: "5-րդ",
      members: "Անդամ 1, Անդամ 2, Անդամ 3",
      accessCode: "NORTH-R9D4",
    },
    {
      name: "Սկաներներ",
      schoolId: byCode.NORTH,
      grade: "6-րդ",
      members: "Անդամ 1, Անդամ 2",
      accessCode: "NORTH-L2W7",
    },
    {
      name: "Ծածկագիր",
      schoolId: byCode.SOUTH,
      grade: "4-րդ",
      members: "Անդամ 1, Անդամ 2, Անդամ 3",
      accessCode: "SOUTH-Z8F3",
    },
    {
      name: "Վահան",
      schoolId: byCode.SOUTH,
      grade: "5-րդ",
      members: "Անդամ 1, Անդամ 2",
      accessCode: "SOUTH-C5H6",
    },
  ]);

  /* Tournament */
  const [tournament] = await db
    .insert(tournaments)
    .values({
      name: "MSKH Cyber Arena",
      description:
        "«Կիբեռպաշտպաններ» կրթական նախագծի մրցութային փուլը 4–6-րդ դասարանների սովորողների համար։ Սովորող-սովորեցնող մեթոդով կիբեռանվտանգության մրցույթ։",
      date: new Date().toISOString().slice(0, 10),
      status: "draft",
    })
    .returning();

  /* Stages */
  const stageRows = await db
    .insert(stages)
    .values([
      {
        tournamentId: tournament.id,
        name: "Ուսումնական տեսանյութ",
        description:
          "Թիմերի նախապես պատրաստած 1–2 րոպեանոց տեսանյութերը կիբեռանվտանգության կանոնների մասին։",
        order: 1,
      },
      {
        tournamentId: tournament.id,
        name: "«Ո՞վ է ուզում դառնալ կիբեռպաշտպան»",
        description: "Թիմային վիկտորինա կիբեռանվտանգության թեմաներով։",
        order: 2,
      },
      {
        tournamentId: tournament.id,
        name: "«Որսա՛ վտանգը»",
        description:
          "Էկրանին ցուցադրված կեղծ նամակներում և հաղորդագրություններում վտանգի հայտնաբերում։",
        order: 3,
      },
      {
        tournamentId: tournament.id,
        name: "Թվային խաղի ներկայացում",
        description:
          "Scratch-ով կամ այլ գործիքով պատրաստված ուսուցողական խաղերի ներկայացում։",
        order: 4,
      },
      {
        tournamentId: tournament.id,
        name: "Սցենարային լուծումներ",
        description:
          "Իրական կյանքին մոտ իրավիճակների անվտանգ և հիմնավորված լուծումներ։",
        order: 5,
      },
    ])
    .returning();

  const [s1, s2, s3, s4, s5] = stageRows;

  /* Tasks */
  const [t1] = await db
    .insert(tasks)
    .values({
      stageId: s1.id,
      title: "Ուսումնական տեսանյութի ներկայացում",
      description:
        "Ներկայացրեք ձեր թիմի նախապես պատրաստած 1–2 րոպեանոց տեսանյութը կամ անիմացիան, որը բացատրում է կիբեռանվտանգության որևէ կանոն։ Ուղարկեք տեսանյութի հղումը։",
      type: "video",
      order: 1,
      durationSec: 600,
      maxScore: 100,
      answerFormat: "link",
      status: "ready",
    })
    .returning();

  const [t2] = await db
    .insert(tasks)
    .values({
      stageId: s2.id,
      title: "Գաղտնաբառերի անվտանգություն",
      description:
        "Ընտրեք բոլոր ճիշտ պատասխանները։ Ո՞ր գաղտնաբառերն են համարվում անվտանգ։",
      type: "quiz",
      order: 1,
      durationSec: 120,
      maxScore: 150,
      answerFormat: "choice",
      autoGrade: true,
      status: "ready",
    })
    .returning();

  await db.insert(taskOptions).values([
    {
      taskId: t2.id,
      text: "Tr!o#9Lm$2Kp — երկար, տարբեր նշաններով",
      isCorrect: true,
      order: 1,
    },
    {
      taskId: t2.id,
      text: "123456789 — հեշտ է հիշել",
      isCorrect: false,
      order: 2,
    },
    { taskId: t2.id, text: "Sunshine2025!", isCorrect: true, order: 3 },
    {
      taskId: t2.id,
      text: "qwerty — ստեղնաշարի հաջորդականություն",
      isCorrect: false,
      order: 4,
    },
  ]);

  const [t3] = await db
    .insert(tasks)
    .values({
      stageId: s3.id,
      title: "Կասկածելի նամակ",
      description:
        "Էկրանին ցուցադրված է նամակ․ «Հարգելի օգտատեր, Ձեր հաշիվը կարգելափակվի 24 ժամում։ Անհետաձգելի սեղմեք այս հղումը և մուտքագրեք Ձեր գաղտնաբառը՝ http://bank-security-check.example — Հարգանքով, Բանկի աջակցություն»։\n\nԳտեք և թվարկեք բոլոր վտանգավոր նշանները և հիմնավորեք, թե ինչու է սա խաբեության փորձ։",
      type: "threat",
      order: 1,
      durationSec: 300,
      maxScore: 150,
      answerFormat: "text",
      status: "ready",
    })
    .returning();

  const [t4] = await db
    .insert(tasks)
    .values({
      stageId: s4.id,
      title: "Թվային խաղի ներկայացում",
      description:
        "Ներկայացրեք Scratch-ով կամ այլ գործիքով պատրաստած ձեր ուսուցողական խաղը, որը սովորեցնում է անվտանգ վարքագիծ համացանցում։ Ուղարկեք նախագծի հղումը։",
      type: "game",
      order: 1,
      durationSec: 600,
      maxScore: 100,
      answerFormat: "link",
      status: "ready",
    })
    .returning();

  const [t5] = await db
    .insert(tasks)
    .values({
      stageId: s5.id,
      title: "Սցենար․ անծանոթ հղում խմբաչաթում",
      description:
        "Դասարանի խմբաչաթում անծանոթ հաշիվ գրում է․ «Բարև բոլորին։ Սեղմեք այս հղումը և կստանաք անվճար խաղային արժույթ։ Պետք է միայն մուտքագրել ձեր էլ․ փոստը և գաղտնաբառը»։ Ձեր ընկերն արդեն պատրաստվում է սեղմել հղումը։\n\nՆկարագրեք քայլ առ քայլ, թե ինչ կանեք դուք և ինչ կխորհուրդ տաք ընկերոջը։",
      type: "scenario",
      order: 1,
      durationSec: 420,
      maxScore: 100,
      answerFormat: "text",
      status: "ready",
    })
    .returning();

  /* Criteria */
  await db.insert(criteria).values([
    {
      taskId: t1.id,
      name: "Բովանդակություն և թեմայի բացատրություն",
      maxPoints: 40,
      order: 1,
    },
    {
      taskId: t1.id,
      name: "Տեխնիկական որակ և ստեղծագործություն",
      maxPoints: 30,
      order: 2,
    },
    { taskId: t1.id, name: "Թիմային ներկայացում", maxPoints: 30, order: 3 },
    { taskId: t3.id, name: "Վտանգի հայտնաբերում", maxPoints: 60, order: 1 },
    {
      taskId: t3.id,
      name: "Հիմնավորված բացատրություն",
      maxPoints: 50,
      order: 2,
    },
    {
      taskId: t3.id,
      name: "Անվտանգ գործողությունների առաջարկ",
      maxPoints: 40,
      order: 3,
    },
    { taskId: t4.id, name: "Խաղային մեխանիկա", maxPoints: 35, order: 1 },
    { taskId: t4.id, name: "Ուսուցողական արժեք", maxPoints: 35, order: 2 },
    { taskId: t4.id, name: "Դիզայն և ներկայացում", maxPoints: 30, order: 3 },
    { taskId: t5.id, name: "Խնդրի ճիշտ ընկալում", maxPoints: 25, order: 1 },
    { taskId: t5.id, name: "Անվտանգ լուծման առաջարկ", maxPoints: 35, order: 2 },
    { taskId: t5.id, name: "Հիմնավորում", maxPoints: 25, order: 3 },
    { taskId: t5.id, name: "Թիմային ներկայացում", maxPoints: 15, order: 4 },
  ]);

  /* Initial live state */
  await db.insert(tournamentState).values({
    tournamentId: tournament.id,
    screenMode: "lobby",
  });

  console.log("Seed complete.");
  console.log("Admin:  admin / mskhkiber123");
  console.log("Jury:   jury1..jury3 / jury123");
  console.log(
    "Teams:  EAST-K7P2, EAST-M4Q9, WEST-X3T8, WEST-B6N5, NORTH-R9D4, NORTH-L2W7, SOUTH-Z8F3, SOUTH-C5H6",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
