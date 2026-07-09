const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todos = [];
let editingId = null;
let doneCollapsed = true;
let sortables = [];

// ---- Datum helpers ----

function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function offsetDay(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function labelDate(dateStr) {
    const t = todayStr();
    if (dateStr === t) return 'Vandaag';
    if (dateStr === offsetDay(1)) return 'Morgen';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function labelDuration(min) {
    if (!min) return null;
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}u ${m}m` : `${h}u`;
}

// ---- Groeperen ----

function buildGroups(todos) {
    const t = todayStr();
    const groups = {
        overdue:  { label: 'Te laat',    cls: 'group-overdue', items: [] },
        today:    { label: 'Vandaag',    cls: 'group-today',   items: [] },
        tomorrow: { label: 'Morgen',     cls: '',              items: [] },
        later:    { label: 'Later',      cls: '',              items: [] },
        none:     { label: 'Geen datum', cls: '',              items: [] },
        done:     { label: 'Klaar',      cls: '',              items: [] },
    };

    for (const todo of todos) {
        if (todo.completed) { groups.done.items.push(todo); continue; }
        const d = todo.due_date;
        if (!d)                    groups.none.items.push(todo);
        else if (d < t)            groups.overdue.items.push(todo);
        else if (d === t)          groups.today.items.push(todo);
        else if (d === offsetDay(1)) groups.tomorrow.items.push(todo);
        else                       groups.later.items.push(todo);
    }

    // Sorteer per groep: eerst op tijdstip, dan op positie
    for (const g of Object.values(groups)) {
        g.items.sort((a, b) => {
            if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
            if (a.due_time) return -1;
            if (b.due_time) return 1;
            return (a.position ?? 0) - (b.position ?? 0);
        });
    }

    return groups;
}

// ---- Render ----

function render() {
    const main = document.getElementById('task-list');
    sortables.forEach(s => s.destroy());
    sortables = [];

    const groups = buildGroups(todos);
    const order = ['overdue', 'today', 'tomorrow', 'later', 'none', 'done'];
    let html = '';
    let hasOpen = false;

    for (const key of order) {
        const g = groups[key];
        if (g.items.length === 0) continue;
        if (key !== 'done') hasOpen = true;

        if (key === 'done') {
            html += renderDoneGroup(g);
        } else {
            html += renderGroup(key, g);
        }
    }

    if (!hasOpen && groups.done.items.length === 0) {
        html = `<div class="empty-state"><div class="icon">✓</div><p>Geen taken. Klik op + om er een toe te voegen.</p></div>`;
    }

    main.innerHTML = html;

    // Drag-and-drop per groep
    for (const key of ['overdue', 'today', 'tomorrow', 'later', 'none']) {
        const el = document.getElementById('list-' + key);
        if (!el) continue;
        sortables.push(Sortable.create(el, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: () => saveOrder(key),
        }));
    }

    // Klik buiten modal sluit hem
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
}

function renderGroup(key, g) {
    return `
        <div class="task-group ${g.cls}" data-group="${key}">
            <div class="group-header">
                <h2>${g.label}</h2>
                <span class="group-count">${g.items.length}</span>
            </div>
            <div class="task-list-inner" id="list-${key}">
                ${g.items.map(renderTodo).join('')}
            </div>
        </div>`;
}

function renderDoneGroup(g) {
    const collapsed = doneCollapsed;
    return `
        <div class="task-group" data-group="done">
            <div class="group-header">
                <button class="done-toggle ${collapsed ? 'collapsed' : ''}" onclick="toggleDone()">
                    <span class="arrow">▾</span>
                    Klaar
                    <span class="group-count">${g.items.length}</span>
                </button>
            </div>
            <div id="list-done" ${collapsed ? 'style="display:none"' : ''}>
                ${g.items.map(renderTodo).join('')}
            </div>
        </div>`;
}

function renderTodo(todo) {
    const chips = [];
    if (todo.due_date) {
        const time = todo.due_time ? ' ' + todo.due_time.slice(0, 5) : '';
        chips.push(`<span class="meta-chip date">📅 ${labelDate(todo.due_date)}${time}</span>`);
    }
    if (todo.duration_minutes) {
        chips.push(`<span class="meta-chip">⏱ ${labelDuration(todo.duration_minutes)}</span>`);
    }

    return `
        <div class="task-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <span class="drag-handle" title="Slepen om te herordenen">⠿</span>
            <div class="task-check ${todo.completed ? 'done' : ''}" onclick="toggleDone_task('${todo.id}')"></div>
            <div class="task-body" onclick="openEdit('${todo.id}')">
                <div class="task-title">${escape(todo.title)}</div>
                ${chips.length ? `<div class="task-meta">${chips.join('')}</div>` : ''}
            </div>
            <button class="task-del" onclick="deleteTodo('${todo.id}')" title="Verwijderen">×</button>
        </div>`;
}

function escape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toggleDone() {
    doneCollapsed = !doneCollapsed;
    const list = document.getElementById('list-done');
    const btn = document.querySelector('.done-toggle');
    if (list) list.style.display = doneCollapsed ? 'none' : '';
    if (btn) btn.classList.toggle('collapsed', doneCollapsed);
}

// ---- Acties ----

async function toggleDone_task(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    render();
    const { error } = await db.from('todos').update({
        completed: todo.completed,
        completed_at: todo.completed ? new Date().toISOString() : null,
    }).eq('id', id);
    if (error) { todo.completed = !todo.completed; render(); }
}

async function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    render();
    await db.from('todos').delete().eq('id', id);
}

async function saveOrder(groupKey) {
    const el = document.getElementById('list-' + groupKey);
    if (!el) return;
    const items = [...el.querySelectorAll('.task-item')];
    for (let i = 0; i < items.length; i++) {
        const id = items[i].dataset.id;
        const todo = todos.find(t => t.id === id);
        if (todo) todo.position = i * 10;
    }
    for (const item of items) {
        await db.from('todos').update({ position: todos.find(t => t.id === item.dataset.id)?.position ?? 0 }).eq('id', item.dataset.id);
    }
}

// ---- Modal ----

function openAdd() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Nieuwe taak';
    document.getElementById('task-form').reset();
    document.getElementById('task-date').value = todayStr();
    document.getElementById('modal-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('task-title').focus(), 50);
}

function openEdit(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    editingId = id;
    document.getElementById('modal-title').textContent = 'Taak bewerken';
    document.getElementById('task-title').value = todo.title;
    document.getElementById('task-date').value = todo.due_date || '';
    document.getElementById('task-time').value = todo.due_time ? todo.due_time.slice(0, 5) : '';
    document.getElementById('task-duration').value = todo.duration_minutes || '';
    document.getElementById('modal-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('task-title').focus(), 50);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    editingId = null;
}

async function onSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const due_date = document.getElementById('task-date').value || null;
    const due_time = document.getElementById('task-time').value || null;
    const duration_minutes = parseInt(document.getElementById('task-duration').value) || null;
    if (!title) return;

    closeModal();

    if (editingId) {
        const { error } = await db.from('todos').update({ title, due_date, due_time, duration_minutes }).eq('id', editingId);
        if (!error) {
            const todo = todos.find(t => t.id === editingId);
            if (todo) Object.assign(todo, { title, due_date, due_time, duration_minutes });
            render();
        }
    } else {
        const maxPos = todos.reduce((m, t) => Math.max(m, t.position ?? 0), 0);
        const { data, error } = await db.from('todos').insert({
            title, due_date, due_time, duration_minutes, position: maxPos + 10,
        }).select().single();
        if (!error && data) { todos.push(data); render(); }
    }
}

// ---- Laden ----

async function load() {
    const { data, error } = await db.from('todos').select('*').order('position').order('created_at');
    if (error) {
        document.getElementById('task-list').innerHTML =
            `<div class="error-banner">Kan geen verbinding maken met Supabase. Controleer config.js.</div>`;
        return;
    }
    todos = data || [];
    render();
}

// ---- Init ----

document.getElementById('btn-add').addEventListener('click', openAdd);
document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('task-form').addEventListener('submit', onSubmit);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    const tag = document.activeElement.tagName;
    if (e.key === 'n' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') openAdd();
});

load();

// Real-time sync: als iemand op telefoon wijzigt, update automatisch op desktop
db.channel('todos-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, load)
    .subscribe();
