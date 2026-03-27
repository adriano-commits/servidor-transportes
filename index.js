require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Conexão com o PostgreSQL do Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necessário no Railway
});

// Cria a tabela automaticamente se não existir
async function inicializarBanco() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS viagens (
      id        SERIAL PRIMARY KEY,
      motorista VARCHAR(100) NOT NULL,
      valor     NUMERIC(10, 2) NOT NULL,
      data      DATE NOT NULL DEFAULT CURRENT_DATE,
      criado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✅ Tabela "viagens" pronta.');
}

// POST /viagem — Salva uma nova viagem
app.post('/viagem', async (req, res) => {
  const { motorista, valor } = req.body;

  if (!motorista || valor === undefined) {
    return res.status(400).json({ erro: 'Informe "motorista" e "valor".' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO viagens (motorista, valor) VALUES ($1, $2) RETURNING *',
      [motorista, valor]
    );
    res.status(201).json({ mensagem: 'Viagem salva!', viagem: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao salvar viagem.' });
  }
});

// GET /relatorio — Total por data
app.get('/relatorio', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        data,
        COUNT(*)          AS total_viagens,
        SUM(valor)        AS total_valor,
        STRING_AGG(DISTINCT motorista, ', ') AS motoristas
      FROM viagens
      GROUP BY data
      ORDER BY data DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar relatório.' });
  }
});

// Inicializa banco e sobe o servidor
const PORT = process.env.PORT || 3000;

inicializarBanco()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar no banco:', err);
    process.exit(1);
  });
