document.addEventListener("DOMContentLoaded", function() {
    const taskList = document.getElementById('task-list');
    const editFormContainer = document.getElementById('edit-form-container');
    const editForm = document.getElementById('edit-form');
    const cancelEditButton = document.getElementById('cancel-edit');
    const form = document.getElementById('addTaskForm');
    const confirmDeleteContainer = document.getElementById('confirm-delete');
    const deleteForm = document.getElementById('delete-form');

    // Carrega as tarefas do servidor
    function loadTasks() {
        fetch('/tarefas')
            .then(response => response.json())
            .then(tasks => {
                taskList.innerHTML = ''; // Limpa a lista existente
                tasks.forEach(task => {
                    const taskItem = document.createElement('div');
                    taskItem.classList.add('task-item');
                    taskItem.setAttribute('data-id', task.id);
                    taskItem.setAttribute('draggable', true); // Permite o arraste da tarefa
                    
                    // Verifica se a tarefa tem custo maior que 1000 para aplicar a classe 'high-cost'
                    if (parseFloat(task.custo) >= 1000) {
                        taskItem.classList.add('high-cost');
                    }

                    taskItem.innerHTML = `
                        <div>
                            <strong>Nome:</strong> ${task.nome}<br>
                            <strong>Custo:</strong> R$ ${task.custo}<br>
                            <strong>Data Limite:</strong> ${task.data_limite}<br>
                        </div>
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn">Excluir</button>
                    `;
                    taskList.appendChild(taskItem);

                    // Adiciona evento de arrastar para cada item da lista
                    taskItem.addEventListener('dragstart', (e) => {
                        e.target.classList.add("dragging");
                    });

                    taskItem.addEventListener('dragend', (e) => {
                        e.target.classList.remove("dragging");
                    });

                    // Permite que as tarefas sejam soltas na lista
                    taskList.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        const dragging = document.querySelector('.dragging');
                        const afterElement = getDragAfterElement(taskList, e.clientY);
                        if (afterElement == null) {
                            taskList.appendChild(dragging);
                        } else {
                            taskList.insertBefore(dragging, afterElement);
                        }
                    });

                    // Botão Editar
                    const editButton = taskItem.querySelector('.edit-btn');
                    editButton.addEventListener('click', () => {
                        showEditForm(task.id, task.nome, task.custo, task.data_limite);
                    });

                    // Botão Excluir
                    const deleteButton = taskItem.querySelector('.delete-btn');
                    deleteButton.addEventListener('click', () => {
                        confirmDelete(task.id);
                    });
                });
            })
            .catch(error => console.error("Erro ao carregar as tarefas:", error));
    }

    

    // Função para determinar a posição onde o item será inserido
    function getDragAfterElement(taskList, y) {
        const draggableElements = [...taskList.querySelectorAll('.task-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Função para mover a tarefa no servidor (reordenação)
    function reorderTasks() {
        const taskIds = [...taskList.children].map(task => task.getAttribute('data-id'));
        
        fetch('/tarefas/reordenar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskIds })
        })
        .then(response => response.text())
        .then(message => {
            console.log(message); // Exibe a mensagem do servidor
        })
        .catch(error => console.error("Erro ao reordenar as tarefas:", error));
    }

    form.addEventListener('submit', event => {
    event.preventDefault(); // Previne o comportamento padrão do form

    const nome = document.getElementById('nome').value.trim();
    const custo = document.getElementById('custo').value;
    const data_limite = document.getElementById('data_limite').value;

    // Verificar se o nome já existe na lista de tarefas
    const taskItems = [...taskList.querySelectorAll('.task-item')];
    const isDuplicate = taskItems.some(taskItem => {
        const taskName = taskItem.querySelector('strong').nextSibling.textContent.trim();
        return taskName === nome;
    });

    if (isDuplicate) {
        alert('Já existe uma tarefa com este nome. Por favor, escolha outro nome.');
        return;
    }

    const taskData = { nome, custo, data_limite };

    fetch('/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    })
    .then(() => {
        form.reset(); // Limpa o formulário
        loadTasks();  // Recarrega a lista de tarefas
    })
    .catch(error => console.error("Erro ao adicionar tarefa:", error));
});

    // Exibe o formulário de edição com os dados da tarefa
    function showEditForm(id, nome, custo, data_limite) {
        document.getElementById('edit-nome').value = nome;
        document.getElementById('edit-custo').value = custo;
        document.getElementById('edit-data_limite').value = data_limite;
        document.getElementById('edit-id').value = id;
        editFormContainer.style.display = "block";
    }

    // Cancela a edição e esconde o formulário
    cancelEditButton.addEventListener('click', function() {
        editFormContainer.style.display = "none";
    });

    // Envia o formulário de edição para atualizar a tarefa
    editForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const id = document.getElementById('edit-id').value;
        const nome = document.getElementById('edit-nome').value;
        const custo = document.getElementById('edit-custo').value;
        const data_limite = document.getElementById('edit-data_limite').value;

        fetch(`/tarefas/${id}`, { // Corrigido: Uso de crase para interpolação
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, custo, data_limite })
        })
        .then(response => response.text())
        .then(() => {
            alert("Tarefa atualizada!");
            loadTasks(); // Recarrega as tarefas
            editFormContainer.style.display = "none"; // Fecha o formulário
        })
        .catch(error => console.error("Erro ao atualizar tarefa:", error));
    });

    // Função para excluir a tarefa
    function confirmDelete(taskId) {
        confirmDeleteContainer.style.display = 'block';
        deleteForm.onsubmit = function(event) {
            event.preventDefault(); // Impede o comportamento padrão de envio
            deleteTask(taskId);
        };
    }

    function cancelDelete() {
        confirmDeleteContainer.style.display = 'none';
    }

    function deleteTask(taskId) {
        fetch(`/tarefas/${taskId}`, { // Corrigido: Uso de crase para interpolação
            method: 'DELETE'
        })
        .then(response => response.text())
        .then(message => {
            alert(message);
            loadTasks(); // Atualiza a lista de tarefas após exclusão
            confirmDeleteContainer.style.display = 'none'; // Esconde o formulário de confirmação
        })
        .catch(error => console.error("Erro ao excluir tarefa:", error));
    }

    // Função para adicionar uma nova tarefa
    form.addEventListener('submit', event => {
        event.preventDefault(); // Previne o comportamento padrão do form

        const nome = document.getElementById('nome').value;
        const custo = document.getElementById('custo').value;
        const data_limite = document.getElementById('data_limite').value;

        const taskData = { nome, custo, data_limite };

        fetch('/tarefas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        })
        .then(() => {
            form.reset(); // Limpa o formulário
            loadTasks();  // Recarrega a lista de tarefas
        })
        .catch(error => console.error("Erro ao adicionar tarefa:", error));
    });

    // Inicializa a lista de tarefas ao carregar a página
    loadTasks();
});
