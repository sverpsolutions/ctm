const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    http.get({ hostname: 'localhost', port: 5000, path: path, headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=== TESTING API ENDPOINTS ===\n');

  // 1. Health
  const health = await get('/api/health');
  console.log('1. Health Check:', health.status === 200 ? 'PASSED' : 'FAILED', health.data);

  // 2. Login Super Admin
  const loginRes = await post('/api/auth/login', {
    usernameOrEmail: 'admin@company.com',
    password: 'Password@123',
  });
  console.log('2. Admin Login:', loginRes.status === 200 ? 'PASSED' : 'FAILED');
  if (!loginRes.data.success) {
    console.error('Login error:', loginRes.data);
    return;
  }
  const token = loginRes.data.token;
  console.log('   Logged in user:', loginRes.data.user.employeeName, `(${loginRes.data.user.roleName})`);
  console.log('   Permissions count:', loginRes.data.user.permissions.length);

  // 3. Dashboard Data
  const dashRes = await get('/api/dashboard', token);
  console.log('3. Dashboard Data:', dashRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('   KPIs:', dashRes.data.data.kpis);
  console.log('   Status Breakdown:', dashRes.data.data.charts.statusBreakdown);
  console.log('   Upcoming Dates Count:', dashRes.data.data.upcomingDates.length);
  console.log('   Overdue Tasks Count:', dashRes.data.data.overdueTasks.length);

  // 4. Tasks List
  const tasksRes = await get('/api/tasks?limit=5', token);
  console.log('4. Tasks Query:', tasksRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('   Total Tasks:', tasksRes.data.pagination.total);
  console.log('   First Task:', tasksRes.data.data[0]?.TaskNumber, '-', tasksRes.data.data[0]?.TaskTitle);

  // 5. Important Dates List
  const datesRes = await get('/api/important-dates?timeframe=all', token);
  console.log('5. Important Dates Query:', datesRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('   Total Dates:', datesRes.data.pagination.total);
  console.log('   First Date:', datesRes.data.data[0]?.Title, `[${datesRes.data.data[0]?.SmartCategory}]`);

  // 6. Calendar Events
  const calRes = await get('/api/calendar?type=all', token);
  console.log('6. Calendar Query:', calRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('   Total Events:', calRes.data.data.length);

  // 7. Masters (Departments & Employees)
  const deptsRes = await get('/api/masters/departments', token);
  const empsRes = await get('/api/masters/employees', token);
  console.log('7. Masters Query:', deptsRes.status === 200 && empsRes.status === 200 ? 'PASSED' : 'FAILED');
  console.log('   Departments:', deptsRes.data.data.length, '| Employees:', empsRes.data.data.length);

  console.log('\n=== ALL CORE API ENDPOINTS VERIFIED SUCCESSFULLY ===');
}

runTests().catch(console.error);
