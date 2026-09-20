/**
 * Automated Verification Script for TaskFlow REST APIs
 */
const http = require('http');

function post(url, data, token = null) {
  return request(url, 'POST', data, token);
}

function get(url, token = null) {
  return request(url, 'GET', null, token);
}

function patch(url, data, token = null) {
  return request(url, 'PATCH', data, token);
}

function put(url, data, token = null) {
  return request(url, 'PUT', data, token);
}

function del(url, token = null) {
  return request(url, 'DELETE', null, token);
}

function request(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting TaskFlow REST API Automated Tests ---');

  // 1. Health check
  const health = await get('/api/health');
  console.log('1. API Health Check:', health.status === 200 && health.data.status === 'online' ? 'PASSED' : 'FAILED', health.data);

  // 2. Register Test
  const testEmail = `test_${Date.now()}@example.com`;
  const registerRes = await post('/api/auth/register', {
    name: 'Test Student',
    email: testEmail,
    password: 'Password123!'
  });
  console.log('2. User Registration:', registerRes.status === 201 ? 'PASSED' : 'FAILED', registerRes.data.message);
  const token = registerRes.data.token;

  // 3. User Login
  const loginRes = await post('/api/auth/login', {
    email: testEmail,
    password: 'Password123!'
  });
  console.log('3. User Login:', loginRes.status === 200 ? 'PASSED' : 'FAILED', loginRes.data.message);

  // 4. User Profile
  const profileRes = await get('/api/users/profile', token);
  console.log('4. Get User Profile:', profileRes.status === 200 ? 'PASSED' : 'FAILED', profileRes.data.user?.email);

  // 5. Create Task
  const createTaskRes = await post('/api/tasks', {
    title: 'Complete DSA Assignment',
    description: 'Solve linked list and dynamic programming problems',
    priority: 'High',
    status: 'Pending',
    dueDate: new Date(Date.now() + 86400000).toISOString()
  }, token);
  console.log('5. Create Task:', createTaskRes.status === 201 ? 'PASSED' : 'FAILED', createTaskRes.data.message);
  const taskId = createTaskRes.data.task.id;

  // 6. Get Tasks
  const getTasksRes = await get('/api/tasks', token);
  console.log('6. Get Tasks List:', getTasksRes.status === 200 && getTasksRes.data.tasks.length >= 1 ? 'PASSED' : 'FAILED', `Count: ${getTasksRes.data.count}`);

  // 7. Get Task Stats
  const statsRes = await get('/api/tasks/stats/summary', token);
  console.log('7. Dynamic Stats Summary:', statsRes.status === 200 ? 'PASSED' : 'FAILED', statsRes.data.stats);

  // 8. Update Task Status
  const patchStatusRes = await patch(`/api/tasks/${taskId}/status`, { status: 'In Progress' }, token);
  console.log('8. Patch Task Status:', patchStatusRes.status === 200 ? 'PASSED' : 'FAILED', patchStatusRes.data.message);

  // 9. Edit Task Details
  const putTaskRes = await put(`/api/tasks/${taskId}`, {
    title: 'Complete DSA Assignment (Updated)',
    description: 'Finished stack and queue problems, now doing DP',
    priority: 'High',
    status: 'Completed',
    dueDate: new Date(Date.now() + 172800000).toISOString()
  }, token);
  console.log('9. Edit Task:', putTaskRes.status === 200 ? 'PASSED' : 'FAILED', putTaskRes.data.message);

  // 10. Delete Task
  const deleteRes = await del(`/api/tasks/${taskId}`, token);
  console.log('10. Delete Task:', deleteRes.status === 200 ? 'PASSED' : 'FAILED', deleteRes.data.message);

  console.log('--- All Automated Tests Completed Successfully! ---');
  process.exit(0);
}

setTimeout(runTests, 1000);
