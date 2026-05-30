// ============================================================
//  SportZone — API Backend  |  server.js
//  Requiere: XAMPP corriendo con MySQL en localhost:3306
//  Puerto API: 3001
// ============================================================
const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // permite imágenes base64 grandes

// ── Conexión MySQL (XAMPP) ───────────────────────────────────
const db = mysql.createPool({
  host:              '127.0.0.1',
  user:              'root',
  password:          '',           // contraseña vacía por defecto en XAMPP
  database:          'sportzone',
  charset:           'utf8mb4',
  waitForConnections: true,
  connectionLimit:   10,
  queueLimit:        0,
});

// Verificar conexión inicial
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    console.error('   → Asegúrate de que XAMPP esté corriendo y la BD "sportzone" exista.');
    console.error('   → Importa el archivo api/sportzone.sql en phpMyAdmin primero.');
    return;
  }
  console.log('✅ Conectado a MySQL  ·  Base de datos: sportzone');
  connection.release();
});

// ── Ruta raíz ───────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', app: 'SportZone API', version: '1.0' }));

// ════════════════════════════════════════════════════════════
//  PRODUCTOS
// ════════════════════════════════════════════════════════════

// GET  /api/productos  → lista todos
app.get('/api/productos', (_req, res) => {
  db.query('SELECT * FROM productos ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // mysql2 devuelve DECIMAL como string → convertir a número
    const data = rows.map(p => ({ ...p, precio: parseFloat(p.precio) }));
    res.json(data);
  });
});

// POST /api/productos  → crear producto
app.post('/api/productos', (req, res) => {
  const { nombre, categoria, precio, stock, descripcion, emoji, imagen } = req.body;
  if (!nombre || !categoria || precio == null)
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, categoria, precio' });

  const sql = `INSERT INTO productos (nombre, categoria, precio, stock, descripcion, emoji, imagen)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [nombre, categoria, precio, stock || 0, descripcion || '', emoji || '🏅', imagen || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, message: 'Producto creado correctamente' });
    });
});

// PUT  /api/productos/:id  → actualizar producto
app.put('/api/productos/:id', (req, res) => {
  const { nombre, categoria, precio, stock, descripcion, emoji, imagen } = req.body;
  const sql = `UPDATE productos SET nombre=?, categoria=?, precio=?, stock=?, descripcion=?, emoji=?, imagen=?
               WHERE id=?`;
  db.query(sql, [nombre, categoria, precio, stock, descripcion, emoji, imagen, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Producto actualizado' });
    });
});

// DELETE /api/productos/:id  → eliminar producto
app.delete('/api/productos/:id', (req, res) => {
  db.query('DELETE FROM productos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Producto eliminado' });
  });
});

// ════════════════════════════════════════════════════════════
//  AUTENTICACIÓN
// ════════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  db.query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const user = rows[0];
    if (!user || user.password !== password)
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    res.json({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, giros: user.giros });
  });
});

// POST /api/registro
app.post('/api/registro', (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const mail = email.trim().toLowerCase();
  db.query('SELECT id FROM usuarios WHERE email = ?', [mail], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

    db.query(
      `INSERT INTO usuarios (nombre, email, password, rol, giros) VALUES (?, ?, ?, 'user', 3)`,
      [nombre.trim(), mail, password],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json({ id: result.insertId, nombre: nombre.trim(), email: mail, rol: 'user', giros: 3 });
      }
    );
  });
});

// ════════════════════════════════════════════════════════════
//  USUARIOS  (solo admin)
// ════════════════════════════════════════════════════════════

// GET /api/usuarios  → lista de usuarios (sin passwords)
app.get('/api/usuarios', (_req, res) => {
  db.query(
    'SELECT id, nombre, email, rol, giros, created_at FROM usuarios ORDER BY created_at ASC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ════════════════════════════════════════════════════════════
//  CUPONES / RULETA
// ════════════════════════════════════════════════════════════

// GET /api/cupones/:userId  → cupones del usuario
app.get('/api/cupones/:userId', (req, res) => {
  db.query(
    'SELECT * FROM cupones WHERE usuario_id = ? ORDER BY created_at DESC',
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST /api/giro  → gastar 1 giro y guardar cupón ganado
app.post('/api/giro', (req, res) => {
  const { usuario_id, codigo, premio, icono, descripcion } = req.body;
  if (!usuario_id || !codigo || !premio)
    return res.status(400).json({ error: 'Faltan campos: usuario_id, codigo, premio' });

  // Descontar 1 giro (solo si quedan)
  db.query(
    'UPDATE usuarios SET giros = giros - 1 WHERE id = ? AND giros > 0',
    [usuario_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(400).json({ error: 'No tienes giros disponibles' });

      // Insertar cupón
      db.query(
        `INSERT INTO cupones (usuario_id, codigo, premio, icono, descripcion) VALUES (?, ?, ?, ?, ?)`,
        [usuario_id, codigo, premio, icono || '🎁', descripcion || ''],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          // Retornar giros restantes
          db.query('SELECT giros FROM usuarios WHERE id = ?', [usuario_id], (err3, rows) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ giros: rows[0].giros, codigo, premio, message: '¡Premio registrado!' });
          });
        }
      );
    }
  );
});

// ── Iniciar servidor ─────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 SportZone API corriendo en http://localhost:${PORT}`);
  console.log('   Endpoints disponibles:');
  console.log('   GET    /api/productos');
  console.log('   POST   /api/productos');
  console.log('   DELETE /api/productos/:id');
  console.log('   POST   /api/login');
  console.log('   POST   /api/registro');
  console.log('   GET    /api/usuarios');
  console.log('   GET    /api/cupones/:userId');
  console.log('   POST   /api/giro\n');
});
