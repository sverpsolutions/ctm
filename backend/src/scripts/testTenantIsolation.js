const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null, companyId = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (companyId) headers['X-Company-ID'] = String(companyId);

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTenantTests() {
  console.log('====================================================');
  console.log('🛡️  STARTING MULTI-TENANT ISOLATION SECURITY SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // STEP 1: Super Admin Global Access & Hierarchy Tree
    // ----------------------------------------------------
    console.log('[TEST 1] Testing Super Admin Global Visibility...');
    const superLogin = await request('POST', '/auth/login', {
      usernameOrEmail: 'admin@company.com',
      password: 'Password@123',
    });
    assert(superLogin.status === 200 && superLogin.body.token, 'Super Admin logged in successfully');
    const superToken = superLogin.body.token;

    const treeRes = await request('GET', '/companies/tree', null, superToken);
    assert(treeRes.status === 200 && Array.isArray(treeRes.body.data), 'Super Admin can fetch full company tree');
    const rootCompanies = treeRes.body.data;
    const hasAbc = rootCompanies.some((c) => c.CompanyCode === 'ABC-GRP');
    const hasZenith = rootCompanies.some((c) => c.CompanyCode === 'ZEN-GRP');
    assert(hasAbc && hasZenith, 'Hierarchy contains both ABC Group and Zenith Group root tenants');

    // ----------------------------------------------------
    // STEP 2: Super Admin Tenant Context Switching
    // ----------------------------------------------------
    console.log('\n[TEST 2] Testing Super Admin Tenant Header Switching...');
    const dehradunDash = await request('GET', '/dashboard', null, superToken, 3);
    assert(dehradunDash.status === 200 && dehradunDash.body.data.activeCompany.CompanyID === 3, 'Super Admin successfully switched context to ABC Hotel Dehradun (ID: 3)');

    const zenithDash = await request('GET', '/dashboard', null, superToken, 8);
    assert(zenithDash.status === 200 && zenithDash.body.data.activeCompany.CompanyID === 8, 'Super Admin successfully switched context to Zenith Enterprises (ID: 8)');

    // ----------------------------------------------------
    // STEP 3: Branch Manager Scope Isolation (Dehradun Manager)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Testing Branch Manager Scope Isolation (Dehradun User)...');
    const dehradunLogin = await request('POST', '/auth/login', {
      usernameOrEmail: 'employee.rahul@company.com',
      password: 'Password@123',
    });
    assert(dehradunLogin.status === 200 && dehradunLogin.body.token, 'Dehradun user logged in successfully');
    const dehradunToken = dehradunLogin.body.token;

    const dehradunAccessible = await request('GET', '/companies/accessible', null, dehradunToken);
    assert(dehradunAccessible.status === 200, 'Dehradun user fetched accessible companies');
    const accessibleList = dehradunAccessible.body.data;
    assert(accessibleList.length === 1 && accessibleList[0].CompanyID === 3, 'Dehradun user ONLY has access to Dehradun (CompanyID: 3)');

    // ----------------------------------------------------
    // STEP 4: Cross-Tenant Spoofing Block (403 Forbidden)
    // ----------------------------------------------------
    console.log('\n[TEST 4] Testing Cross-Tenant Header Spoofing Block...');
    const spoofZenith = await request('GET', '/dashboard', null, dehradunToken, 8);
    assert(spoofZenith.status === 403, 'Attempting to spoof Zenith Enterprises header returned 403 Forbidden');

    const spoofRishikesh = await request('GET', '/dashboard', null, dehradunToken, 4);
    assert(spoofRishikesh.status === 403, 'Attempting to spoof Rishikesh branch header returned 403 Forbidden');

    // ----------------------------------------------------
    // STEP 5: Tamper-Proof Mutation Testing (Tenant Auto-Stamping)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Testing Anti-Tamper Auto-Stamping on Create...');
    const newTaskRes = await request(
      'POST',
      '/tasks',
      {
        title: 'Tamper Test Task For Dehradun',
        description: 'Verifying backend overrides any spoofed companyId in payload',
        dueDate: '2026-09-30',
        priority: 'High',
        companyId: 8, // Attacker tries to inject Zenith CompanyID in JSON body
      },
      superToken, // Created in active company 3
      3
    );
    assert(newTaskRes.status === 201, 'Task created successfully');
    const createdTaskId = newTaskRes.body.taskId;

    // Fetch task details to verify true ownership
    const taskDetails = await request('GET', `/tasks/${createdTaskId}`, null, superToken);
    assert(taskDetails.status === 200 && taskDetails.body.data.CompanyID === 3, `Created task has CompanyID = 3 (Dehradun), ignoring spoofed companyId: 8`);

    // ----------------------------------------------------
    // STEP 6: Cross-Tenant Mutation & Deletion Block
    // ----------------------------------------------------
    console.log('\n[TEST 6] Testing Cross-Tenant Direct Resource Access & Mutation Block...');
    const delhiLogin = await request('POST', '/auth/login', {
      usernameOrEmail: 'employee.neha@company.com',
      password: 'Password@123',
    });
    const delhiToken = delhiLogin.body.token;

    // Delhi user tries to access Dehradun's task
    const crossRead = await request('GET', `/tasks/${createdTaskId}`, null, delhiToken);
    assert(crossRead.status === 403, 'Delhi employee reading Dehradun task received 403 Forbidden');

    // Delhi user tries to update Dehradun's task
    const crossUpdate = await request('PUT', `/tasks/${createdTaskId}`, { title: 'Hacked Title' }, delhiToken);
    assert(crossUpdate.status === 403, 'Delhi employee updating Dehradun task received 403 Forbidden');

    // Delhi user tries to delete Dehradun's task
    const crossDelete = await request('DELETE', `/tasks/${createdTaskId}`, null, delhiToken);
    assert(crossDelete.status === 403, 'Delhi employee deleting Dehradun task received 403 Forbidden');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`🏁 TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTenantTests();
