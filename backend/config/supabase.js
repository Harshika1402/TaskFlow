const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let isMock = false;

// Determine if valid Supabase credentials have been configured
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-project-id');
const isValidKey = supabaseKey && supabaseKey.length > 20 && !supabaseKey.includes('your-supabase');

if (isValidUrl && isValidKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    console.log('---------------------------------------------------------');
    console.log('[TaskFlow Database] Connected to Supabase Cloud PostgreSQL');
    console.log(`[TaskFlow Database] Target: ${supabaseUrl}`);
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.warn('[TaskFlow Database] Failed to initialize Supabase client:', error.message);
    isMock = true;
  }
} else {
  isMock = true;
}

if (isMock) {
  console.log('---------------------------------------------------------');
  console.log('[TaskFlow Database] NOTE: Supabase credentials not set in .env');
  console.log('[TaskFlow Database] Running in Demo Memory Mode (Self-Contained)');
  console.log('[TaskFlow Database] All CRUD, Auth & Statistics work 100% for viva!');
  console.log('[TaskFlow Database] To switch to Supabase, update .env with your URL & Key');
  console.log('---------------------------------------------------------');

  // Realistic In-Memory Store mimicking Supabase relational tables
  const memoryUsers = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Harshika Sharma',
      email: 'harshika@example.com',
      // Real valid bcrypt hash for "Password123!"
      password: bcrypt.hashSync('Password123!', 10),
      created_at: new Date().toISOString()
    }
  ];

  const memoryTasks = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Complete DSA Assignment',
      description: 'Solve array, stack and linked-list practice problems on dynamic programming.',
      priority: 'High',
      status: 'In Progress',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Prepare Software Engineering Notes',
      description: 'Review SRS documentation, DFD diagrams and agile methodology questions.',
      priority: 'Medium',
      status: 'Pending',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Submit DBMS Practical',
      description: 'Execute SQL queries for normalization, indexing and trigger implementation.',
      priority: 'High',
      status: 'Completed',
      due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Prepare Mid-Sem Presentation',
      description: 'Create PowerPoint slides for semester project viva demonstration.',
      priority: 'High',
      status: 'Pending',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Complete Project Documentation',
      description: 'Finalize ER diagrams, API test cases, and viva question bank in README.',
      priority: 'Low',
      status: 'In Progress',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Helper UUID generator
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Mock Query Builder matching Supabase SDK methods
  const createMockQueryBuilder = (tableName) => {
    let dataset = tableName === 'users' ? memoryUsers : memoryTasks;
    let filters = [];
    let orderConfig = null;
    let isSingle = false;

    const builder = {
      select: (columns = '*') => {
        return builder;
      },
      eq: (field, value) => {
        filters.push((item) => item[field] === value);
        return builder;
      },
      ilike: (field, pattern) => {
        const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
        filters.push((item) => item[field] && item[field].toLowerCase().includes(cleanPattern));
        return builder;
      },
      or: (conditionStr) => {
        // e.g. "title.ilike.%query%,description.ilike.%query%"
        const parts = conditionStr.split(',');
        filters.push((item) => {
          return parts.some((p) => {
            const [field, op, val] = p.split('.');
            const term = (val || '').replace(/%/g, '').toLowerCase();
            return item[field] && item[field].toLowerCase().includes(term);
          });
        });
        return builder;
      },
      order: (field, { ascending = true } = {}) => {
        orderConfig = { field, ascending };
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      insert: async (records) => {
        const items = Array.isArray(records) ? records : [records];
        const inserted = items.map((rec) => {
          const newRecord = {
            id: generateUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...rec
          };
          dataset.push(newRecord);
          return newRecord;
        });
        return { data: isSingle || !Array.isArray(records) ? inserted[0] : inserted, error: null };
      },
      update: (updates) => {
        return {
          eq: async (field, value) => {
            const index = dataset.findIndex((item) => item[field] === value);
            if (index === -1) {
              return { data: null, error: { message: 'Record not found' } };
            }
            dataset[index] = {
              ...dataset[index],
              ...updates,
              updated_at: new Date().toISOString()
            };
            return { data: [dataset[index]], error: null };
          }
        };
      },
      delete: () => {
        return {
          eq: async (field, value) => {
            const initialLength = dataset.length;
            if (tableName === 'users') {
              const idx = memoryUsers.findIndex((u) => u[field] === value);
              if (idx !== -1) memoryUsers.splice(idx, 1);
            } else {
              const idx = memoryTasks.findIndex((t) => t[field] === value);
              if (idx !== -1) memoryTasks.splice(idx, 1);
            }
            return { data: null, error: null };
          }
        };
      },
      then: (resolve, reject) => {
        // Execute filters
        let result = dataset.filter((item) => filters.every((fn) => fn(item)));

        // Execute ordering
        if (orderConfig) {
          result.sort((a, b) => {
            const valA = a[orderConfig.field];
            const valB = b[orderConfig.field];
            if (valA < valB) return orderConfig.ascending ? -1 : 1;
            if (valA > valB) return orderConfig.ascending ? 1 : -1;
            return 0;
          });
        }

        if (isSingle) {
          resolve({ data: result.length > 0 ? result[0] : null, error: result.length > 0 ? null : { message: 'Row not found' } });
        } else {
          resolve({ data: [...result], error: null });
        }
      }
    };

    return builder;
  };

  supabase = {
    from: (tableName) => createMockQueryBuilder(tableName)
  };
}

module.exports = { supabase, isMock };
