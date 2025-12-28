import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [users, categories, subcategories, slas, workflows, workflowSteps, tickets, comments, autoAssigns] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.subcategory.count(),
    prisma.sla.count(),
    prisma.workflow.count(),
    prisma.workflowStep.count(),
    prisma.ticket.count(),
    prisma.ticketComment.count(),
    prisma.agentAutoAssign.count()
  ]);

  console.log("\n✓ Seeded Data Verification:");
  console.log("  Users:", users);
  console.log("  Categories:", categories);
  console.log("  Subcategories:", subcategories);
  console.log("  SLAs:", slas);
  console.log("  Workflows:", workflows);
  console.log("  Workflow Steps:", workflowSteps);
  console.log("  Tickets:", tickets);
  console.log("  Comments:", comments);
  console.log("  Auto-Assign Rules:", autoAssigns);

  // Detailed verification
  console.log("\n✓ Sample Data:");
  
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@helpdesk.pk" } });
  console.log("  Admin user:", adminUser?.name, `(${adminUser?.email})`);

  const itCategory = await prisma.category.findFirst({ where: { name: "IT Support" }, include: { subcategories: true } });
  console.log("  IT Support category:", itCategory?.name, `- ${itCategory?.subcategories.length} subcategories`);

  const internetWorkflow = await prisma.workflow.findFirst({ 
    where: { name: "Internet Restoration Workflow" }, 
    include: { steps: { orderBy: { order: "asc" } } } 
  });
  console.log("  Internet workflow:", internetWorkflow?.name, `- ${internetWorkflow?.steps.length} steps`);
  
  const sampleTickets = await prisma.ticket.findMany({ 
    take: 2, 
    include: { 
      category: true, 
      subcategory: true, 
      assignee: true,
      workflow: { include: { steps: true } },
      comments: true
    } 
  });
  console.log("\n  Sample Tickets:");
  sampleTickets.forEach((t, i) => {
    console.log(`    ${i + 1}. ${t.description.substring(0, 50)}...`);
    console.log(`       Category: ${t.category?.name} > ${t.subcategory?.name}`);
    console.log(`       Assigned to: ${t.assignee?.name}`);
    console.log(`       Workflow: ${t.workflow?.name} (${t.workflow?.steps.length} steps)`);
    console.log(`       Comments: ${t.comments.length}`);
  });

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
