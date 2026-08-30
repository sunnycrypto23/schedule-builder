const form = document.getElementById('entry-form');
const typeSelect = document.getElementById('entry-type');
const dayField = document.getElementById('day-field');
const classList = document.getElementById('class-list');
const taskList = document.getElementById('task-list');
const submitBtn = form.querySelector('button[type="submit"]');

let editingId = null;

typeSelect.addEventListener('change', function () {
  dayField.style.display = typeSelect.value === 'class' ? 'flex' : 'none';
});

function loadEntries() {
  const saved = localStorage.getItem('scheduleEntries');
  return saved ? JSON.parse(saved) : [];
}

function saveEntries(entries) {
  localStorage.setItem('scheduleEntries', JSON.stringify(entries));
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function deleteEntry(id) {
  const entries = loadEntries().filter(e => e.id !== id);
  saveEntries(entries);
  clearReminder(id);
  renderEntries();
}

function startEdit(entry) {
  editingId = entry.id;
  typeSelect.value = entry.type;
  document.getElementById('entry-title').value = entry.title;
  document.getElementById('entry-day').value = entry.day || 'Monday';
  document.getElementById('entry-time').value = entry.time;
  document.getElementById('entry-venue').value = entry.venue || '';
  dayField.style.display = entry.type === 'class' ? 'flex' : 'none';
  submitBtn.textContent = 'Save Changes';
  window.scrollTo(0, 0);
}

function renderEntries() {
  const entries = loadEntries();
  classList.innerHTML = '';
  taskList.innerHTML = '';

  const classes = entries.filter(e => e.type === 'class');
  const tasks = entries.filter(e => e.type === 'task');

  classes.sort(function (a, b) {
    const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.time.localeCompare(b.time);
  });

  tasks.sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });

  classes.forEach(function (entry) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + entry.title + '</td>' +
      '<td>' + entry.day + '</td>' +
      '<td>' + entry.time + '</td>' +
      '<td>' + (entry.venue || '—') + '</td>' +
      '<td></td>';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const editBtn = document.createElement('button');
    editBtn.className = 'delete-btn';
    editBtn.innerHTML = '✎';
    editBtn.addEventListener('click', function () { startEdit(entry); });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.addEventListener('click', function () { deleteEntry(entry.id); });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    tr.lastElementChild.appendChild(actions);
    classList.appendChild(tr);
  });

  tasks.forEach(function (entry) {
    const li = document.createElement('li');
    li.className = 'entry-item task';

    const details = document.createElement('div');
    details.className = 'entry-details';
    details.innerHTML = '<strong>' + entry.title + '</strong>' +
      '<span class="entry-meta">' + entry.time + '</span>';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const editBtn = document.createElement('button');
    editBtn.className = 'delete-btn';
    editBtn.innerHTML = '✎';
    editBtn.addEventListener('click', function () { startEdit(entry); });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.addEventListener('click', function () { deleteEntry(entry.id); });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(details);
    li.appendChild(actions);
    taskList.appendChild(li);
  });
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const entries = loadEntries();

  const entryData = {
    type: typeSelect.value,
    title: document.getElementById('entry-title').value,
    day: document.getElementById('entry-day').value,
    time: document.getElementById('entry-time').value,
    venue: document.getElementById('entry-venue').value
  };

  if (editingId) {
    const index = entries.findIndex(e => e.id === editingId);
    entryData.id = editingId;
    entries[index] = entryData;
    editingId = null;
    submitBtn.textContent = 'Add';
  } else {
    entryData.id = Date.now().toString();
    entries.push(entryData);
  }

  saveEntries(entries);
  scheduleReminder(entryData);
  renderEntries();

  form.reset();
  dayField.style.display = 'flex';
});

renderEntries();