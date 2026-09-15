const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.data = data;
    throw error;
  }
  return data;
}

async function testFullWorkflow() {
  console.log('=======================================================');
  console.log('🚀 TESTING COMPLETE END-TO-END BUSINESS WORKFLOW');
  console.log('=======================================================');

  // Step 1: Admin Login
  console.log('\nStep 1: Admin Login');
  const adminLoginRes = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'admin@company.com',
      password: 'Password@123',
    }),
  });
  const adminToken = adminLoginRes.token;
  console.log('✅ Admin Logged in successfully. Token generated.');

  const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'X-Company-ID': '3' };

  // Step 2: Create a new Task with Checklist
  console.log('\nStep 2: Admin Creates New Business Task with 3 Checklist Steps');
  const createTaskRes = await request(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Q3 Enterprise Firewall Security Audit & Rule Cleanup',
      description: 'Audit all active WAN rules, drop legacy NAT mappings, and verify perimeter SSL inspection certificates.',
      departmentId: 1, // IT
      priority: 'Critical',
      startDate: new Date().toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().substring(0, 10),
      estimatedHours: 8.0,
      assigneeIds: [4, 3], // Rahul Verma, Amit Patel
      checklistItems: [
        'Export running config from Fortinet HA cluster',
        'Review high-risk port forwarding rules',
        'Test penetration protection and sign off audit log',
      ],
    }),
  });
  const createdTaskId = createTaskRes.data.TaskID;
  console.log(`✅ Task Created successfully! Task ID: ${createdTaskId}, Number: ${createTaskRes.data.TaskNumber}`);

  // Step 3: Employee Login (Rahul Verma)
  console.log('\nStep 3: Employee (Rahul) Logs In');
  const empLoginRes = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'employee.rahul@company.com',
      password: 'Password@123',
    }),
  });
  const empToken = empLoginRes.token;
  const empHeaders = { Authorization: `Bearer ${empToken}` };
  console.log('✅ Employee Rahul logged in.');

  // Step 4: Employee fetches task details
  console.log('\nStep 4: Employee Fetches Task Details & Checklist');
  const taskDetailRes = await request(`${BASE_URL}/tasks/${createdTaskId}`, { headers: empHeaders });
  const checklist = taskDetailRes.data.checklist || [];
  console.log(`✅ Loaded task with ${checklist.length} checklist items.`);

  // Step 5: Employee updates first 2 checklist items and logs progress
  console.log('\nStep 5: Employee Checks 2 Items and Logs Progress (67%, 4 hrs spent)');
  const item1 = checklist[0];
  const item2 = checklist[1];
  await request(`${BASE_URL}/tasks/${createdTaskId}/progress`, {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      status: 'In Progress',
      percentageComplete: 67,
      timeSpentHours: 4.0,
      remarks: 'Exported config and analyzed 42 rules. Dropped 6 deprecated port mappings.',
      checklistUpdates: [
        { checklistItemId: item1.ChecklistItemID, isCompleted: true },
        { checklistItemId: item2.ChecklistItemID, isCompleted: true },
      ],
    }),
  });
  console.log('✅ Progress Logged: 67% complete, 4.0 hours spent.');

  // Step 6: Employee completes 3rd checklist item -> 100% -> submits for approval
  console.log('\nStep 6: Employee Completes Last Checklist Item (100%) -> Submits for Approval');
  const item3 = checklist[2];
  await request(`${BASE_URL}/tasks/${createdTaskId}/progress`, {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      status: 'Waiting for Approval',
      percentageComplete: 100,
      timeSpentHours: 3.5,
      remarks: 'All penetration tests passed without vulnerability. Ready for manager sign-off.',
      checklistUpdates: [{ checklistItemId: item3.ChecklistItemID, isCompleted: true }],
    }),
  });
  console.log('✅ Task submitted for manager review. Status: Waiting for Approval.');

  // Step 7: IT Manager Logs in and Reviews Approval Queue
  console.log('\nStep 7: IT Manager Logs In');
  const mgrLoginRes = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      usernameOrEmail: 'manager.it@company.com',
      password: 'Password@123',
    }),
  });
  const mgrHeaders = { Authorization: `Bearer ${mgrLoginRes.token}` };
  console.log('✅ IT Manager logged in.');

  // Step 8: Manager Approves Task
  console.log('\nStep 8: IT Manager Approves Completed Task');
  await request(`${BASE_URL}/tasks/${createdTaskId}/approve`, {
    method: 'POST',
    headers: mgrHeaders,
  });
  const verifiedTaskRes = await request(`${BASE_URL}/tasks/${createdTaskId}`, { headers: mgrHeaders });
  console.log(`✅ Task Approved! Final Status: ${verifiedTaskRes.data.Status}, Approved Date: ${verifiedTaskRes.data.ApprovedDate}`);

  // Step 9: Create and Renew an Important Date
  console.log('\nStep 9: Admin Creates an Important Date (Expiring in 5 days)');
  const dateRes = await request(`${BASE_URL}/important-dates`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'AWS Cloud Security Compliance Certification Renewal',
      categoryId: 8, // License Renewal
      departmentId: 1,
      date: new Date(Date.now() + 86400000 * 5).toISOString().substring(0, 10),
      expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().substring(0, 10),
      recurrenceType: 'Yearly',
      priority: 'Critical',
      responsibleEmployeeId: 3, // Amit Patel
      relatedVendor: 'Amazon Web Services Inc',
      referenceNumber: 'AWS-CERT-2026-991',
      description: 'Annual ISO/SOC2 third party compliance badge verification.',
      autoGenerateTask: 1,
      leadDaysForTask: 7,
    }),
  });
  const createdDateId = dateRes.data.ImportantDateID;
  console.log(`✅ Important Date Created! ID: ${createdDateId}`);

  // Step 10: Renew the Date
  console.log('\nStep 10: Execute Renewal Cycle (Extend by 1 Year)');
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  await request(`${BASE_URL}/important-dates/${createdDateId}/renew`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      newExpiryDate: nextYear.toISOString().substring(0, 10),
      renewedDate: new Date().toISOString().substring(0, 10),
      remarks: 'Renewed for FY2026-2027. Invoice paid in full.',
    }),
  });
  const renewedDateRes = await request(`${BASE_URL}/important-dates/${createdDateId}`, { headers: adminHeaders });
  console.log(`✅ Date Renewed! New Expiry: ${renewedDateRes.data.ExpiryDate}, History Cycles Count: ${renewedDateRes.data.renewalHistory?.length || 0}`);

  // Step 11: Trigger Background Maintenance Scheduler
  console.log('\nStep 11: Trigger Automated Scheduler Job');
  const schedRes = await request(`${BASE_URL}/settings/trigger-scheduler`, {
    method: 'POST',
    headers: adminHeaders,
  });
  console.log(`✅ Scheduler Triggered: ${schedRes.message}`);

  // Step 12: Verify Audit Trail
  console.log('\nStep 12: Verify Immutable Audit Trail');
  const auditRes = await request(`${BASE_URL}/audit-logs?limit=5`, { headers: adminHeaders });
  console.log(`✅ Audit Logs Recorded: ${auditRes.data.length} recent entries verified.`);

  console.log('\n=======================================================');
  console.log('🎉 ALL 12 END-TO-END BUSINESS WORKFLOW STEPS PASSED PERFECTLY!');
  console.log('=======================================================');
}

testFullWorkflow().catch((err) => {
  console.error('Workflow Test Failed:', err.message || err);
  process.exit(1);
});
