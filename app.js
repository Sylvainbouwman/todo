const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todos = [];
let editingId = null;
let doneCollapsed = true;
let sortables = [];
let searchQuery = '';

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

// ---- Zoeken ----

function tokenize(q) {
    return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesTodo(todo, tokens) {
    const hay = todo.title.toLowerCase();
    return tokens.every(t => hay.includes(t));
}

function highlightTitle(title, tokens) {
    let html = escape(title);
    for (const token of tokens) {
        html = html.replace(new RegExp(escapeRegex(token), 'gi'), '<mark>$&</mark>');
    }
    return html;
}

function renderSearch() {
    const tokens = tokenize(searchQuery);
    const matches = todos.filter(t => matchesTodo(t, tokens));
    const main = document.getElementById('task-list');
    sortables.forEach(s => s.destroy());
    sortables = [];

    const summary = document.getElementById('header-summary');
    if (summary) {
        summary.textContent = matches.length
            ? `${matches.length} ${matches.length === 1 ? 'resultaat' : 'resultaten'}`
            : 'Niets gevonden';
    }

    if (!matches.length) {
        main.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Geen taken gevonden voor "<strong>${escape(searchQuery)}</strong>"</p></div>`;
        return;
    }

    const open = matches.filter(t => !t.completed).sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
    });
    const done = matches.filter(t => t.completed);

    const renderItem = (todo) => {
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
                <div class="task-body" onclick="openEdit('${todo.id}')">
                    <div class="task-title">${highlightTitle(todo.title, tokens)}</div>
                    ${chips.length ? `<div class="task-meta">${chips.join('')}</div>` : ''}
                </div>
                <div class="task-check ${todo.completed ? 'done' : ''}" onclick="toggleDone_task('${todo.id}')" title="${todo.completed ? 'Zet terug naar actief' : 'Afvinken'}"></div>
            </div>`;
    };

    main.innerHTML = `<div class="search-results">${[...open, ...done].map(renderItem).join('')}</div>`;
}

function clearSearch() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    document.getElementById('search-clear').classList.add('hidden');
    render();
}

// ---- Groeperen ----

function shortDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildGroups(todos) {
    const t = todayStr();
    const tom = offsetDay(1);

    // Vaste groepen zonder datum
    const none = { key: 'none', label: 'Geen datum', sub: null, cls: '', items: [] };
    const done = { key: 'done', label: 'Klaar',      sub: null, cls: '', items: [] };

    // Dynamisch: één groep per unieke datum
    const byDate = {};
    function getDateGroup(d) {
        if (!byDate[d]) {
            let label, sub, cls;
            if (d === t)   { label = 'Vandaag'; sub = shortDate(d); cls = 'group-today'; }
            else if (d === tom) { label = 'Morgen'; sub = shortDate(d); cls = ''; }
            else if (d < t) { label = shortDate(d); sub = null; cls = 'group-overdue'; }
            else            { label = shortDate(d); sub = null; cls = ''; }
            byDate[d] = { key: 'date-' + d, label, sub, cls, items: [] };
        }
        return byDate[d];
    }

    for (const todo of todos) {
        if (todo.completed) { done.items.push(todo); continue; }
        const d = todo.due_date;
        if (!d) { none.items.push(todo); continue; }
        getDateGroup(d).items.push(todo);
    }

    // Sorteer datumgroepen chronologisch, dan vaste groepen achteraan
    const dateGroups = Object.keys(byDate).sort().map(d => byDate[d]);

    // Sorteer taken per groep: tijdstip eerst, dan positie
    const allGroups = [...dateGroups, none, done];
    for (const g of allGroups) {
        g.items.sort((a, b) => {
            if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
            if (a.due_time) return -1;
            if (b.due_time) return 1;
            return (a.position ?? 0) - (b.position ?? 0);
        });
    }

    return allGroups;
}

// ---- Render ----

function render() {
    if (searchQuery.trim()) { renderSearch(); return; }
    const main = document.getElementById('task-list');
    sortables.forEach(s => s.destroy());
    sortables = [];

    const groups = buildGroups(todos);
    let html = '';
    let hasOpen = false;

    for (const g of groups) {
        if (g.items.length === 0) continue;
        if (g.key !== 'done') hasOpen = true;
        html += g.key === 'done' ? renderDoneGroup(g) : renderGroup(g.key, g);
    }

    if (!hasOpen && !groups.find(g => g.key === 'done' && g.items.length > 0)) {
        html = `<div class="empty-state"><div class="icon">✓</div><p>Geen taken. Klik op + om er een toe te voegen.</p></div>`;
    }

    main.innerHTML = html;

    // Totaaltelling in header — berekend vanuit de groepen (altijd in sync met de lijst)
    const openItems = groups.filter(g => g.key !== 'done').flatMap(g => g.items);
    const totalMin = openItems.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const summary = document.getElementById('header-summary');
    if (summary) {
        const parts = [`${openItems.length} ${openItems.length === 1 ? 'taak' : 'taken'}`];
        if (totalMin > 0) parts.push(labelDuration(totalMin));
        summary.textContent = parts.join(' · ');
    }

    // Drag-and-drop — group:'tasks' maakt slepen tussen dagengroepen mogelijk
    for (const g of groups) {
        if (g.key === 'done') continue;
        const el = document.getElementById('list-' + g.key);
        if (!el) continue;
        sortables.push(Sortable.create(el, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            group: 'tasks',
            onEnd: handleDragEnd,
        }));
    }
}

function renderGroup(key, g) {
    const totalMin = g.items.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
    const timeTotal = totalMin > 0 ? `<span class="group-time">⏱ ${labelDuration(totalMin)}</span>` : '';
    const sub = g.sub ? `<span class="group-sub">${g.sub}</span>` : '';
    return `
        <div class="task-group ${g.cls}" data-group="${key}">
            <div class="group-header">
                <h2>${g.label}</h2>
                ${sub}
                <span class="group-count">${g.items.length}</span>
                ${timeTotal}
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
            <div class="task-body" onclick="openEdit('${todo.id}')">
                <div class="task-title">${escape(todo.title)}</div>
                ${chips.length ? `<div class="task-meta">${chips.join('')}</div>` : ''}
            </div>
            <div class="task-check ${todo.completed ? 'done' : ''}" onclick="toggleDone_task('${todo.id}')" title="${todo.completed ? 'Zet terug naar actief' : 'Afvinken'}"></div>
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

let confirmPendingId = null;

function toggleDone_task(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    if (todo.completed) {
        markDone(id, false);
        return;
    }

    confirmPendingId = id;
    document.getElementById('confirm-task-name').textContent = `"${todo.title}"`;
    document.getElementById('confirm-overlay').classList.remove('hidden');
}

async function markDone(id, completed) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = completed;
    render();
    const { error } = await db.from('todos').update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', id);
    if (error) { todo.completed = !completed; render(); }
}

let pendingDelete = null;

function deleteTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Annuleer een eventuele vorige pending delete eerst
    if (pendingDelete) commitDelete();

    todos = todos.filter(t => t.id !== id);
    render();

    document.getElementById('undo-label').textContent = `"${todo.title}" verwijderd.`;
    document.getElementById('undo-toast').classList.remove('hidden');

    pendingDelete = {
        todo,
        timer: setTimeout(() => { commitDelete(); }, 6000),
    };
}

async function commitDelete() {
    if (!pendingDelete) return;
    const { todo, timer } = pendingDelete;
    clearTimeout(timer);
    pendingDelete = null;
    document.getElementById('undo-toast').classList.add('hidden');
    await db.from('todos').delete().eq('id', todo.id);
}

function undoDelete() {
    if (!pendingDelete) return;
    const { todo, timer } = pendingDelete;
    clearTimeout(timer);
    pendingDelete = null;
    document.getElementById('undo-toast').classList.add('hidden');
    todos.push(todo);
    todos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    render();
}

function dateFromGroupKey(key) {
    if (key.startsWith('date-')) return key.slice(5); // 'date-2026-07-10' → '2026-07-10'
    return null; // 'none' groep: geen datum
}

async function handleDragEnd(evt) {
    const fromKey = evt.from.id.replace('list-', '');
    const toKey   = evt.to.id.replace('list-', '');
    const movedId = evt.item.dataset.id;

    if (fromKey !== toKey) {
        const newDate = dateFromGroupKey(toKey);
        const todo = todos.find(t => t.id === movedId);
        if (todo) {
            todo.due_date = newDate;
            await db.from('todos').update({ due_date: newDate }).eq('id', movedId);
        }
        render(); // hergroepeer na datumwijziging
    } else {
        saveOrder(toKey);
    }
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

    const currentEditingId = editingId;
    closeModal();

    if (currentEditingId) {
        const { error } = await db.from('todos').update({ title, due_date, due_time, duration_minutes }).eq('id', currentEditingId);
        if (!error) {
            const todo = todos.find(t => t.id === currentEditingId);
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
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('undo-btn').addEventListener('click', undoDelete);

document.getElementById('confirm-yes').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
    if (confirmPendingId) markDone(confirmPendingId, true);
    confirmPendingId = null;
});
document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
    confirmPendingId = null;
});
document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirm-overlay')) {
        document.getElementById('confirm-overlay').classList.add('hidden');
        confirmPendingId = null;
    }
});

document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    document.getElementById('search-clear').classList.toggle('hidden', !searchQuery);
    render();
});

document.getElementById('search-clear').addEventListener('click', clearSearch);

document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (e.key === 'Escape') {
        if (searchQuery) { clearSearch(); return; }
        closeModal();
        return;
    }
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        const inp = document.getElementById('search-input');
        inp.focus();
        inp.select();
        return;
    }
    if (e.key === 'n' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') openAdd();
});

load();

// Real-time sync: als iemand op telefoon wijzigt, update automatisch op desktop
db.channel('todos-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, load)
    .subscribe();
