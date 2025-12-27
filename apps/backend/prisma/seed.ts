import { PrismaClient, Role, TicketPriority, TicketStatus, IssueType, AttributeType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  adapter,
} as any);

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.$transaction([
    prisma.ticketAttributeValue.deleteMany(),
    prisma.ticketWorkflowStep.deleteMany(),
    prisma.ticketActivity.deleteMany(),
    prisma.ticketTagRelation.deleteMany(),
    prisma.aiSuggestion.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.userSkill.deleteMany(),
    prisma.agentAssignment.deleteMany(),
    prisma.agentAssignmentRule.deleteMany(),
    prisma.knowledgeArticle.deleteMany(),
    prisma.cannedResponse.deleteMany(),
    prisma.ticketTemplate.deleteMany(),
    prisma.ticketTag.deleteMany(),
    prisma.workflowStep.deleteMany(),
    prisma.workflowDefinition.deleteMany(),
    prisma.ticketAttribute.deleteMany(),
    prisma.ticketSLA.deleteMany(),
    prisma.ticketSubcategory.deleteMany(),
    prisma.ticketCategory.deleteMany(),
    prisma.agentSkill.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Cleared existing data');

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Pakistan',
      email: 'admin.pk@helpdesk.com',
      passwordHash: hashedPassword,
      role: Role.admin,
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: 'Ayesha Khan',
      email: 'ayesha.khan@helpdesk.com',
      passwordHash: hashedPassword,
      role: Role.agent,
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: 'Bilal Ahmed',
      email: 'bilal.ahmed@helpdesk.com',
      passwordHash: hashedPassword,
      role: Role.agent,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: 'Fatima Ali',
      email: 'fatima@company.pk',
      passwordHash: hashedPassword,
      role: Role.user,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Usman Iqbal',
      email: 'usman@company.pk',
      passwordHash: hashedPassword,
      role: Role.user,
    },
  });

  console.log('✅ Created users');

  // Create Categories
  const itCategory = await prisma.ticketCategory.create({
    data: {
      name: 'IT Support',
      description: 'Information Technology support and troubleshooting',
      active: true,
    },
  });

  const hrCategory = await prisma.ticketCategory.create({
    data: {
      name: 'HR Services',
      description: 'Human Resources related requests',
      active: true,
    },
  });

  const facilitiesCategory = await prisma.ticketCategory.create({
    data: {
      name: 'Facilities',
      description: 'Office facilities and maintenance',
      active: true,
    },
  });

  console.log('✅ Created categories');

  // Create Subcategories
  const hardwareSubcat = await prisma.ticketSubcategory.create({
    data: {
      name: 'Hardware Issues',
      description: 'Computer, laptop, and peripheral issues',
      categoryId: itCategory.id,
      active: true,
    },
  });

  const softwareSubcat = await prisma.ticketSubcategory.create({
    data: {
      name: 'Software Issues',
      description: 'Application and software problems',
      categoryId: itCategory.id,
      active: true,
    },
  });

  const networkSubcat = await prisma.ticketSubcategory.create({
    data: {
      name: 'Network & Connectivity',
      description: 'Internet, VPN, and network access issues',
      categoryId: itCategory.id,
      active: true,
    },
  });

  const onboardingSubcat = await prisma.ticketSubcategory.create({
    data: {
      name: 'Employee Onboarding',
      description: 'New employee setup and documentation',
      categoryId: hrCategory.id,
      active: true,
    },
  });

  const officeSubcat = await prisma.ticketSubcategory.create({
    data: {
      name: 'Office Maintenance',
      description: 'Office repairs and maintenance',
      categoryId: facilitiesCategory.id,
      active: true,
    },
  });

  console.log('✅ Created subcategories');

  // Create SLAs
  await prisma.ticketSLA.create({
    data: {
      name: 'IT High Priority',
      description: 'Critical IT issues requiring immediate attention',
      categoryId: itCategory.id,
      priority: TicketPriority.high,
      responseTimeMinutes: 30,
      resolutionTimeMinutes: 240,
      active: true,
    },
  });

  await prisma.ticketSLA.create({
    data: {
      name: 'IT Medium Priority',
      categoryId: itCategory.id,
      priority: TicketPriority.medium,
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 480,
      active: true,
    },
  });

  await prisma.ticketSLA.create({
    data: {
      name: 'IT Low Priority',
      categoryId: itCategory.id,
      priority: TicketPriority.low,
      responseTimeMinutes: 480,
      resolutionTimeMinutes: 1440,
      active: true,
    },
  });

  console.log('✅ Created SLAs');

  // Create Attributes
  const locationAttr = await prisma.ticketAttribute.create({
    data: {
      name: 'Office Location',
      label: 'Office Location',
      type: AttributeType.select,
      mandatory: true,
      options: JSON.stringify(['Karachi', 'Lahore', 'Islamabad', 'Faisalabad']),
      order: 1,
      active: true,
    },
  });

  const floorAttr = await prisma.ticketAttribute.create({
    data: {
      name: 'floor_number',
      label: 'Floor Number',
      type: AttributeType.number,
      mandatory: false,
      visible: true,
      order: 2,
      active: true,
    },
  });

  const urgentAttr = await prisma.ticketAttribute.create({
    data: {
      name: 'is_urgent',
      label: 'Urgent Request',
      type: AttributeType.boolean,
      mandatory: false,
      visible: true,
      defaultValue: 'false',
      order: 3,
      active: true,
    },
  });

  console.log('✅ Created attributes');

  // Create Workflow
  const itWorkflow = await prisma.workflowDefinition.create({
    data: {
      name: 'Standard IT Workflow',
      description: 'Standard workflow for IT support tickets',
      categoryId: itCategory.id,
      version: 1,
      active: true,
    },
  });

  const step1 = await prisma.workflowStep.create({
    data: {
      workflowId: itWorkflow.id,
      name: 'Initial Triage',
      description: 'Agent reviews and categorizes the ticket',
      order: 1,
      initiatorRole: Role.agent,
      allowedActions: JSON.stringify(['create', 'assign', 'comment']),
    },
  });

  const step2 = await prisma.workflowStep.create({
    data: {
      workflowId: itWorkflow.id,
      name: 'Investigation',
      description: 'Agent investigates and troubleshoots the issue',
      order: 2,
      initiatorRole: Role.agent,
      allowedActions: JSON.stringify(['update', 'escalate', 'comment']),
    },
  });

  const step3 = await prisma.workflowStep.create({
    data: {
      workflowId: itWorkflow.id,
      name: 'Resolution',
      description: 'Agent resolves the ticket',
      order: 3,
      initiatorRole: Role.agent,
      allowedActions: JSON.stringify(['resolve', 'comment']),
    },
  });

  console.log('✅ Created workflows');

  // Create Agent Skills
  const networkSkill = await prisma.agentSkill.create({
    data: {
      name: 'Network Troubleshooting',
      description: 'Expertise in diagnosing and fixing network issues',
      active: true,
    },
  });

  const hardwareSkill = await prisma.agentSkill.create({
    data: {
      name: 'Hardware Repair',
      description: 'Computer and peripheral hardware troubleshooting',
      active: true,
    },
  });

  const softwareSkill = await prisma.agentSkill.create({
    data: {
      name: 'Software Support',
      description: 'Application installation and configuration',
      active: true,
    },
  });

  console.log('✅ Created agent skills');

  // Assign Skills to Agents
  await prisma.userSkill.createMany({
    data: [
      { userId: agent1.id, skillId: networkSkill.id, proficiency: 4 },
      { userId: agent1.id, skillId: softwareSkill.id, proficiency: 5 },
      { userId: agent2.id, skillId: hardwareSkill.id, proficiency: 5 },
      { userId: agent2.id, skillId: networkSkill.id, proficiency: 3 },
    ],
  });

  console.log('✅ Assigned skills to agents');

  // Create Agent Assignments
  await prisma.agentAssignment.createMany({
    data: [
      {
        categoryId: itCategory.id,
        subcategoryId: hardwareSubcat.id,
        agentId: agent2.id,
        priority: TicketPriority.high,
        active: true,
      },
      {
        categoryId: itCategory.id,
        subcategoryId: softwareSubcat.id,
        agentId: agent1.id,
        active: true,
      },
      {
        categoryId: itCategory.id,
        subcategoryId: networkSubcat.id,
        agentId: agent1.id,
        priority: TicketPriority.high,
        active: true,
      },
    ],
  });

  console.log('✅ Created agent assignments');

  // Create Knowledge Articles
  await prisma.knowledgeArticle.createMany({
    data: [
      {
        title: 'How to Reset Your Password',
        content: '<h2>Password Reset Instructions</h2><p>Use the company portal to reset your password from Pakistan offices.</p>',
        summary: 'Guide for resetting user passwords within Pakistan offices',
        categoryId: itCategory.id,
        tags: ['password', 'security', 'access'],
        published: true,
        views: 156,
        helpful: 42,
        notHelpful: 3,
        authorId: agent1.id,
      },
      {
        title: 'VPN Connection Setup (PK)',
        content: '<h2>VPN Configuration</h2><p>To connect to the company VPN from Karachi, Lahore, or Islamabad, install the VPN client and use your email credentials.</p>',
        summary: 'Guide for setting up VPN access from Pakistan',
        categoryId: itCategory.id,
        tags: ['vpn', 'network', 'remote'],
        published: true,
        views: 98,
        helpful: 35,
        notHelpful: 2,
        authorId: agent1.id,
      },
      {
        title: 'Printer Setup Guide (PK Offices)',
        content: '<h2>Network Printer Installation</h2><p>Add Lahore/Islamabad/Karachi office printers via Control Panel &gt; Devices and Printers.</p>',
        summary: 'Instructions for adding printers in Pakistan offices',
        categoryId: itCategory.id,
        tags: ['printer', 'hardware', 'setup'],
        published: true,
        views: 73,
        helpful: 28,
        notHelpful: 1,
        authorId: agent2.id,
      },
    ],
  });

  console.log('✅ Created knowledge articles');

  // Create Canned Responses
  await prisma.cannedResponse.createMany({
    data: [
      {
        title: 'Ticket Received',
        shortcut: '/received',
        content: 'Shukriya! We have received your IT ticket and will respond shortly.',
        categoryId: itCategory.id,
        createdBy: agent1.id,
        active: true,
      },
      {
        title: 'Password Reset Instructions',
        shortcut: '/password',
        content: 'Reset your password at https://portal.company.pk/reset and follow the steps.',
        categoryId: itCategory.id,
        createdBy: agent1.id,
        active: true,
      },
      {
        title: 'Ticket Resolved',
        shortcut: '/resolved',
        content: 'Your issue has been resolved. If problems continue, please reopen this ticket.',
        createdBy: admin.id,
        active: true,
      },
    ],
  });

  console.log('✅ Created canned responses');

  // Create Ticket Tags
  const urgentTag = await prisma.ticketTag.create({
    data: {
      name: 'Urgent',
      color: '#EF4444',
      description: 'Requires immediate attention',
      active: true,
    },
  });

  const vipTag = await prisma.ticketTag.create({
    data: {
      name: 'VIP',
      color: '#F59E0B',
      description: 'VIP user request',
      active: true,
    },
  });

  const bugTag = await prisma.ticketTag.create({
    data: {
      name: 'Bug',
      color: '#8B5CF6',
      description: 'Software bug or defect',
      active: true,
    },
  });

  console.log('✅ Created ticket tags');

  // Create Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      createdBy: user1.id,
      assignedTo: agent1.id,
      priority: TicketPriority.high,
      issueType: IssueType.network,
      status: TicketStatus.in_progress,
      description: 'Unable to connect to VPN from Lahore office. Getting connection timeout to Karachi HQ.',
      categoryId: itCategory.id,
      subcategoryId: networkSubcat.id,
      workflowId: itWorkflow.id,
      currentStepId: step2.id,
      attachments: [],
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      createdBy: user2.id,
      assignedTo: agent2.id,
      priority: TicketPriority.medium,
      issueType: IssueType.hardware,
      status: TicketStatus.open,
      description: 'Laptop keyboard not working properly after traveling from Karachi to Islamabad.',
      categoryId: itCategory.id,
      subcategoryId: hardwareSubcat.id,
      workflowId: itWorkflow.id,
      currentStepId: step1.id,
      attachments: [],
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      createdBy: user1.id,
      assignedTo: agent1.id,
      priority: TicketPriority.low,
      issueType: IssueType.software,
      status: TicketStatus.resolved,
      description: 'Need Urdu/PDF editing tools installed on my workstation.',
      categoryId: itCategory.id,
      subcategoryId: softwareSubcat.id,
      workflowId: itWorkflow.id,
      currentStepId: step3.id,
      attachments: [],
      resolvedAt: new Date(),
    },
  });

  const ticket4 = await prisma.ticket.create({
    data: {
      createdBy: user2.id,
      priority: TicketPriority.medium,
      issueType: IssueType.access,
      status: TicketStatus.open,
      description: 'Requesting access to the shared drive for the Marketing department in Lahore.',
      categoryId: itCategory.id,
      subcategoryId: softwareSubcat.id,
      attachments: [],
    },
  });

  const ticket5 = await prisma.ticket.create({
    data: {
      createdBy: user1.id,
      assignedTo: agent2.id,
      priority: TicketPriority.high,
      issueType: IssueType.hardware,
      status: TicketStatus.in_progress,
      description: 'Monitor display flickering in Karachi office. Unable to work properly.',
      categoryId: itCategory.id,
      subcategoryId: hardwareSubcat.id,
      attachments: [],
    },
  });

  console.log('✅ Created tickets');

  // Add Ticket Attribute Values
  await prisma.ticketAttributeValue.createMany({
    data: [
      { ticketId: ticket1.id, attributeId: locationAttr.id, value: 'Lahore' },
      { ticketId: ticket1.id, attributeId: floorAttr.id, value: '5' },
      { ticketId: ticket1.id, attributeId: urgentAttr.id, value: 'true' },
      { ticketId: ticket2.id, attributeId: locationAttr.id, value: 'Islamabad' },
      { ticketId: ticket2.id, attributeId: floorAttr.id, value: '3' },
      { ticketId: ticket3.id, attributeId: locationAttr.id, value: 'Karachi' },
      { ticketId: ticket3.id, attributeId: floorAttr.id, value: '2' },
      { ticketId: ticket4.id, attributeId: locationAttr.id, value: 'Lahore' },
      { ticketId: ticket5.id, attributeId: locationAttr.id, value: 'Karachi' },
      { ticketId: ticket5.id, attributeId: urgentAttr.id, value: 'true' },
    ],
  });

  console.log('✅ Added attribute values to tickets');

  // Add Ticket Tags
  await prisma.ticketTagRelation.createMany({
    data: [
      { ticketId: ticket1.id, tagId: urgentTag.id },
      { ticketId: ticket1.id, tagId: vipTag.id },
      { ticketId: ticket3.id, tagId: bugTag.id },
      { ticketId: ticket5.id, tagId: urgentTag.id },
    ],
  });

  console.log('✅ Added tags to tickets');

  // Add Ticket Activities
  await prisma.ticketActivity.createMany({
    data: [
      {
        ticketId: ticket1.id,
        actorId: agent1.id,
        type: 'status_change',
        fromStatus: TicketStatus.open,
        toStatus: TicketStatus.in_progress,
      },
      {
        ticketId: ticket1.id,
        actorId: admin.id,
        type: 'assignment_change',
        toAssigneeId: agent1.id,
      },
      {
        ticketId: ticket2.id,
        actorId: admin.id,
        type: 'assignment_change',
        toAssigneeId: agent2.id,
      },
      {
        ticketId: ticket3.id,
        actorId: agent1.id,
        type: 'status_change',
        fromStatus: TicketStatus.open,
        toStatus: TicketStatus.in_progress,
      },
      {
        ticketId: ticket3.id,
        actorId: agent1.id,
        type: 'status_change',
        fromStatus: TicketStatus.in_progress,
        toStatus: TicketStatus.resolved,
      },
      {
        ticketId: ticket5.id,
        actorId: agent2.id,
        type: 'status_change',
        fromStatus: TicketStatus.open,
        toStatus: TicketStatus.in_progress,
      },
    ],
  });

  console.log('✅ Added ticket activities');

  // Add Workflow Steps
  await prisma.ticketWorkflowStep.createMany({
    data: [
      {
        ticketId: ticket1.id,
        stepId: step1.id,
        enteredAt: new Date(Date.now() - 3600000),
        exitedAt: new Date(Date.now() - 1800000),
        actorId: agent1.id,
        notes: 'Initial triage completed',
      },
      {
        ticketId: ticket1.id,
        stepId: step2.id,
        enteredAt: new Date(Date.now() - 1800000),
        actorId: agent1.id,
        notes: 'Investigating VPN connection issue',
      },
      {
        ticketId: ticket3.id,
        stepId: step1.id,
        enteredAt: new Date(Date.now() - 7200000),
        exitedAt: new Date(Date.now() - 5400000),
        actorId: agent1.id,
      },
      {
        ticketId: ticket3.id,
        stepId: step2.id,
        enteredAt: new Date(Date.now() - 5400000),
        exitedAt: new Date(Date.now() - 3600000),
        actorId: agent1.id,
      },
      {
        ticketId: ticket3.id,
        stepId: step3.id,
        enteredAt: new Date(Date.now() - 3600000),
        exitedAt: new Date(),
        actorId: agent1.id,
        notes: 'Software installed and tested',
      },
    ],
  });

  console.log('✅ Added workflow step tracking');

  console.log('🎉 Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Users: 5 (1 admin, 2 agents, 2 users)`);
  console.log(`   Categories: 3`);
  console.log(`   Subcategories: 5`);
  console.log(`   SLAs: 3`);
  console.log(`   Attributes: 3`);
  console.log(`   Workflows: 1 (with 3 steps)`);
  console.log(`   Skills: 3`);
  console.log(`   Agent Assignments: 3`);
  console.log(`   Knowledge Articles: 3`);
  console.log(`   Canned Responses: 3`);
  console.log(`   Tickets: 5`);
  console.log(`   Tags: 3`);
  console.log('\n🔑 Login credentials:');
  console.log('   Admin: admin.pk@helpdesk.com / password123');
  console.log('   Agent: ayesha.khan@helpdesk.com / password123');
  console.log('   Agent: bilal.ahmed@helpdesk.com / password123');
  console.log('   User: fatima@company.pk / password123');
  console.log('   User: usman@company.pk / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
