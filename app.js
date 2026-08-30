// ========== CONFIGURATION ==========
const SERVER_URL = 'https://schedule-builder-server.onrender.com';

// Optional – fallback browser notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ========== DOM REFS ==========
const form = document.getElementById('entry-form');
const typeSelect = document.getElementById('entry-type');
const dayField = document.getElementById('day-field');
const classList = document.getElementById('class-list');
const taskList = document.getElementById('task-list');
const submitBtn = form.querySelector('button[type="submit"]');
const enableReminderCheckbox = document.getElementById('enable-reminder');
const reminderDatetimeField = document.getElementById('reminder-datetime-field');
const reminderDatetimeInput = document.getElementById('reminder-datetime');

let editingId = null;

// ========== DAY ORDER ==========
const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ========== LOCAL STORAGE HELPERS ==========
function loadEntries() {
  const saved = localStorage.getItem('scheduleEntries');
  return saved ? JSON.parse(saved) : [];
}

function saveEntries(entries) {
  localStorage.setItem('scheduleEntries', JSON.stringify(entries));
}

// ========== MIGRATION ==========
function migrateEntries() {
  const entries = loadEntries();
  let changed = false;
  entries.forEach(function (entry) {
    if (!entry.id) {
      entry.id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      changed = true;
    }
  });
  if (changed) saveEntries(entries);
}

// ========== DATETIME HELPERS ==========
// Converts an ISO string (UTC) into the local "YYYY-MM-DDTHH:MM" format
// that <input type="datetime-local"> expects, so editing shows the
// correct local time instead of raw UTC.
function isoToLocalDatetimeInput(isoString) {
  const date = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ========== HELPER: GET ONESIGNAL PLAYER ID (WAITS FOR INIT) ==========
function getOneSignalPlayerId() {
  return new Promise((resolve, reject) => {
    if (typeof OneSignal !== 'undefined' && OneSignal.initialized) {
      OneSignal.User.getOnesignalId().then(resolve).catch(reject);
      return;
    }

    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function() {
        try {
          const id = await OneSignal.User.getOnesignalId();
          resolve(id);
        } catch (e) {
          reject(e);
        }
      });
    } else {
      reject(new Error('OneSignal SDK not loaded'));
    }
  });
}

// ========== REMINDER FUNCTIONS (SERVER) ==========
async function scheduleReminder(entry) {
  if (!entry.reminderTime) {
    console.warn('No reminderTime set for entry', entry.id);
    return;
  }
  const reminderDate = new Date(entry.reminderTime);
  if (isNaN(reminderDate.getTime()) || reminderDate <= new Date()) {
    console.warn('Reminder time is invalid or in the past for entry', entry.id);
    return;
  }

  try {
    const playerId = await getOneSignalPlayerId();
    if (!playerId) {
      console.warn('No OneSignal player ID – user may not have granted permission');
      return;
    }

    const response = await fetch(`${SERVER_URL}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: playerId,
        title: `Reminder: ${entry.title}`,
        message: `${entry.type === 'class' ? entry.day + ' at ' : ''}${entry.time}${entry.venue ? ' · ' + entry.venue : ''}`,
        scheduledAt: entry.reminderTime
      })
    });

    const data = await response.json();
    if (data.success) {
      entry.reminderServerId = data.id;
      const entries = loadEntries();
      const idx = entries.findIndex(e => e.id === entry.id);
      if (idx !== -1) {
        entries[idx] = entry;
        saveEntries(entries);
      }
      console.log(`📅 Reminder scheduled with server ID: ${data.id} for entry ${entry.id}`);
    } else {
      console.error('Failed to schedule reminder:', data.error);
    }
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
}

async function clearReminder(entry) {
  if (!entry || !entry.reminderServerId) return;

  try {
    await fetch(`${SERVER_URL}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.reminderServerId })
    });
    console.log(`🗑️ Reminder ${entry.reminderServerId} cancelled for entry ${entry.id}`);
    delete entry.reminderServerId;
    const entries = loadEntries();
    const idx = entries.findIndex(e => e.id === entry.id);
    if (idx !== -1) {
      entries[idx] = entry;
      saveEntries(entries);
    }
  } catch (error) {
    console.error('Error cancelling reminder:', error);
  }
}

// ========== CRUD ==========
function deleteEntry(id) {
  const entries = loadEntries();
  const entry = entries.find(e => e.id === id);
  if (entry) {
    clearReminder(entry);
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
  }
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

  const hasReminder = !!entry.reminderTime;
  enableReminderCheckbox.checked = hasReminder;
  if (hasReminder) {
    reminderDatetimeInput.value = isoToLocalDatetimeInput(entry.reminderTime);
    reminderDatetimeField.style.display = 'flex';
  } else {
    reminderDatetimeInput.value = '';
    reminderDatetimeField.style.display = 'none';
  }

  submitBtn.textContent = 'Save Changes';
  window.scrollTo(0, 0);
}

// ========== RENDER ==========
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

// ========== FORM SUBMIT ==========
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

  // ---- Manual reminder handling ----
  let reminderTimeISO = null;
  if (enableReminderCheckbox.checked && reminderDatetimeInput.value) {
    const reminderDate = new Date(reminderDatetimeInput.value);
    if (reminderDate > new Date()) {
      reminderTimeISO = reminderDate.toISOString();
    } else {
      alert('Reminder time must be in the future — entry saved without a reminder.');
    }
  }
  entryData.reminderTime = reminderTimeISO;

  if (editingId) {
    const oldEntry = entries.find(e => e.id === editingId);
    if (oldEntry) {
      clearReminder(oldEntry);
    }
    entryData.id = editingId;
    const index = entries.findIndex(e => e.id === editingId);
    entries[index] = entryData;
    editingId = null;
    submitBtn.textContent = 'Add';
  } else {
    entryData.id = Date.now().toString();
    entries.push(entryData);
  }

  saveEntries(entries);

  if (entryData.reminderTime) {
    scheduleReminder(entryData);
  }

  renderEntries();
  form.reset();
  dayField.style.display = 'flex';
  reminderDatetimeField.style.display = 'flex';
});

// ========== TOGGLE FIELDS ==========
typeSelect.addEventListener('change', function () {
  dayField.style.display = typeSelect.value === 'class' ? 'flex' : 'none';
});

enableReminderCheckbox.addEventListener('change', function () {
  reminderDatetimeField.style.display = this.checked ? 'flex' : 'none';
});

// ========== INIT ==========
migrateEntries();
renderEntries();