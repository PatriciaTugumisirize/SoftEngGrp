const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config(); 

const app = express();
app.use(express.json());

// Ensure upload folder exists
const uploadDir = 'uploads/certificates';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// PostgreSQL connection (use .env variables)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'edubridge',
  password: process.env.DB_PASS || 'yourpassword',
  port: process.env.DB_PORT || 5432,
});

// File storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ---------------- PROFILE ROUTES ---------------- */

// Create Profile
app.post('/api/profiles', async (req, res) => {
  const { fullName, email, phone, skills, education, experience } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, skills, education, experience) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [fullName, email, phone, skills, education, experience]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Profile
app.put('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, skills, education, experience } = req.body;
  try {
    const result = await pool.query(
      `UPDATE profiles 
       SET full_name=$1, phone=$2, skills=$3, education=$4, experience=$5, updated_at=NOW() 
       WHERE id=$6 RETURNING *`,
      [fullName, phone, skills, education, experience, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch All Profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM profiles`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Profile by ID (with certificates)
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await pool.query(`SELECT * FROM profiles WHERE id=$1`, [id]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const certificates = await pool.query(
      `SELECT * FROM certificates WHERE profile_id=$1`, [id]
    );

    res.json({ ...profile.rows[0], certificates: certificates.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File Upload
app.post('/api/profiles/:id/upload', upload.single('certificate'), async (req, res) => {
  const { id } = req.params;
  const filePath = req.file.path;

  try {
    // Check profile exists
    const profile = await pool.query(`SELECT * FROM profiles WHERE id=$1`, [id]);
    if (profile.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await pool.query(
      `INSERT INTO certificates (profile_id, file_name, file_path) VALUES ($1, $2, $3)`,
      [id, req.file.originalname, filePath]
    );
    res.status(201).json({ message: "File uploaded successfully", file: req.file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Delete Profile
app.delete('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM profiles WHERE id=$1 RETURNING *`, [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ message: "Profile deleted successfully", deletedProfile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
