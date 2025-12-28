import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding categories and subcategories...");

  // Create categories with subcategories
  const categories = [
    {
      name: "Hardware",
      description: "Hardware-related issues",
      order: 1,
      subcategories: [
        { name: "Desktop/Laptop", description: "Desktop or laptop issues", order: 1 },
        { name: "Printer", description: "Printer-related problems", order: 2 },
        { name: "Monitor", description: "Display and monitor issues", order: 3 },
        { name: "Peripherals", description: "Keyboard, mouse, and other peripherals", order: 4 },
        { name: "Mobile Device", description: "Phones and tablets", order: 5 },
      ],
    },
    {
      name: "Software",
      description: "Software and application issues",
      order: 2,
      subcategories: [
        { name: "Operating System", description: "Windows, macOS, Linux issues", order: 1 },
        { name: "Office Applications", description: "Word, Excel, PowerPoint, etc.", order: 2 },
        { name: "Email", description: "Email client issues", order: 3 },
        { name: "Browser", description: "Web browser problems", order: 4 },
        { name: "Custom Applications", description: "Internal or business applications", order: 5 },
      ],
    },
    {
      name: "Network",
      description: "Network and connectivity issues",
      order: 3,
      subcategories: [
        { name: "Internet Connection", description: "Internet connectivity problems", order: 1 },
        { name: "WiFi", description: "Wireless network issues", order: 2 },
        { name: "VPN", description: "VPN connection problems", order: 3 },
        { name: "File Sharing", description: "Network drive and file sharing", order: 4 },
      ],
    },
    {
      name: "Access & Security",
      description: "Access control and security issues",
      order: 4,
      subcategories: [
        { name: "Password Reset", description: "Password reset requests", order: 1 },
        { name: "Account Access", description: "Account login issues", order: 2 },
        { name: "Permissions", description: "Access permission requests", order: 3 },
        { name: "Security Incident", description: "Security-related incidents", order: 4 },
      ],
    },
    {
      name: "Other",
      description: "Other issues and requests",
      order: 5,
      subcategories: [
        { name: "General Inquiry", description: "General questions", order: 1 },
        { name: "Feature Request", description: "Request for new features", order: 2 },
        { name: "Training", description: "Training and how-to questions", order: 3 },
      ],
    },
  ];

  for (const categoryData of categories) {
    const { subcategories, ...categoryInfo } = categoryData;

    const category = await prisma.category.upsert({
      where: { name: categoryInfo.name },
      update: categoryInfo,
      create: categoryInfo,
    });

    console.log(`Created/Updated category: ${category.name}`);

    // Create subcategories
    for (const subcategoryData of subcategories) {
      const subcategory = await prisma.subcategory.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: subcategoryData.name,
          },
        },
        update: subcategoryData,
        create: {
          ...subcategoryData,
          categoryId: category.id,
        },
      });

      console.log(`  - Created/Updated subcategory: ${subcategory.name}`);
    }
  }

  console.log("Categories and subcategories seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding categories:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
