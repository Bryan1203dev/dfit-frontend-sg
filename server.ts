import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database('dfit.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    pin TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    membership_type TEXT NOT NULL,
    classification TEXT NOT NULL,
    price INTEGER NOT NULL,
    total_classes INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount_paid INTEGER NOT NULL,
    observations TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT DEFAULT 'Active' -- Active, Frozen, Expired, Deleted
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    date TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Initial', 'Debt', 'Renewal'
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
  
  CREATE TABLE IF NOT EXISTS freezes (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS action_history (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    user_name TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
`);

// Add is_imported column if it doesn't exist
try {
  db.exec("ALTER TABLE clients ADD COLUMN is_imported INTEGER DEFAULT 0");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE payments ADD COLUMN is_imported INTEGER DEFAULT 0");
} catch (e) {
  // Column might already exist
}

// Seed Users if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (name, role, pin) VALUES (?, ?, ?)');
  insertUser.run('Administrador', 'admin', '120390');
  insertUser.run('Colaborador Mañana', 'morning', '1234');
  insertUser.run('Colaborador Tarde', 'afternoon', '4567');
}

async function startServer() {
  // Clean up any existing soft-deleted clients and their related records
  try {
    const deletedClients = db.prepare("SELECT id FROM clients WHERE status = 'Deleted'").all() as { id: string }[];
    for (const client of deletedClients) {
      db.prepare("DELETE FROM attendance WHERE client_id = ?").run(client.id);
      db.prepare("DELETE FROM payments WHERE client_id = ?").run(client.id);
      db.prepare("DELETE FROM freezes WHERE client_id = ?").run(client.id);
      db.prepare("DELETE FROM action_history WHERE client_id = ?").run(client.id);
      db.prepare("DELETE FROM clients WHERE id = ?").run(client.id);
    }
  } catch (e) {
    console.error("Error cleaning up deleted clients:", e);
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { pin } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE pin = ?').get(pin);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'PIN incorrecto' });
    }
  });

  app.get('/api/clients/next-code', (req, res) => {
    try {
      const allClients = db.prepare("SELECT code FROM clients WHERE code LIKE '%B'").all() as { code: string }[];

      const usedNumbers = allClients
        .map(c => {
          const match = c.code.match(/^(\d+)B$/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

      let nextNum = 1;
      for (const num of usedNumbers) {
        if (num === nextNum) {
          nextNum++;
        } else if (num > nextNum) {
          break;
        }
      }

      const nextCode = `${nextNum.toString().padStart(4, '0')}B`;
      res.json({ code: nextCode });
    } catch (error: any) {
      console.error('Error in /api/clients/next-code:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clients
  app.get('/api/clients', (req, res) => {
    const clients = db.prepare(`
      SELECT c.*, 
      (SELECT COUNT(*) FROM attendance a WHERE a.client_id = c.id) as classes_used,
      (SELECT SUM(p.amount) FROM payments p WHERE p.client_id = c.id) as total_paid
      FROM clients c WHERE status != 'Deleted' ORDER BY full_name ASC
    `).all();
    res.json(clients);
  });

  app.get('/api/clients/deleted', (req, res) => {
    const clients = db.prepare("SELECT * FROM clients WHERE status = 'Deleted'").all();
    res.json(clients);
  });

  app.post('/api/clients', (req, res) => {
    const client = req.body;
    console.log('Received client registration request:', client);
    try {
      const isImported = client.is_imported ? 1 : 0;

      const stmt = db.prepare(`
        INSERT INTO clients (id, code, full_name, email, phone, membership_type, classification, price, total_classes, start_date, end_date, payment_method, amount_paid, observations, created_at, updated_at, is_imported)
        VALUES (@id, @code, @full_name, @email, @phone, @membership_type, @classification, @price, @total_classes, @start_date, @end_date, @payment_method, @amount_paid, @observations, @created_at, @updated_at, @is_imported)
      `);
      stmt.run({ ...client, is_imported: isImported });

      // Record initial payment
      if (client.amount_paid > 0) {
        const paymentStmt = db.prepare(`
            INSERT INTO payments (id, client_id, amount, method, date, user_id, user_name, type, is_imported)
            VALUES (@paymentId, @clientId, @amount, @method, @date, @userId, @userName, 'Initial', @isImported)
          `);
        paymentStmt.run({
          paymentId: uuidv4(),
          clientId: client.id,
          amount: client.amount_paid,
          method: client.payment_method,
          date: client.created_at,
          userId: client.created_by_id || 0, // Ensure not undefined
          userName: client.created_by_name || 'System',
          isImported: isImported
        });
      }

      console.log('Client registered successfully:', client.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error registering client:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/clients/:id/renew', (req, res) => {
    const { id } = req.params;
    const { membership_type, classification, price, total_classes, start_date, end_date, payment_method, amount_paid, observations, action_user } = req.body;

    try {
      // Get current client to check debt
      const currentClient = db.prepare('SELECT price, amount_paid, total_classes FROM clients WHERE id = ?').get(id) as any;
      const currentDebt = currentClient.price - currentClient.amount_paid;

      // Update client with new membership cycle
      // We do not sum old classes with new classes
      const newTotalClasses = total_classes;

      let finalObservations = observations || '';
      if (currentDebt > 0) {
        finalObservations = `[Deuda anterior pendiente: S/ ${currentDebt}] ${finalObservations}`.trim();
      }

      const stmt = db.prepare(`
        UPDATE clients 
        SET membership_type = ?, classification = ?, price = ?, total_classes = ?, start_date = ?, end_date = ?, payment_method = ?, amount_paid = ?, observations = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(membership_type, classification, price, newTotalClasses, start_date, end_date, payment_method, amount_paid, finalObservations, new Date().toISOString(), id);

      // Record payment if any
      if (amount_paid > 0) {
        const paymentStmt = db.prepare(`
          INSERT INTO payments (id, client_id, amount, method, date, user_id, user_name, type, is_imported)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Renewal', 0)
        `);
        paymentStmt.run(uuidv4(), id, amount_paid, payment_method, new Date().toISOString(), 0, action_user);
      }

      // Record action history
      const logStmt = db.prepare(`
        INSERT INTO action_history (id, client_id, client_name, action_type, description, user_name, date)
        VALUES (?, ?, (SELECT full_name FROM clients WHERE id = ?), 'Renovación', ?, ?, ?)
      `);
      const debtText = currentDebt > 0 ? ` (Deuda anterior pendiente: S/ ${currentDebt})` : '';
      logStmt.run(uuidv4(), id, id, `Renovación de membresía: ${membership_type} - ${classification}. Inicio: ${start_date}, Fin: ${end_date}${debtText}`, action_user, new Date().toISOString());

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error renewing client:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { action_user, extra_days, extra_classes, ...updates } = req.body;

    // Dynamic update
    const keys = Object.keys(updates).filter(k => k !== 'id');
    const setClause = keys.map(k => `${k} = @${k}`).join(', ');

    try {
      // Get old client data to compare
      const oldClient = db.prepare('SELECT full_name, phone, email FROM clients WHERE id = ?').get(id) as any;

      const stmt = db.prepare(`UPDATE clients SET ${setClause} WHERE id = @id`);
      stmt.run({ ...updates, id });

      // Log action
      const client = db.prepare('SELECT full_name FROM clients WHERE id = ?').get(id) as { full_name: string };

      const descriptionParts = [];

      if (
        updates.full_name !== oldClient.full_name ||
        updates.phone !== oldClient.phone ||
        updates.email !== oldClient.email
      ) {
        descriptionParts.push('Actualización de datos');
      }

      if (extra_days) {
        descriptionParts.push(`Extensión de ${extra_days} días (Congelamiento)`);
      }
      if (extra_classes) {
        descriptionParts.push(`${extra_classes} clases extra`);
      }

      const description = descriptionParts.join(' + ');

      if (action_user && description) {
        db.prepare(`
          INSERT INTO action_history (id, client_id, client_name, action_type, description, user_name, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          id,
          client.full_name,
          'Update',
          description,
          action_user,
          new Date().toISOString()
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete('/api/clients/mass', (req, res) => {
    try {
      db.prepare("DELETE FROM attendance").run();
      db.prepare("DELETE FROM payments").run();
      db.prepare("DELETE FROM freezes").run();
      db.prepare("DELETE FROM action_history").run();
      db.prepare("DELETE FROM clients").run();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM attendance WHERE client_id = ?").run(id);
      db.prepare("DELETE FROM payments WHERE client_id = ?").run(id);
      db.prepare("DELETE FROM freezes WHERE client_id = ?").run(id);
      db.prepare("DELETE FROM action_history WHERE client_id = ?").run(id);
      db.prepare("DELETE FROM clients WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Payments
  app.get('/api/payments', (req, res) => {
    const payments = db.prepare('SELECT * FROM payments ORDER BY date DESC').all();
    res.json(payments);
  });

  app.post('/api/payments', (req, res) => {
    const payment = req.body;
    try {
      const isImported = payment.is_imported ? 1 : 0;
      const stmt = db.prepare(`
        INSERT INTO payments (id, client_id, amount, method, date, user_id, user_name, type, is_imported)
        VALUES (@id, @client_id, @amount, @method, @date, @user_id, @user_name, @type, @is_imported)
      `);
      stmt.run({ ...payment, is_imported: isImported });

      // Update client amount_paid
      db.prepare('UPDATE clients SET amount_paid = amount_paid + ? WHERE id = ?').run(payment.amount, payment.client_id);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Attendance
  app.get('/api/attendance/:clientId', (req, res) => {
    const { clientId } = req.params;
    const attendance = db.prepare('SELECT * FROM attendance WHERE client_id = ? ORDER BY date DESC').all(clientId);
    res.json(attendance);
  });

  app.post('/api/attendance', (req, res) => {
    const { id, client_id, date } = req.body;
    try {
      db.prepare('INSERT INTO attendance (id, client_id, date) VALUES (?, ?, ?)').run(id, client_id, date);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/api/action-history', (req, res) => {
    try {
      const history = db.prepare('SELECT * FROM action_history ORDER BY date DESC LIMIT 100').all();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Dashboard / Stats
  app.get('/api/stats/consolidated', (req, res) => {
    const { filter } = req.query; // 'all', 'day', 'month', 'quarter', 'year'

    let dateFilter = '';
    const now = new Date();
    let params: string[] = [];

    if (filter === 'day') {
      dateFilter = "AND date(date) = date(?)";
      params.push(now.toISOString());
    } else if (filter === 'month') {
      dateFilter = "AND strftime('%Y-%m', date) = strftime('%Y-%m', ?)";
      params.push(now.toISOString());
    } else if (filter === 'quarter') {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      dateFilter = "AND date(date) >= date(?)";
      params.push(quarterStart.toISOString());
    } else if (filter === 'year') {
      dateFilter = "AND strftime('%Y', date) = strftime('%Y', ?)";
      params.push(now.toISOString());
    }

    // We need to gather data from action_history (for renewals) and clients (for new creations)
    // to build a consolidated list of "membership events"

    // 1. New clients
    const newClientsQuery = `
          SELECT id, membership_type, classification, payment_method, amount_paid, price, created_at as event_date, 'New' as event_type
          FROM clients
          WHERE status != 'Deleted' AND is_imported = 0
          ${dateFilter.replace(/date/g, 'created_at')}
      `;

    // 2. Renewals
    // For renewals, we can get the membership info from the action_history description or just use the current client info if we assume it hasn't changed since the renewal.
    // A better way is to join action_history with clients, but we only want the payment amount for that specific renewal.
    // Actually, payments table has 'Renewal' type. We can use payments table to get the amount_paid and payment_method for renewals.
    // And join with clients to get membership_type and classification.
    const renewalsQuery = `
          SELECT c.id, c.membership_type, c.classification, p.method as payment_method, p.amount as amount_paid, c.price, p.date as event_date, 'Renewal' as event_type
          FROM payments p
          JOIN clients c ON p.client_id = c.id
          WHERE p.type = 'Renewal' AND p.is_imported = 0
          ${dateFilter.replace(/date/g, 'p.date')}
      `;

    const allEvents = db.prepare(`
          ${newClientsQuery}
          UNION ALL
          ${renewalsQuery}
      `).all(...params, ...params);

    res.json(allEvents);
  });

  app.get('/api/stats/daily', (req, res) => {
    const { date } = req.query; // Expects YYYY-MM-DD

    // New memberships today (includes newly created clients AND renewals)
    // For renewals, we look at the action_history table for 'Renovación' actions today
    const newMemberships = db.prepare(`
          SELECT c.* 
          FROM clients c
          WHERE (date(c.created_at) = date(?) OR EXISTS (
            SELECT 1 FROM action_history ah 
            WHERE ah.client_id = c.id AND ah.action_type = 'Renovación' AND date(ah.date) = date(?)
          ))
          AND c.status != 'Deleted' AND c.is_imported = 0
      `).all(date, date);

    // New payments today (excluding initial payments and renewals)
    const newPayments = db.prepare(`
          SELECT p.*, c.full_name, c.code 
          FROM payments p 
          JOIN clients c ON p.client_id = c.id
          WHERE date(p.date) = date(?) AND p.type NOT IN ('Initial', 'Renewal') AND p.is_imported = 0
      `).all(date);

    res.json({
      newMemberships,
      newPayments
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Servir build de producción
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));

    // Add this line to handle SPA routing
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
