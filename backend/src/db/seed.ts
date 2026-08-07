import "dotenv/config";
import { db, runMigrations } from "./index.js";
import {
  documents,
  events,
  financialYears,
  notes,
  ownerships,
  people,
  sources,
  subcontractors,
  tasks,
  teamMembers,
} from "./schema.js";
import { REQUIRED_MEMBERS } from "./teamCleanup.js";

async function main() {
  runMigrations();
  console.log("Seeding…");

  // Clear existing data (order matters for FK constraints).
  await db.delete(notes);
  await db.delete(tasks);
  await db.delete(documents);
  await db.delete(financialYears);
  await db.delete(people);
  await db.delete(ownerships);
  await db.delete(events);
  await db.delete(subcontractors);
  await db.delete(sources);
  await db.delete(teamMembers);

  const teamRows = await db
    .insert(teamMembers)
    .values(REQUIRED_MEMBERS.map((m) => ({ name: m.name, role: m.role, initials: m.initials, active: true })))
    .returning();
  const byName = (name: string) => teamRows.find((m) => m.name === name)!;

  await db.insert(sources).values([
    { name: "Official company register", desc: "Management, board, address and registration changes", frequency: "Daily", enabled: true },
    { name: "Annual accounts register", desc: "Submitted accounts and key reported figures", frequency: "Weekly", enabled: true },
    { name: "Credit information provider", desc: "Credit assessments and payment remarks", frequency: "Daily", enabled: true },
    { name: "Register of mortgaged movable property", desc: "Registered charges on assets and equipment", frequency: "Weekly", enabled: true },
    { name: "Internal document archive", desc: "Insurance, certificates and contract expiry dates", frequency: "Daily", enabled: false },
  ]);

  // Real Norwegian organisation numbers (public entities, safe to use as
  // demo data) paired with the fictional trading names from the design.
  const companyDefs = [
    { company: "Nordvik Bygg AS", orgNr: "923609016", category: "Groundworks", owner: "Mohammad Khajavi" },
    { company: "Fjellstrand Elektro AS", orgNr: "984851006", category: "Electrical", owner: "Linda Roed" },
    { company: "Hansteen Ventilasjon AS", orgNr: "916879067", category: "HVAC", owner: "Mohammad Khajavi" },
    { company: "Sørlandet Rørservice AS", orgNr: "985399077", category: "Plumbing", owner: "Linda Roed" },
    { company: "Bergheim Transport AS", orgNr: "914778271", category: "Logistics", owner: "Mohammad Khajavi" },
    { company: "Kvernland Stillas AS", orgNr: "917422575", category: "Scaffolding", owner: "Mohammad Khajavi" },
    { company: "Lysaker Maskin AS", orgNr: "981585378", category: "Heavy equipment", owner: "Linda Roed" },
    { company: "Storøy Malerservice AS", orgNr: "912660680", category: "Painting", owner: "Mohammad Khajavi" },
    { company: "Trondheim Grunnteknikk AS", orgNr: "989522951", category: "Geotechnical", owner: "Linda Roed" },
    { company: "Vestby Sikkerhet AS", orgNr: "920268082", category: "Site security", owner: "Mohammad Khajavi" },
  ];

  const subRows = await db
    .insert(subcontractors)
    .values(
      companyDefs.map((c) => ({
        company: c.company,
        orgNr: c.orgNr,
        country: "NO",
        category: c.category,
        legalForm: "Aksjeselskap (AS)",
        registeredOn: "2009-03-14",
        industryCode: "43.120 Site preparation",
        employees: 38,
        municipality: "Oslo",
        vatRegistered: true,
        auditor: "Vika Revisjon AS",
        shareCapital: "NOK 2 500 000",
        address: "Nydalsveien 28, 0484 Oslo",
        postalAddress: "Postboks 118, 0409 Oslo",
        contactEmail: `post@${c.company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.no`,
        contactPhone: "+47 22 84 10 00",
        ownerId: byName(c.owner).id,
        aiSummary:
          "Recent changes have been identified during the last 60 days. These changes do not establish that the subcontractor is unable to perform its obligations, but the combined information may justify further review.",
      }))
    )
    .returning();
  const byCompany = (name: string) => subRows.find((c) => c.company === name)!;

  for (const c of companyDefs) {
    const sub = byCompany(c.company);
    await db.insert(financialYears).values([
      { subcontractorId: sub.id, year: 2023, operatingRevenue: 46.1, operatingResult: 2.8, resultBeforeTax: 2.4, equityRatio: 0.28, liquidityRatio: 1.4, employees: 31 },
      { subcontractorId: sub.id, year: 2024, operatingRevenue: 52.7, operatingResult: 3.4, resultBeforeTax: 3.0, equityRatio: 0.31, liquidityRatio: 1.5, employees: 35 },
      { subcontractorId: sub.id, year: 2025, operatingRevenue: 61.2, operatingResult: 3.1, resultBeforeTax: 2.6, equityRatio: 0.29, liquidityRatio: 1.3, employees: 38 },
    ]);
    await db.insert(people).values([
      { subcontractorId: sub.id, name: "Erik Hansen", role: "Managing director", since: "Since May 2026" },
      { subcontractorId: sub.id, name: "Anna Larsen", role: "Chair of the board", since: "Since 2018" },
      { subcontractorId: sub.id, name: "Tore Bakken", role: "Board member", since: "Since 2021" },
      { subcontractorId: sub.id, name: "Sigrid Moen", role: "Board member", since: "Since 2024" },
    ]);
    await db.insert(ownerships).values([
      { subcontractorId: sub.id, name: `${c.company.split(" ")[0]} Holding AS`, sharePercent: 68 },
      { subcontractorId: sub.id, name: "Anna Larsen", sharePercent: 22 },
      { subcontractorId: sub.id, name: "Other shareholders", sharePercent: 10 },
    ]);
    await db.insert(documents).values([
      { subcontractorId: sub.id, name: "Liability insurance certificate", type: "Insurance", uploadedAt: new Date("2025-08-17"), validUntil: new Date("2026-08-17"), note: "Expires in 14 days" },
      { subcontractorId: sub.id, name: "Tax compliance certificate", type: "Public certificate", uploadedAt: new Date("2026-03-30"), validUntil: new Date("2026-09-30"), note: "Valid" },
      { subcontractorId: sub.id, name: "HSE declaration 2026", type: "Declaration", uploadedAt: new Date("2026-01-12"), validUntil: new Date("2027-01-12"), note: "Valid" },
      { subcontractorId: sub.id, name: "Framework agreement, signed", type: "Contract", uploadedAt: new Date("2024-02-04"), validUntil: new Date("2027-12-31"), note: "Valid" },
      { subcontractorId: sub.id, name: "Annual accounts 2025", type: "Financial", uploadedAt: new Date("2026-05-02"), note: "Reference document" },
    ]);
  }

  const eventDefs = [
    { company: "Nordvik Bygg AS", type: "Managing director changed", attention: "REVIEW_RECOMMENDED", followUp: "UNRESOLVED", source: "Official company register", previousValue: "Anna Larsen", currentValue: "Erik Hansen", owner: "Mohammad Khajavi", description: "The registered managing director changed from Anna Larsen to Erik Hansen. The registration was confirmed in the official company register.", ai: "A change in management may be a routine organisational event. It can still be relevant to review when combined with other financial or operational changes." },
    { company: "Fjellstrand Elektro AS", type: "Credit rating updated", attention: "CHANGE_DETECTED", followUp: "UNRESOLVED", source: "Credit information provider", previousValue: "Assessment from Sep 2025", currentValue: "Assessment from Mar 2026", owner: "Linda Roed", description: "The external credit assessment was updated following submission of new accounting figures. Payment history over the last 12 months is unchanged.", ai: "The external assessment was refreshed after new figures became available. The underlying payment history is unchanged for the period." },
    { company: "Hansteen Ventilasjon AS", type: "Insurance document expires soon", attention: "TIME_SENSITIVE", followUp: "TASK_CREATED", source: "Internal document archive", previousValue: "Valid", currentValue: "Expires in 14 days", owner: "Mohammad Khajavi", description: "Liability insurance certificate expires in 14 days. An updated certificate has not yet been received.", ai: "" },
    { company: "Kvernland Stillas AS", type: "Board member changed", attention: "CHANGE_DETECTED", followUp: "UNRESOLVED", source: "Official company register", previousValue: "4 members", currentValue: "4 members (1 replaced)", owner: "Mohammad Khajavi", description: "One board member resigned and a new member was registered. The board still meets the minimum composition requirement.", ai: "" },
    { company: "Lysaker Maskin AS", type: "New registered charge identified", attention: "REVIEW_RECOMMENDED", followUp: "TASK_CREATED", source: "Register of mortgaged movable property", previousValue: "No registered charges", currentValue: "One charge on operating equipment", owner: "Linda Roed", description: "A new charge was registered on operating equipment. The amount and secured party are stated in the register entry.", ai: "A registered charge indicates secured financing. This is common in the industry and does not on its own indicate payment difficulties." },
    { company: "Sørlandet Rørservice AS", type: "Annual accounts submitted", attention: "NEW_INFORMATION", followUp: "REVIEWED", source: "Annual accounts register", previousValue: "2024 accounts, submitted 28 Jun 2025", currentValue: "2025 accounts, submitted 30 Apr 2026", owner: "Linda Roed", description: "Annual accounts for 2025 were submitted within the deadline. Operating revenue and equity are reported as increased from the previous year.", ai: "Accounts were submitted within the statutory deadline. Reported figures are available in the financial information tab for comparison across years." },
    { company: "Bergheim Transport AS", type: "Company address changed", attention: "NEW_INFORMATION", followUp: "REVIEWED", source: "Official company register", previousValue: "Storgata 14, 0184 Oslo", currentValue: "Nydalsveien 28, 0484 Oslo", owner: "Mohammad Khajavi", description: "The registered business address was updated within the same municipality. Contact details in the platform were updated accordingly.", ai: "An address change within the same municipality is normally administrative. Contract and invoicing details may need updating internally." },
    { company: "Trondheim Grunnteknikk AS", type: "Auditor changed", attention: "NEW_INFORMATION", followUp: "REVIEWED", source: "Official company register", previousValue: "Previous auditor", currentValue: "Vika Revisjon AS", owner: "Linda Roed", description: "A new auditor was registered. The previous auditor engagement ended by mutual agreement according to the register entry.", ai: "" },
  ] as const;

  const eventRows: (typeof events.$inferSelect)[] = [];
  for (let i = 0; i < eventDefs.length; i++) {
    const e = eventDefs[i];
    const [created] = await db
      .insert(events)
      .values({
        subcontractorId: byCompany(e.company).id,
        type: e.type,
        description: e.description,
        attention: e.attention,
        followUp: e.followUp,
        source: e.source,
        previousValue: e.previousValue,
        currentValue: e.currentValue,
        aiExplanation: e.ai || null,
        reviewed: e.followUp === "REVIEWED",
        ownerId: byName(e.owner).id,
        detectedAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000),
      })
      .returning();
    eventRows.push(created);
  }
  const eventByType = (type: string) => eventRows.find((e) => e.type === type)!;

  await db.insert(tasks).values([
    { title: "Request updated insurance certificate", subcontractorId: byCompany("Hansteen Ventilasjon AS").id, eventId: eventByType("Insurance document expires soon").id, ownerId: byName("Mohammad Khajavi").id, due: new Date("2026-08-12"), priority: "HIGH", status: "IN_PROGRESS", comment: "2 comments" },
    { title: "Review new management registration", subcontractorId: byCompany("Nordvik Bygg AS").id, eventId: eventByType("Managing director changed").id, ownerId: byName("Mohammad Khajavi").id, due: new Date("2026-08-14"), priority: "NORMAL", status: "NOT_STARTED", comment: "1 comment" },
    { title: "Clarify registered charge with supplier", subcontractorId: byCompany("Lysaker Maskin AS").id, eventId: eventByType("New registered charge identified").id, ownerId: byName("Linda Roed").id, due: new Date("2026-08-18"), priority: "NORMAL", status: "WAITING_FOR_INFORMATION", comment: "3 comments" },
    { title: "Document review of 2025 accounts", subcontractorId: byCompany("Sørlandet Rørservice AS").id, eventId: eventByType("Annual accounts submitted").id, ownerId: byName("Linda Roed").id, due: new Date("2026-08-21"), priority: "LOW", status: "IN_PROGRESS" },
    { title: "Confirm board composition in contract file", subcontractorId: byCompany("Kvernland Stillas AS").id, eventId: eventByType("Board member changed").id, ownerId: byName("Mohammad Khajavi").id, due: new Date("2026-08-25"), priority: "LOW", status: "NOT_STARTED" },
    { title: "Archive updated address details", subcontractorId: byCompany("Bergheim Transport AS").id, eventId: eventByType("Company address changed").id, ownerId: byName("Mohammad Khajavi").id, due: new Date("2026-07-28"), priority: "LOW", status: "COMPLETED", comment: "1 comment" },
  ]);

  await db.insert(notes).values([
    { subcontractorId: byCompany("Nordvik Bygg AS").id, authorId: byName("Mohammad Khajavi").id, text: "Spoke with the new managing director. Ongoing assignments continue with the same site management, and the project plan for Grefsen is unchanged.", createdAt: new Date("2026-05-15") },
    { subcontractorId: byCompany("Sørlandet Rørservice AS").id, authorId: byName("Linda Roed").id, text: "Reviewed the 2025 accounts together with finance. Revenue growth is in line with the reported order book. Operating result is slightly lower, noted for the next quarterly follow-up.", createdAt: new Date("2026-05-07") },
    { subcontractorId: byCompany("Lysaker Maskin AS").id, authorId: byName("Linda Roed").id, text: "Registered charge relates to financing of two new excavators according to the supplier. Documentation requested for the contract file.", createdAt: new Date("2026-04-29") },
  ]);

  console.log(`Seeded ${teamRows.length} team members, ${subRows.length} subcontractors, ${eventRows.length} events.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
