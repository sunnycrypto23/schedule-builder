const form = document.getElementById('entry-form');
const typeSelect = document.getElementById('entry-type');
const dayField = document.getElementById('day-field');
const list = document.getElementById('entry-list');

// Show/hide the "Day" field depending on entry type
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

function renderEntries() {
  const entries = loadEntries();
  list.innerHTML = '';

  entries.forEach(function (entry, index) {
    const li = document.createElement('li');
    li.className = 'entry-item ' + entry.type;

    const details = document.createElement('div');
    details.className = 'entry-details';

    const meta = entry.type === 'class'
      ? entry.day + ' · ' + entry.time + (entry.venue ? ' · ' + entry.venue : '')
      : 'Study Task · ' + entry.time;

    details.innerHTML = '<strong>' + entry.title + '</strong>' +
      '<span class="entry-meta">' + meta + '</span>';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.addEventListener('click', function () {
      entries.splice(index, 1);
      saveEntries(entries);
      renderEntries();
    });

    li.appendChild(details);
    li.appendChild(deleteBtn);
    list.appendChild(li);
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