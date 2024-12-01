const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();

// Middleware para processar JSON
app.use(bodyParser.json());
app.use(express.static('public')); // Serve arquivos estáticos da pasta 'public'

// Configuração do banco de dados usando variáveis de ambiente
const db = mysql.createConnection({
    host: process.env.DB_HOST,      // Usando variável de ambiente para o hostname
    user: process.env.DB_USER,      // Usando variável de ambiente para o usuário
    password: process.env.DB_PASSWORD,  // Usando variável de ambiente para a senha
    database: process.env.DB_NAME   // Usando variável de ambiente para o nome do banco
});

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao MySQL!');
});

// Rota para listar tarefas
app.get('/tarefas', (req, res) => {
    const query = 'SELECT * FROM tarefas ORDER BY ordem ASC';
    db.query(query, (err, results) => {
        if (err) {
            console.error("Erro ao consultar as tarefas:", err);
            return res.status(500).json({ error: 'Erro ao consultar tarefas' });
        }

        // Marcando as tarefas de alto custo
        results.forEach(task => {
            if (task.custo >= 1000) {
                task.highCost = true;
            }
        });

        res.json(results);  // Retorna as tarefas ordenadas
    });
});

// Rota para adicionar tarefa
app.post('/tarefas', (req, res) => {
    const { nome, custo, data_limite } = req.body;

    const checkQuery = 'SELECT COUNT(*) AS count FROM tarefas WHERE nome = ?';
    db.query(checkQuery, [nome], (err, result) => {
        if (err) {
            console.error('Erro ao verificar nome:', err);
            return res.status(500).json({ error: 'Erro ao verificar nome' });
        }

        if (result[0].count > 0) {
            return res.status(400).json({ error: 'Já existe uma tarefa com esse nome.' });
        }

        if (custo < 0) {
            return res.status(400).json({ error: 'Custo não pode ser negativo.' });
        }

        const queryGetNextOrder = 'SELECT IFNULL(MAX(ordem), 0) + 1 AS nextOrdem FROM tarefas';
        db.query(queryGetNextOrder, (err, results) => {
            if (err) {
                console.error('Erro ao buscar próximo valor da ordem:', err);
                return res.status(500).json({ error: 'Erro ao buscar próximo valor da ordem' });
            }

            const nextOrdem = results[0].nextOrdem;

            const insertQuery = 'INSERT INTO tarefas (nome, custo, data_limite, ordem) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [nome, custo, data_limite, nextOrdem], (err, result) => {
                if (err) {
                    console.error('Erro ao inserir a tarefa:', err);
                    return res.status(500).json({ error: 'Erro ao adicionar tarefa' });
                } else {
                    const newTask = { id: result.insertId, nome, custo, data_limite, ordem: nextOrdem };
                    res.status(201).json(newTask);
                }
            });
        });
    });
});

// Rota para editar tarefa
app.put('/tarefas/:id', (req, res) => {
    const { nome, custo, data_limite } = req.body;
    const id = req.params.id;

    const checkQuery = 'SELECT COUNT(*) AS count FROM tarefas WHERE nome = ? AND id != ?';
    db.query(checkQuery, [nome, id], (err, result) => {
        if (err) {
            console.error('Erro ao verificar nome:', err);
            return res.status(500).json({ error: 'Erro ao verificar nome' });
        }

        if (result[0].count > 0) {
            return res.status(400).json({ error: 'Já existe uma tarefa com esse nome.' });
        }

        if (custo < 0) {
            return res.status(400).json({ error: 'Custo não pode ser negativo.' });
        }

        const query = 'UPDATE tarefas SET nome = ?, custo = ?, data_limite = ? WHERE id = ?';
        db.query(query, [nome, custo, data_limite, id], (err) => {
            if (err) {
                console.error('Erro ao atualizar a tarefa:', err);
                return res.status(500).json({ error: 'Erro ao atualizar tarefa' });
            } else {
                res.json({ id, nome, custo, data_limite });
            }
        });
    });
});

// Função para mover a tarefa para cima
app.put('/tarefas/:id/mover-para-cima', (req, res) => {
    const taskId = req.params.id;

    const queryGetOrder = 'SELECT ordem FROM tarefas WHERE id = ?';
    db.query(queryGetOrder, [taskId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar a ordem da tarefa:', err);
            return res.status(500).json({ error: 'Erro ao mover a tarefa' });
        }

        const currentOrder = results[0].ordem;

        const queryGetPreviousTask = 'SELECT id, ordem FROM tarefas WHERE ordem < ? ORDER BY ordem DESC LIMIT 1';
        db.query(queryGetPreviousTask, [currentOrder], (err, results) => {
            if (err) {
                console.error('Erro ao buscar a tarefa anterior:', err);
                return res.status(500).json({ error: 'Erro ao mover a tarefa' });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: 'Não é possível mover mais para cima.' });
            }

            const previousTask = results[0];

            const queryUpdateOrder = 'UPDATE tarefas SET ordem = ? WHERE id = ?';
            db.query(queryUpdateOrder, [previousTask.ordem, taskId], (err) => {
                if (err) {
                    console.error('Erro ao atualizar a ordem da tarefa:', err);
                    return res.status(500).json({ error: 'Erro ao mover a tarefa' });
                }

                db.query(queryUpdateOrder, [currentOrder, previousTask.id], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar a ordem da tarefa anterior:', err);
                        return res.status(500).json({ error: 'Erro ao mover a tarefa' });
                    }

                    res.json({ message: 'Tarefa movida para cima' });
                });
            });
        });
    });
});

// Função para mover a tarefa para baixo
app.put('/tarefas/:id/mover-para-baixo', (req, res) => {
    const taskId = req.params.id;

    const queryGetOrder = 'SELECT ordem FROM tarefas WHERE id = ?';
    db.query(queryGetOrder, [taskId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar a ordem da tarefa:', err);
            return res.status(500).json({ error: 'Erro ao mover a tarefa' });
        }

        const currentOrder = results[0].ordem;

        const queryGetNextTask = 'SELECT id, ordem FROM tarefas WHERE ordem > ? ORDER BY ordem ASC LIMIT 1';
        db.query(queryGetNextTask, [currentOrder], (err, results) => {
            if (err) {
                console.error('Erro ao buscar a próxima tarefa:', err);
                return res.status(500).json({ error: 'Erro ao mover a tarefa' });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: 'Não é possível mover mais para baixo.' });
            }

            const nextTask = results[0];

            const queryUpdateOrder = 'UPDATE tarefas SET ordem = ? WHERE id = ?';
            db.query(queryUpdateOrder, [nextTask.ordem, taskId], (err) => {
                if (err) {
                    console.error('Erro ao atualizar a ordem da tarefa:', err);
                    return res.status(500).json({ error: 'Erro ao mover a tarefa' });
                }

                db.query(queryUpdateOrder, [currentOrder, nextTask.id], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar a ordem da próxima tarefa:', err);
                        return res.status(500).json({ error: 'Erro ao mover a tarefa' });
                    }

                    res.json({ message: 'Tarefa movida para baixo' });
                });
            });
        });
    });
});

// Rota para excluir tarefa
app.delete('/tarefas/:id', (req, res) => {
    const id = req.params.id;

    // Deletando a tarefa do banco
    db.query('DELETE FROM tarefas WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Erro ao excluir a tarefa:', err);
            return res.status(500).json({ error: 'Erro ao excluir tarefa' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        res.json({ message: 'Tarefa excluída com sucesso' });
    });
});

// Iniciando o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
