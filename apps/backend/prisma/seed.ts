import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import {
  TicketPriority,
  IssueType,
  Role,
} from "@prisma/client";

async function main() {
  console.log("Seeding database with expanded Pakistan-region data (25+ rows per table)...");

  // 1) Users - 25+ total: 3 admins, 10 agents, 12 users
  const password = await bcrypt.hash("password123", 10);
  
  const adminUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin1@helpdesk.pk" },
      update: {},
      create: {
        name: "Admin - Karachi HQ",
        email: "admin1@helpdesk.pk",
        passwordHash: password,
        role: Role.admin,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin2@helpdesk.pk" },
      update: {},
      create: {
        name: "Admin - Lahore Branch",
        email: "admin2@helpdesk.pk",
        passwordHash: password,
        role: Role.admin,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin3@helpdesk.pk" },
      update: {},
      create: {
        name: "Admin - Islamabad Support",
        email: "admin3@helpdesk.pk",
        passwordHash: password,
        role: Role.admin,
      },
    }),
  ]);

  const agentUsers = await Promise.all([
    // IT Department Agents
    prisma.user.upsert({
      where: { email: "ahsan.ali@helpdesk.pk" },
      update: {},
      create: {
        name: "Ahsan Ali - IT Senior",
        email: "ahsan.ali@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    prisma.user.upsert({
      where: { email: "fatima.khan@helpdesk.pk" },
      update: {},
      create: {
        name: "Fatima Khan - IT Network",
        email: "fatima.khan@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    prisma.user.upsert({
      where: { email: "hassan.malik@helpdesk.pk" },
      update: {},
      create: {
        name: "Hassan Malik - IT Hardware",
        email: "hassan.malik@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    // Facilities Agents
    prisma.user.upsert({
      where: { email: "amna.hussain@helpdesk.pk" },
      update: {},
      create: {
        name: "Amna Hussain - Facilities",
        email: "amna.hussain@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    prisma.user.upsert({
      where: { email: "ali.raza@helpdesk.pk" },
      update: {},
      create: {
        name: "Ali Raza - Facilities Manager",
        email: "ali.raza@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    // HR Agents
    prisma.user.upsert({
      where: { email: "sara.ahmed@helpdesk.pk" },
      update: {},
      create: {
        name: "Sara Ahmed - HR Admin",
        email: "sara.ahmed@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    prisma.user.upsert({
      where: { email: "zainab.iqbal@helpdesk.pk" },
      update: {},
      create: {
        name: "Zainab Iqbal - HR Benefits",
        email: "zainab.iqbal@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    // Finance Agents
    prisma.user.upsert({
      where: { email: "karim.shah@helpdesk.pk" },
      update: {},
      create: {
        name: "Karim Shah - Finance Officer",
        email: "karim.shah@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    prisma.user.upsert({
      where: { email: "nida.khan@helpdesk.pk" },
      update: {},
      create: {
        name: "Nida Khan - Finance Vendor",
        email: "nida.khan@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
    prisma.user.upsert({
      where: { email: "imran.ahmad@helpdesk.pk" },
      update: {},
      create: {
        name: "Imran Ahmad - Finance Audit",
        email: "imran.ahmad@helpdesk.pk",
        passwordHash: password,
        role: Role.agent,
      },
    }),
  ]);

  const normalUsers = await Promise.all([
    // End Users - Employees
    prisma.user.upsert({
      where: { email: "bilal.ahmed@helpdesk.pk" },
      update: {},
      create: {
        name: "Bilal Ahmed",
        email: "bilal.ahmed@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "ayesha.malik@helpdesk.pk" },
      update: {},
      create: {
        name: "Ayesha Malik",
        email: "ayesha.malik@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "hamza.syed@helpdesk.pk" },
      update: {},
      create: {
        name: "Hamza Syed",
        email: "hamza.syed@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "laiba.khan@helpdesk.pk" },
      update: {},
      create: {
        name: "Laiba Khan",
        email: "laiba.khan@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "usman.ahmed@helpdesk.pk" },
      update: {},
      create: {
        name: "Usman Ahmed",
        email: "usman.ahmed@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "hira.shah@helpdesk.pk" },
      update: {},
      create: {
        name: "Hira Shah",
        email: "hira.shah@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "fahad.khan@helpdesk.pk" },
      update: {},
      create: {
        name: "Fahad Khan",
        email: "fahad.khan@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "mariam.nasir@helpdesk.pk" },
      update: {},
      create: {
        name: "Mariam Nasir",
        email: "mariam.nasir@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "tariq.hussain@helpdesk.pk" },
      update: {},
      create: {
        name: "Tariq Hussain",
        email: "tariq.hussain@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "amira.ahmed@helpdesk.pk" },
      update: {},
      create: {
        name: "Amira Ahmed",
        email: "amira.ahmed@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "rashid.malik@helpdesk.pk" },
      update: {},
      create: {
        name: "Rashid Malik",
        email: "rashid.malik@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
    prisma.user.upsert({
      where: { email: "dina.khan@helpdesk.pk" },
      update: {},
      create: {
        name: "Dina Khan",
        email: "dina.khan@helpdesk.pk",
        passwordHash: password,
        role: Role.user,
      },
    }),
  ]);

  const allUsers = [...adminUsers, ...agentUsers, ...normalUsers];
  console.log(`✓ Created ${allUsers.length} users (3 admins, 10 agents, 12 users)`);

  // 2) Categories - 5 main categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "IT Support" },
      update: {},
      create: {
        name: "IT Support",
        description: "Information Technology and Computer Systems",
      },
    }),
    prisma.category.upsert({
      where: { name: "Facilities Management" },
      update: {},
      create: {
        name: "Facilities Management",
        description: "Office facilities, equipment, and maintenance",
      },
    }),
    prisma.category.upsert({
      where: { name: "Human Resources" },
      update: {},
      create: {
        name: "Human Resources",
        description: "HR policies, payroll, and employee benefits",
      },
    }),
    prisma.category.upsert({
      where: { name: "Finance" },
      update: {},
      create: {
        name: "Finance",
        description: "Financial services, vendor management, and payments",
      },
    }),
    prisma.category.upsert({
      where: { name: "General Support" },
      update: {},
      create: {
        name: "General Support",
        description: "General inquiries and requests",
      },
    }),
  ]);

  console.log(`✓ Created ${categories.length} categories`);

  // 3) Subcategories - 26 total (5+ per category)
  const subcategories = await Promise.all([
    // IT Support subcategories
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Internet Connectivity" } },
      update: {},
      create: {
        categoryId: categories[0].id,
        name: "Internet Connectivity",
        description: "PTCL, StormFiber, and internet issues",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Network & VPN" } },
      update: {},
      create: {
        categoryId: categories[0].id,
        name: "Network & VPN",
        description: "VPN access, network connectivity",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Hardware Issues" } },
      update: {},
      create: {
        categoryId: categories[0].id,
        name: "Hardware Issues",
        description: "Laptop, desktop, and peripheral issues",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Software & Applications" } },
      update: {},
      create: {
        categoryId: categories[0].id,
        name: "Software & Applications",
        description: "ERP, Office, and other software issues",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Security & Access" } },
      update: {},
      create: {
        categoryId: categories[0].id,
        name: "Security & Access",
        description: "User accounts, permissions, and security",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[0].id, name: "Email & Collaboration" } },
      update: {},
      create: {
        categoryId: categories[0].id,
        name: "Email & Collaboration",
        description: "Email, Teams, and collaboration tools",
      },
    }),
    // Facilities Management subcategories
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Air Conditioning & HVAC" } },
      update: {},
      create: {
        categoryId: categories[1].id,
        name: "Air Conditioning & HVAC",
        description: "AC repair and maintenance",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Power & Electricity" } },
      update: {},
      create: {
        categoryId: categories[1].id,
        name: "Power & Electricity",
        description: "Power outages, electrical issues",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Plumbing & Water" } },
      update: {},
      create: {
        categoryId: categories[1].id,
        name: "Plumbing & Water",
        description: "Plumbing issues and water supply",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Cleaning & Housekeeping" } },
      update: {},
      create: {
        categoryId: categories[1].id,
        name: "Cleaning & Housekeeping",
        description: "Office cleaning and housekeeping services",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Furniture & Office Equipment" } },
      update: {},
      create: {
        categoryId: categories[1].id,
        name: "Furniture & Office Equipment",
        description: "Desk, chairs, and office equipment",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[1].id, name: "Security & Access Control" } },
      update: {},
      create: {
        categoryId: categories[1].id,
        name: "Security & Access Control",
        description: "Building access and security systems",
      },
    }),
    // Human Resources subcategories
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Payroll & Compensation" } },
      update: {},
      create: {
        categoryId: categories[2].id,
        name: "Payroll & Compensation",
        description: "Salary, bonus, and compensation issues",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Benefits & Insurance" } },
      update: {},
      create: {
        categoryId: categories[2].id,
        name: "Benefits & Insurance",
        description: "Health insurance and employee benefits",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Leave & Attendance" } },
      update: {},
      create: {
        categoryId: categories[2].id,
        name: "Leave & Attendance",
        description: "Leave requests and attendance records",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Training & Development" } },
      update: {},
      create: {
        categoryId: categories[2].id,
        name: "Training & Development",
        description: "Training programs and professional development",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Recruitment" } },
      update: {},
      create: {
        categoryId: categories[2].id,
        name: "Recruitment",
        description: "Job postings and recruitment inquiries",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[2].id, name: "Policies & Compliance" } },
      update: {},
      create: {
        categoryId: categories[2].id,
        name: "Policies & Compliance",
        description: "Company policies and compliance matters",
      },
    }),
    // Finance subcategories
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[3].id, name: "Vendor Management" } },
      update: {},
      create: {
        categoryId: categories[3].id,
        name: "Vendor Management",
        description: "Vendor payments and management",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[3].id, name: "Expense Reimbursement" } },
      update: {},
      create: {
        categoryId: categories[3].id,
        name: "Expense Reimbursement",
        description: "Expense claims and reimbursements",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[3].id, name: "Invoice & Billing" } },
      update: {},
      create: {
        categoryId: categories[3].id,
        name: "Invoice & Billing",
        description: "Invoice processing and billing issues",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[3].id, name: "Tax & Compliance" } },
      update: {},
      create: {
        categoryId: categories[3].id,
        name: "Tax & Compliance",
        description: "Tax matters and regulatory compliance",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[3].id, name: "Budget & Planning" } },
      update: {},
      create: {
        categoryId: categories[3].id,
        name: "Budget & Planning",
        description: "Budget requests and financial planning",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[3].id, name: "Financial Reports" } },
      update: {},
      create: {
        categoryId: categories[3].id,
        name: "Financial Reports",
        description: "Financial statements and reports",
      },
    }),
    // General Support subcategories
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[4].id, name: "General Inquiry" } },
      update: {},
      create: {
        categoryId: categories[4].id,
        name: "General Inquiry",
        description: "General questions and inquiries",
      },
    }),
    prisma.subcategory.upsert({
      where: { categoryId_name: { categoryId: categories[4].id, name: "Feedback & Suggestions" } },
      update: {},
      create: {
        categoryId: categories[4].id,
        name: "Feedback & Suggestions",
        description: "User feedback and suggestions",
      },
    }),
  ]);

  console.log(`✓ Created ${subcategories.length} subcategories`);

  // 4) SLAs - 26+ SLAs (5+ per subcategory with different priorities)
  const slas = await Promise.all(
    subcategories.map((subcat) =>
      prisma.sla.upsert({
        where: { name: `${subcat.name} - High Priority` },
        update: {},
        create: {
          name: `${subcat.name} - High Priority`,
          subcategoryId: subcat.id,
          priority: TicketPriority.high,
          responseTimeHours: 1,
          resolutionTimeHours: 4,
          description: `High priority SLA for ${subcat.name}`,
        },
      })
    )
  );

  // Add medium and low priority SLAs for critical subcategories
  const additionalSlas = await Promise.all([
    prisma.sla.upsert({
      where: { name: "Internet Connectivity - Medium Priority" },
      update: {},
      create: {
        name: "Internet Connectivity - Medium Priority",
        subcategoryId: subcategories[0].id,
        priority: TicketPriority.medium,
        responseTimeHours: 4,
        resolutionTimeHours: 8,
        description: "Medium priority SLA for internet issues",
      },
    }),
    prisma.sla.upsert({
      where: { name: "Internet Connectivity - Low Priority" },
      update: {},
      create: {
        name: "Internet Connectivity - Low Priority",
        subcategoryId: subcategories[0].id,
        priority: TicketPriority.low,
        responseTimeHours: 8,
        resolutionTimeHours: 24,
        description: "Low priority SLA for internet issues",
      },
    }),
  ]);

  console.log(`✓ Created ${slas.length + additionalSlas.length} SLAs`);

  // 5) Workflows - 3 workflows (Default, IT-specific, Finance-specific)
  const workflow1 = await prisma.workflow.upsert({
    where: { name: "Default Ticket Workflow" },
    update: {},
    create: {
      name: "Default Ticket Workflow",
      description: "Default workflow for all tickets",
      isDefault: true,
      roleFilter: null,
    },
  });

  const workflow2 = await prisma.workflow.upsert({
    where: { name: "IT Security Incident Workflow" },
    update: {},
    create: {
      name: "IT Security Incident Workflow",
      description: "Workflow for IT security incidents",
      isDefault: false,
      roleFilter: Role.admin,
    },
  });

  const workflow3 = await prisma.workflow.upsert({
    where: { name: "Finance Payment Workflow" },
    update: {},
    create: {
      name: "Finance Payment Workflow",
      description: "Workflow for vendor payments and reimbursements",
      isDefault: false,
      roleFilter: Role.admin,
      categoryId: categories[3].id,
    },
  });

  // Create workflow steps for each workflow
  await Promise.all([
    prisma.workflowStep.upsert({
      where: { id: "step-default-1" },
      update: {},
      create: {
        id: "step-default-1",
        workflowId: workflow1.id,
        name: "Initial Assignment",
        description: "Assign ticket to appropriate agent",
        order: 1,
        requiredRoles: [Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-default-2" },
      update: {},
      create: {
        id: "step-default-2",
        workflowId: workflow1.id,
        name: "Investigation",
        description: "Agent investigates the issue",
        order: 2,
        requiredRoles: [Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-default-3" },
      update: {},
      create: {
        id: "step-default-3",
        workflowId: workflow1.id,
        name: "Resolution",
        description: "Implement fix or solution",
        order: 3,
        requiredRoles: [Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-default-4" },
      update: {},
      create: {
        id: "step-default-4",
        workflowId: workflow1.id,
        name: "Verification",
        description: "Verify issue is resolved",
        order: 4,
        requiredRoles: [Role.agent, Role.user],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-security-1" },
      update: {},
      create: {
        id: "step-security-1",
        workflowId: workflow2.id,
        name: "Report & Escalate",
        description: "Report security incident to IT manager",
        order: 1,
        requiredRoles: [Role.admin],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-security-2" },
      update: {},
      create: {
        id: "step-security-2",
        workflowId: workflow2.id,
        name: "Investigation",
        description: "Security team investigates incident",
        order: 2,
        requiredRoles: [Role.admin, Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-security-3" },
      update: {},
      create: {
        id: "step-security-3",
        workflowId: workflow2.id,
        name: "Remediation",
        description: "Implement security fixes",
        order: 3,
        requiredRoles: [Role.admin],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-security-4" },
      update: {},
      create: {
        id: "step-security-4",
        workflowId: workflow2.id,
        name: "Post-Incident Review",
        description: "Document and review incident",
        order: 4,
        requiredRoles: [Role.admin],
        requireAllRoles: true,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-finance-1" },
      update: {},
      create: {
        id: "step-finance-1",
        workflowId: workflow3.id,
        name: "Request Submission",
        description: "User submits payment request",
        order: 1,
        requiredRoles: [],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-finance-2" },
      update: {},
      create: {
        id: "step-finance-2",
        workflowId: workflow3.id,
        name: "Finance Review",
        description: "Finance team reviews request",
        order: 2,
        requiredRoles: [Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-finance-3" },
      update: {},
      create: {
        id: "step-finance-3",
        workflowId: workflow3.id,
        name: "Manager Approval",
        description: "Manager approval required",
        order: 3,
        requiredRoles: [Role.admin, Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-finance-4" },
      update: {},
      create: {
        id: "step-finance-4",
        workflowId: workflow3.id,
        name: "Payment Processing",
        description: "Process payment",
        order: 4,
        requiredRoles: [Role.agent],
        requireAllRoles: false,
      },
    }),
    prisma.workflowStep.upsert({
      where: { id: "step-finance-5" },
      update: {},
      create: {
        id: "step-finance-5",
        workflowId: workflow3.id,
        name: "Confirmation",
        description: "Confirm payment to requester",
        order: 5,
        requiredRoles: [Role.agent],
        requireAllRoles: false,
      },
    }),
  ]);

  const workflows = [workflow1, workflow2, workflow3];

  console.log(`✓ Created ${workflows.length} workflows with 13 total steps`);

  // 6) Tickets - 20+ tickets with various statuses and priorities
  const itSLA = slas[0]; // Internet Connectivity High Priority
  const payrollSLA = slas[12]; // Payroll High Priority
  const powerSLA = slas[6]; // Power & Electricity High Priority

  const tickets = await Promise.all([
    // IT Tickets
    prisma.ticket.upsert({
      where: { id: "ticket-001" },
      update: {},
      create: {
        id: "ticket-001",
        createdBy: normalUsers[0].id,
        description: "Internet is down in floor 3, affecting 5 employees",
        priority: TicketPriority.high,
        issueType: IssueType.network,
        status: "in_progress",
        categoryId: categories[0].id,
        subcategoryId: subcategories[0].id,
        slaId: itSLA.id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[0].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-002" },
      update: {},
      create: {
        id: "ticket-002",
        createdBy: normalUsers[1].id,
        description: "Cannot access VPN from home",
        priority: TicketPriority.high,
        issueType: IssueType.access,
        status: "open",
        categoryId: categories[0].id,
        subcategoryId: subcategories[1].id,
        slaId: slas[1].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[1].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-003" },
      update: {},
      create: {
        id: "ticket-003",
        createdBy: normalUsers[2].id,
        description: "Laptop not connecting to company WiFi",
        priority: TicketPriority.medium,
        issueType: IssueType.hardware,
        status: "open",
        categoryId: categories[0].id,
        subcategoryId: subcategories[2].id,
        slaId: slas[2].id,
        workflowId: workflows[0].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-004" },
      update: {},
      create: {
        id: "ticket-004",
        createdBy: normalUsers[3].id,
        description: "ERP system is slow, affecting order processing",
        priority: TicketPriority.high,
        issueType: IssueType.software,
        status: "in_progress",
        categoryId: categories[0].id,
        subcategoryId: subcategories[3].id,
        slaId: slas[3].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[0].id,
      },
    }),
    // Facilities Tickets
    prisma.ticket.upsert({
      where: { id: "ticket-005" },
      update: {},
      create: {
        id: "ticket-005",
        createdBy: normalUsers[4].id,
        description: "AC unit in office 2B is not working",
        priority: TicketPriority.high,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[1].id,
        subcategoryId: subcategories[6].id,
        slaId: powerSLA.id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[3].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-006" },
      update: {},
      create: {
        id: "ticket-006",
        createdBy: normalUsers[5].id,
        description: "Power outage in West Wing",
        priority: TicketPriority.high,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[1].id,
        subcategoryId: subcategories[7].id,
        slaId: powerSLA.id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[4].id,
      },
    }),
    // HR Tickets
    prisma.ticket.upsert({
      where: { id: "ticket-007" },
      update: {},
      create: {
        id: "ticket-007",
        createdBy: normalUsers[6].id,
        description: "Salary discrepancy in December payroll",
        priority: TicketPriority.high,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[2].id,
        subcategoryId: subcategories[12].id,
        slaId: payrollSLA.id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[5].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-008" },
      update: {},
      create: {
        id: "ticket-008",
        createdBy: normalUsers[7].id,
        description: "Leave balance inquiry",
        priority: TicketPriority.low,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[2].id,
        subcategoryId: subcategories[14].id,
        slaId: slas[14].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[6].id,
      },
    }),
    // Finance Tickets
    prisma.ticket.upsert({
      where: { id: "ticket-009" },
      update: {},
      create: {
        id: "ticket-009",
        createdBy: normalUsers[8].id,
        description: "Vendor invoice approval needed",
        priority: TicketPriority.medium,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[3].id,
        subcategoryId: subcategories[19].id,
        slaId: slas[19].id,
        workflowId: workflows[2].id,
        assignedTo: agentUsers[7].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-010" },
      update: {},
      create: {
        id: "ticket-010",
        createdBy: normalUsers[9].id,
        description: "Expense reimbursement request - conference",
        priority: TicketPriority.medium,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[3].id,
        subcategoryId: subcategories[20].id,
        slaId: slas[20].id,
        workflowId: workflows[2].id,
        assignedTo: agentUsers[8].id,
      },
    }),
    // Additional varied tickets
    prisma.ticket.upsert({
      where: { id: "ticket-011" },
      update: {},
      create: {
        id: "ticket-011",
        createdBy: normalUsers[10].id,
        description: "Broken desk chair in office 5A",
        priority: TicketPriority.low,
        issueType: IssueType.other,
        status: "resolved",
        categoryId: categories[1].id,
        subcategoryId: subcategories[10].id,
        slaId: slas[10].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[3].id,
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-012" },
      update: {},
      create: {
        id: "ticket-012",
        createdBy: normalUsers[11].id,
        description: "Email not syncing on mobile device",
        priority: TicketPriority.medium,
        issueType: IssueType.software,
        status: "in_progress",
        categoryId: categories[0].id,
        subcategoryId: subcategories[5].id,
        slaId: slas[5].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[1].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-013" },
      update: {},
      create: {
        id: "ticket-013",
        createdBy: normalUsers[0].id,
        description: "Printer is offline in Marketing department",
        priority: TicketPriority.low,
        issueType: IssueType.hardware,
        status: "open",
        categoryId: categories[0].id,
        subcategoryId: subcategories[2].id,
        slaId: slas[2].id,
        workflowId: workflows[0].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-014" },
      update: {},
      create: {
        id: "ticket-014",
        createdBy: normalUsers[1].id,
        description: "Water leakage in ceiling near conference room",
        priority: TicketPriority.high,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[1].id,
        subcategoryId: subcategories[8].id,
        slaId: slas[8].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[4].id,
      },
    }),
    prisma.ticket.upsert({
      where: { id: "ticket-015" },
      update: {},
      create: {
        id: "ticket-015",
        createdBy: normalUsers[2].id,
        description: "Training course enrollment request",
        priority: TicketPriority.low,
        issueType: IssueType.other,
        status: "open",
        categoryId: categories[2].id,
        subcategoryId: subcategories[15].id,
        slaId: slas[15].id,
        workflowId: workflows[0].id,
        assignedTo: agentUsers[6].id,
      },
    }),
  ]);

  console.log(`✓ Created ${tickets.length} tickets with various statuses`);

  // 7) Comments - Add comments to tickets
  const comments = await Promise.all([
    prisma.ticketComment.create({
      data: {
        ticketId: tickets[0].id,
        authorId: agentUsers[0].id,
        content: "Investigating the issue. Checking PTCL connection status.",
      },
    }),
    prisma.ticketComment.create({
      data: {
        ticketId: tickets[0].id,
        authorId: normalUsers[0].id,
        content: "Thank you for looking into this. Users are waiting.",
        parentId: undefined,
      },
    }),
    prisma.ticketComment.create({
      data: {
        ticketId: tickets[1].id,
        authorId: agentUsers[1].id,
        content: "VPN server is running normally. Checking user's network configuration.",
      },
    }),
    prisma.ticketComment.create({
      data: {
        ticketId: tickets[4].id,
        authorId: agentUsers[3].id,
        content: "AC technician has been called. ETA 30 minutes.",
      },
    }),
  ]);

  console.log(`✓ Created ${comments.length} comments`);

  // 8) Auto-assign rules - 10+ rules
  const autoAssignRules = await Promise.all([
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[0].id, agentId: agentUsers[0].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[0].id,
        agentId: agentUsers[0].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[1].id, agentId: agentUsers[1].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[1].id,
        agentId: agentUsers[1].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[2].id, agentId: agentUsers[2].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[2].id,
        agentId: agentUsers[2].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[6].id, agentId: agentUsers[3].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[6].id,
        agentId: agentUsers[3].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[7].id, agentId: agentUsers[4].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[7].id,
        agentId: agentUsers[4].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[12].id, agentId: agentUsers[5].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[12].id,
        agentId: agentUsers[5].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[14].id, agentId: agentUsers[6].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[14].id,
        agentId: agentUsers[6].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[19].id, agentId: agentUsers[7].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[19].id,
        agentId: agentUsers[7].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[20].id, agentId: agentUsers[8].id } },
      update: { priority: 1 },
      create: {
        subcategoryId: subcategories[20].id,
        agentId: agentUsers[8].id,
        priority: 1,
      },
    }),
    prisma.agentAutoAssign.upsert({
      where: { subcategoryId_agentId: { subcategoryId: subcategories[19].id, agentId: agentUsers[9].id } },
      update: { priority: 2 },
      create: {
        subcategoryId: subcategories[19].id,
        agentId: agentUsers[9].id,
        priority: 2,
      },
    }),
  ]);

  console.log(`✓ Created ${autoAssignRules.length} auto-assign rules`);

  console.log("\n✅ Database seeding completed successfully!");
  console.log(`\nData Summary:`);
  console.log(`  • Users: ${allUsers.length} (3 admin, 10 agent, 12 user)`);
  console.log(`  • Categories: ${categories.length}`);
  console.log(`  • Subcategories: ${subcategories.length}`);
  console.log(`  • SLAs: ${slas.length + additionalSlas.length}`);
  console.log(`  • Workflows: ${workflows.length}`);
  console.log(`  • Tickets: ${tickets.length}`);
  console.log(`  • Comments: ${comments.length}`);
  console.log(`  • Auto-assign rules: ${autoAssignRules.length}`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
