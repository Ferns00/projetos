  const express = require('express');
  const db = require('./database');
  const router = express.Router();

  // Rota para listar todas as tarefas
  router.get('/tarefas', (req, res) => {
    db.query('SELECT * FROM tarefas ORDER BY ordem ASC', (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao consultar tarefas' });
      }
      res.json(results);
    });
  });

  // Rota para adicionar uma nova tarefa
  router.post('/tarefas', (req, res) => {
    const { nome, custo, data_limite } = req.body;

    // Validação
    if (!nome || !custo || !data_limite) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    db.query('SELECT MAX(ordem) AS max_order FROM tarefas', (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao gerar ordem de apresentação' });
      }

      const ordem = result[0].max_order + 1;

      const sql = 'INSERT INTO tarefas (nome, custo, data_limite, ordem) VALUES (?, ?, ?, ?)';
      db.query(sql, [nome, custo, data_limite, ordem], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao adicionar tarefa' });
        }
        res.status(201).json({ message: 'Tarefa adicionada com sucesso' });
      });
    });
  });



  // Rota para editar uma tarefa
  router.put('/tarefas/:id', (req, res) => {
    const { nome, custo, data_limite } = req.body;
    const id = req.params.id;

    // Validação
    if (!nome || !custo || !data_limite) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    db.query(
      'UPDATE tarefas SET nome = ?, custo = ?, data_limite = ? WHERE id = ?',
      [nome, custo, data_limite, id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao editar tarefa' });
        }
        res.json({ message: 'Tarefa editada com sucesso' });
      }
    );
  });

  // Rota para excluir uma tarefa
  router.delete('/tarefas/:id', (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM tarefas WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao excluir tarefa' });
      }
      res.json({ message: 'Tarefa excluída com sucesso' });
    });
  });

  module.exports = router;
