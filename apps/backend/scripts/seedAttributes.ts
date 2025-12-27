import { config } from "dotenv";
import { AttributeType } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

config();

async function main() {
  console.log("🌱 Seeding default ticket attributes...");

  const defaultAttributes = [
    {
      name: "sla",
      label: "SLA",
      type: AttributeType.select,
      options: ["24h", "48h", "72h", "1 week"],
      defaultValue: "48h",
      isMandatory: false,
      isVisible: true,
      order: 0,
    },
    {
      name: "impact",
      label: "Impact",
      type: AttributeType.select,
      options: ["low", "medium", "high", "critical"],
      defaultValue: "medium",
      isMandatory: false,
      isVisible: true,
      order: 1,
    },
    {
      name: "urgency",
      label: "Urgency",
      type: AttributeType.select,
      options: ["low", "medium", "high", "critical"],
      defaultValue: "medium",
      isMandatory: false,
      isVisible: true,
      order: 2,
    },
    {
      name: "department",
      label: "Department",
      type: AttributeType.select,
      options: ["IT", "HR", "Finance", "Operations", "Marketing"],
      isMandatory: false,
      isVisible: true,
      order: 3,
    },
    {
      name: "location",
      label: "Location",
      type: AttributeType.text,
      options: [],
      isMandatory: false,
      isVisible: true,
      order: 4,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const attr of defaultAttributes) {
    const existing = await prisma.ticketAttribute.findUnique({
      where: { name: attr.name },
    });

    if (existing) {
      console.log(`⏭️  Skipping existing attribute: ${attr.name}`);
      skipped++;
      continue;
    }

    await prisma.ticketAttribute.create({
      data: attr,
    });

    console.log(`✅ Created attribute: ${attr.name} (${attr.label})`);
    created++;
  }

  console.log(
    `\n🎉 Seeding complete! Created ${created} attributes, skipped ${skipped}.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed attributes", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
