const form = document.getElementById('entry-form');
const typeSelect = document.getElementById('entry-type');
const dayField = document.getElementById('day-field');
const classList = document.getElementById('class-list');
const taskList = document.getElementById('task-list');

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

function deleteEntry(entries, entry) {
  const realIndex = entries.indexOf(entry);
  entries.splice(realIndex, 1);
  saveEntries(entries);
  renderEntries();
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

  // Render classes as table rows
  classes.forEach(function (entry) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + entry.title + '</td>' +
      '<td>' + entry.day + '</td>' +
      '<td>' + entry.time + '</td>' +
      '<td>' + (entry.venue || '—') + '</td>' +
      '<td></td>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.addEventListener('click', function () {
      deleteEntry(entries, entry);
    });

    tr.lastElementChild.appendChild(deleteBtn);
    classList.appendChild(tr);
  });

  // Render tasks as a list
  tasks.forEach(function (entry) {
    const li = document.createElement('li');
    li.className = 'entry-item task';

    const details = document.createElement('div');
    details.className = 'entry-details';
    details.innerHTML = '<strong>' + entry.title + '</strong>' +
      '<span class="entry-meta">' + entry.time + '</span>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.addEventListener('click', function () {
      deleteEntry(entries, entry);
    });

    li.appendChild(details);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const entry = {
    type: typeSelect.value,
    title: document.getElementById('entry-title').value,
    day: document.getElementById('entry-day').value,
    time: document.getElementById('entry-time').value,
    venue: document.getElementById('entry-venue').value
  };

  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  renderEntries();

  form.reset();
  dayField.style.display = 'flex';
});

renderEntries();