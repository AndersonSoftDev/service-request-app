import type { ServiceRequest, ServiceRequestPriority, ServiceRequestStatus } from '../../types/serviceRequest'

type Seed = [title: string, category: string, priority: ServiceRequestPriority,
  status: ServiceRequestStatus, name: string, email: string, description: string]

const seeds: Seed[] = [
  ['Internet connection drops every evening', 'Connectivity', 'HIGH', 'OPEN', 'John Smith', 'john.smith@example.com', 'The home connection disconnects several times after 18:00.'],
  ['Unexpected charge on August invoice', 'Billing', 'MEDIUM', 'IN_PROGRESS', 'Maria Fernandes', 'maria.fernandes@example.com', 'Please review a service charge that was not included in the agreed plan.'],
  ['Unable to access customer account', 'Account', 'HIGH', 'RESOLVED', 'David Chen', 'david.chen@example.com', 'Account access fails after completing the password reset process.'],
  ['New fibre installation appointment', 'Installation', 'MEDIUM', 'OPEN', 'Amina Hassan', 'amina.hassan@example.com', 'Arrange an installation appointment for a new home connection.'],
  ['Payment not reflected in account', 'Payments', 'HIGH', 'OPEN', 'Sarah Williams', 'sarah.williams@example.com', 'A completed payment is still marked as outstanding on the account.'],
  ['Router setup assistance', 'Technical support', 'LOW', 'CLOSED', 'Carlos Mendes', 'carlos.mendes@example.com', 'Help connecting a new router to the existing service.'],
  ['Update company contract details', 'Contract', 'MEDIUM', 'IN_PROGRESS', 'Priya Patel', 'priya.patel@example.com', 'Update the business contact and company registration details.'],
  ['Change billing address', 'Account', 'LOW', 'RESOLVED', 'James Wilson', 'james.wilson@example.com', 'Replace the billing address following an office relocation.'],
  ['Replace damaged network equipment', 'Equipment', 'HIGH', 'IN_PROGRESS', 'Sofia Costa', 'sofia.costa@example.com', 'The supplied network equipment no longer powers on.'],
  ['Information about international calls', 'General inquiry', 'LOW', 'CLOSED', 'Daniel Brown', 'daniel.brown@example.com', 'Clarify call rates and available international packages.'],
  ['Business internet outage', 'Connectivity', 'CRITICAL', 'OPEN', 'Olivia Taylor', 'olivia.taylor@example.com', 'The office has no internet connection and cannot process orders.'],
  ['Duplicate monthly invoice', 'Billing', 'MEDIUM', 'RESOLVED', 'Ahmed Ali', 'ahmed.ali@example.com', 'Two invoices were issued for the same billing period.'],
  ['Account locked after sign-in attempts', 'Account', 'HIGH', 'IN_PROGRESS', 'Grace Moyo', 'grace.moyo@example.com', 'Restore access after an account lockout.'],
  ['Reschedule service installation', 'Installation', 'LOW', 'CLOSED', 'Lucas Silva', 'lucas.silva@example.com', 'Move the installation visit to the following week.'],
  ['Payment deducted twice', 'Payments', 'HIGH', 'OPEN', 'Emma Johnson', 'emma.johnson@example.com', 'Review two deductions associated with a single invoice payment.'],
  ['Intermittent telephone audio', 'Technical support', 'MEDIUM', 'IN_PROGRESS', 'Noah Martin', 'noah.martin@example.com', 'Incoming calls have intermittent audio despite a stable connection.'],
  ['Extend annual service contract', 'Contract', 'LOW', 'OPEN', 'Isabella Rossi', 'isabella.rossi@example.com', 'Confirm options for renewing the current annual contract.'],
  ['Relocate service to a new address', 'Account', 'MEDIUM', 'RESOLVED', 'Ethan Davis', 'ethan.davis@example.com', 'Transfer the existing connection to a nearby address.'],
  ['Replacement modem delivery status', 'Equipment', 'MEDIUM', 'OPEN', 'Fatima Osman', 'fatima.osman@example.com', 'Confirm the delivery date for a replacement modem.'],
  ['Question about weekend support hours', 'General inquiry', 'LOW', 'CLOSED', 'Liam Anderson', 'liam.anderson@example.com', 'Confirm customer support availability during weekends.'],
  ['All branch connections unavailable', 'Connectivity', 'CRITICAL', 'IN_PROGRESS', 'Chloe Adams', 'chloe.adams@example.com', 'Multiple branch offices have reported a complete loss of connectivity.'],
  ['Invoice tax details correction', 'Billing', 'LOW', 'CLOSED', 'Samuel Ndlovu', 'samuel.ndlovu@example.com', 'Correct the tax identification details on the latest invoice.'],
  ['Restore access for account administrator', 'Account', 'CRITICAL', 'RESOLVED', 'Mia Thompson', 'mia.thompson@example.com', 'The only account administrator cannot access business services.'],
  ['Activate installed business service', 'Installation', 'HIGH', 'IN_PROGRESS', 'Benjamin Lee', 'benjamin.lee@example.com', 'Installation is complete but the business connection is not active.'],
  ['Payment confirmation receipt request', 'Payments', 'LOW', 'RESOLVED', 'Ana Pereira', 'ana.pereira@example.com', 'Provide a receipt for the latest account payment.'],
  ['Emergency support for office phone system', 'Technical support', 'CRITICAL', 'CLOSED', 'Michael Jones', 'michael.jones@example.com', 'The office phone system stopped accepting incoming calls.'],
  ['Review contract renewal terms', 'Contract', 'MEDIUM', 'OPEN', 'Zara Khan', 'zara.khan@example.com', 'Explain changes in the proposed contract renewal terms.'],
  ['Equipment overheating during normal use', 'Equipment', 'HIGH', 'IN_PROGRESS', 'John Smith', 'john.smith@example.com', 'The supplied router repeatedly shuts down after overheating.'],
]

// Fixed seeds and UTC dates keep pagination and tests reproducible.
export const serviceRequestsMock: readonly ServiceRequest[] = seeds.map(
  ([title, category, priority, status, requesterName, requesterEmail, description], index) => {
    const created = Date.UTC(2026, 7, 18 + index, 8 + index % 8)
    return {
      id: 'REQ-' + (1001 + index), title, description, category, priority, status,
      requesterName, requesterEmail,
      createdAt: new Date(created).toISOString(),
      updatedAt: new Date(created + (index % 5 + 1) * 86_400_000).toISOString(),
      version: index % 4 + 1,
    }
  },
)
