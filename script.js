// Login functionality
const loginForm = document.getElementById('login-form');
const loginOverlay = document.getElementById('login-overlay');
const errorMessage = document.getElementById('error-message');

// Valid users (in a real app, this would be handled server-side with proper authentication)
const validUsers = {
    'rishi': 'password123',
    'aprajita': 'aprajita456'
};

// Handle login form submission
loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (validUsers[username] && validUsers[username] === password) {
        // Successful login
        document.body.classList.add('logged-in');
        loginOverlay.style.display = 'none';
        document.querySelectorAll('*').forEach(el => el.style.display = '');
        
        // Store login state in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username);
        
        // Initialize fixed dates
        setTogetherText();
        startBirthdayCountdown();
    } else {
        // Show error message
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
});

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        document.body.classList.add('logged-in');
        loginOverlay.style.display = 'none';
        document.querySelectorAll('*').forEach(el => el.style.display = '');
        setTogetherText();
        startBirthdayCountdown();
    }
});

// Set the fixed "Together Since" text
function setTogetherText() {
    const td = document.getElementById('together-date');
    if (td) td.textContent = 'August 6, 2025';
}

// Fixed Birthday Countdown to April 30
function startBirthdayCountdown() {
    function update() {
        const now = new Date();
        const currentYear = now.getFullYear();
        // Months are 0-indexed: 3 = April
        let nextBirthday = new Date(currentYear, 3, 30, 0, 0, 0);
        if (now > nextBirthday) {
            nextBirthday = new Date(currentYear + 1, 3, 30, 0, 0, 0);
        }
        const totalSeconds = Math.floor((nextBirthday - now) / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (daysEl) daysEl.textContent = formatTime(days);
        if (hoursEl) hoursEl.textContent = formatTime(hours);
        if (minutesEl) minutesEl.textContent = formatTime(minutes);
        if (secondsEl) secondsEl.textContent = formatTime(seconds);
    }
    update();
    setInterval(update, 1000);
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');

logoutBtn?.addEventListener('click', () => {
    // Clear login state
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.reload();
});

// DOM Elements
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const navbar = document.getElementById('navbar');
const togetherDate = document.getElementById('together-date');

// Mobile menu toggle
menuToggle?.addEventListener('click', () => navLinks?.classList.toggle('active'));

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => navLinks?.classList.remove('active'));});

// Sticky navbar on scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) return navbar?.classList.remove('scroll-up');
    
    if (currentScroll > lastScroll && !navbar?.classList.contains('scroll-down')) {
        navbar?.classList.remove('scroll-up');
        navbar?.classList.add('scroll-down');
    } else if (currentScroll < lastScroll && navbar?.classList.contains('scroll-down')) {
        navbar?.classList.remove('scroll-down');
        navbar?.classList.add('scroll-up');
    }
    lastScroll = currentScroll;
});

// Set current year in footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// 1. Birthday Countdown (fixed to April 30)
const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

function formatTime(time) {
    return time < 10 ? `0${time}` : time;
}

// 2. Truth & Dare Game
const truthBtn = document.getElementById('truth-btn');
const dareBtn = document.getElementById('dare-btn');
const questionEl = document.getElementById('question');

const truthQuestions = [
    "What's your favorite memory of us together?",
    "What was your first impression of me?",
    "What's something you've always wanted to tell me?"
];

const dareChallenges = [
    "Give me a 30-second massage.",
    "Whisper something sweet in my ear.",
    "Recreate our first date."
];

const showRandom = (arr, element) => {
    if (!element) return;
    const randomIndex = Math.floor(Math.random() * arr.length);
    element.textContent = arr[randomIndex];
    element.style.animation = 'fadeIn 0.5s';
    setTimeout(() => element.style.animation = '', 500);
};

truthBtn?.addEventListener('click', () => showRandom(truthQuestions, questionEl));
dareBtn?.addEventListener('click', () => showRandom(dareChallenges, questionEl));

// 3. Love Notes
const noteText = document.getElementById('note-text');
const addNoteBtn = document.getElementById('add-note');
const notesList = document.getElementById('notes-list');
let notes = JSON.parse(localStorage.getItem('loveNotes')) || [];

function displayNotes() {
    if (!notesList) return;
    notesList.innerHTML = notes.map((note, index) => `
        <div class="note">
            <p>${note.text}</p>
            <p class="note-date">${new Date(note.date).toLocaleDateString()}</p>
            <button class="delete-note" data-index="${index}">×</button>
        </div>`).join('');
    
    document.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            notes.splice(e.target.dataset.index, 1);
            localStorage.setItem('loveNotes', JSON.stringify(notes));
            displayNotes();
        });
    });
}

addNoteBtn?.addEventListener('click', () => {
    const text = noteText?.value.trim();
    if (!text) return;
    notes.unshift({ text, date: new Date().toISOString() });
    localStorage.setItem('loveNotes', JSON.stringify(notes));
    noteText.value = '';
    displayNotes();
});

// 4. Gallery
const photoUpload = document.getElementById('photo-upload');
const galleryGrid = document.getElementById('gallery-grid');
let photos = JSON.parse(localStorage.getItem('galleryPhotos')) || [];

function displayPhotos() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = photos.map((photo, index) => `
        <div class="gallery-item">
            <img src="${photo.data}" alt="Memory ${index + 1}">
            <button class="delete-photo" data-index="${index}">×</button>
        </div>`).join('');
    
    document.querySelectorAll('.delete-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Delete this photo?')) {
                photos.splice(e.target.dataset.index, 1);
                localStorage.setItem('galleryPhotos', JSON.stringify(photos));
                displayPhotos();
            }
        });
    });
}

photoUpload?.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            photos.unshift({
                name: file.name,
                type: file.type,
                data: event.target.result,
                date: new Date().toISOString()
            });
            localStorage.setItem('galleryPhotos', JSON.stringify(photos));
            displayPhotos();
        };
        reader.readAsDataURL(file);
    });
});

// 5. Bucket List
const bucketItemInput = document.getElementById('bucket-item');
const addBucketItemBtn = document.getElementById('add-bucket-item');
const bucketList = document.getElementById('bucket-list-items');
let bucketItems = JSON.parse(localStorage.getItem('bucketList')) || [];

function displayBucketList() {
    if (!bucketList) return;
    bucketList.innerHTML = bucketItems.map((item, index) => `
        <li class="bucket-item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} data-index="${index}">
            <span>${item.text}</span>
            <button class="delete-bucket" data-index="${index}">×</button>
        </li>`).join('');
    
    document.querySelectorAll('.bucket-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            bucketItems[e.target.dataset.index].completed = e.target.checked;
            localStorage.setItem('bucketList', JSON.stringify(bucketItems));
            displayBucketList();
        });
    });
    
    document.querySelectorAll('.delete-bucket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Remove this item?')) {
                bucketItems.splice(e.target.dataset.index, 1);
                localStorage.setItem('bucketList', JSON.stringify(bucketItems));
                displayBucketList();
            }
        });
    });
}

addBucketItemBtn?.addEventListener('click', () => {
    const text = bucketItemInput?.value.trim();
    if (!text) return;
    bucketItems.push({ text, completed: false, date: new Date().toISOString() });
    localStorage.setItem('bucketList', JSON.stringify(bucketItems));
    bucketItemInput.value = '';
    displayBucketList();
});

// 6. Anniversary Counter
const togetherDaysEl = document.getElementById('together-days');
const togetherMonthsEl = document.getElementById('together-months');
const togetherYearsEl = document.getElementById('together-years');
const startDateInput = document.getElementById('start-date');
const saveDateBtn = document.getElementById('save-date');

let startDate = localStorage.getItem('relationshipStartDate');
if (startDate) {
    startDateInput.value = startDate;
    updateAnniversaryCounter();
    setInterval(updateAnniversaryCounter, 3600000); // Update every hour
}

saveDateBtn?.addEventListener('click', () => {
    if (!startDateInput?.value) return alert('Please select a date');
    startDate = startDateInput.value;
    localStorage.setItem('relationshipStartDate', startDate);
    updateAnniversaryCounter();
    setInterval(updateAnniversaryCounter, 3600000);
});

function updateAnniversaryCounter() {
    if (!startDate) return;
    
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = now - start;
    const diffDays = Math.floor(diffTime / 86400000);
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    
    if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
        years--;
        months += 12;
    }
    
    if (now.getDate() < start.getDate()) months--;
    
    if(togetherDaysEl) togetherDaysEl.textContent = diffDays;
    if(togetherMonthsEl) togetherMonthsEl.textContent = months;
    if(togetherYearsEl) togetherYearsEl.textContent = years;
    if(togetherDate) togetherDate.textContent = start.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// 7. Song Dedication
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const songLink = document.getElementById('song-link');
const addSongBtn = document.getElementById('add-song');
const songsList = document.getElementById('songs-list');
let songs = JSON.parse(localStorage.getItem('dedicatedSongs')) || [];

function displaySongs() {
    if (!songsList) return;
    songsList.innerHTML = songs.map((song, index) => {
        let embedHtml = '';
        if (song.link.includes('youtube.com') || song.link.includes('youtu.be')) {
            const videoId = song.link.includes('youtube.com') 
                ? song.link.split('v=')[1] 
                : song.link.split('youtu.be/')[1];
            embedHtml = `<iframe class="song-iframe" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (song.link.includes('spotify')) {
            embedHtml = `<iframe class="song-iframe" src="${song.link.replace('spotify.com', 'spotify.com/embed')}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
        } else {
            embedHtml = '<div class="song-iframe">Preview not available</div>';
        }
        
        return `
            <div class="song-card">
                ${embedHtml}
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                    <div class="song-actions">
                        <span class="song-date">${new Date(song.date).toLocaleDateString()}</span>
                        <button class="delete-song" data-index="${index}">×</button>
                    </div>
                </div>
            </div>`;
    }).join('');
    
    document.querySelectorAll('.delete-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Remove this song?')) {
                songs.splice(e.target.dataset.index, 1);
                localStorage.setItem('dedicatedSongs', JSON.stringify(songs));
                displaySongs();
            }
        });
    });
}

addSongBtn?.addEventListener('click', () => {
    const title = songTitle?.value.trim();
    const artist = songArtist?.value.trim();
    const link = songLink?.value.trim();
    
    if (!title || !artist || !link) return alert('Please fill in all fields');
    
    songs.unshift({ title, artist, link, date: new Date().toISOString() });
    localStorage.setItem('dedicatedSongs', JSON.stringify(songs));
    
    songTitle.value = songArtist.value = songLink.value = '';
    displaySongs();
});

// 8. Mood Tracker
const moodOptions = document.querySelectorAll('.mood-option');
const moodCalendarGrid = document.getElementById('mood-calendar-grid');
let moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || {};

function initMoodCalendar() {
    if (!moodCalendarGrid) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    let calendarHTML = '';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const mood = moodHistory[dateKey];
        const isToday = now.getDate() === day && now.getMonth() === currentMonth;
        
        calendarHTML += `
            <div class="calendar-day ${mood ? 'mood-' + mood : ''} ${isToday ? 'today' : ''}" 
                 data-date="${dateKey}">
                ${day}
                ${mood ? `<span class="mood-emoji">${getMoodEmoji(mood)}</span>` : ''}
            </div>`;
    }
    
    moodCalendarGrid.innerHTML = calendarHTML;
}

function getMoodEmoji(mood) {
    const emojis = {
        happy: '😊',
        loved: '🥰',
        romantic: '💝',
        playful: '😄',
        grateful: '🙏'
    };
    return emojis[mood] || '';
}

moodOptions.forEach(option => {
    option.addEventListener('click', () => {
        const mood = option.dataset.mood;
        const today = new Date().toISOString().split('T')[0];
        moodHistory[today] = mood;
        localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
        initMoodCalendar();
    });
});

// 9. Secret Message Decoder
const messageToEncode = document.getElementById('message-to-encode');
const encodeBtn = document.getElementById('encode-btn');
const encodedMessage = document.getElementById('encoded-message');
const copyEncodedBtn = document.getElementById('copy-encoded');
const messageToDecode = document.getElementById('message-to-decode');
const decodeBtn = document.getElementById('decode-btn');
const decodedMessage = document.getElementById('decoded-message');

function encodeMessage(text) {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, 
        (match, p1) => String.fromCharCode('0x' + p1)));
}

function decodeMessage(encoded) {
    try {
        return decodeURIComponent(atob(encoded).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
    } catch (e) {
        return 'Invalid encoded message';
    }
}

encodeBtn?.addEventListener('click', () => {
    if (!encodedMessage) return;
    encodedMessage.textContent = encodeMessage(messageToEncode.value);
});

decodeBtn?.addEventListener('click', () => {
    if (!decodedMessage) return;
    decodedMessage.textContent = decodeMessage(messageToDecode.value);
});

copyEncodedBtn?.addEventListener('click', () => {
    if (!encodedMessage) return;
    navigator.clipboard.writeText(encodedMessage.textContent);
    copyEncodedBtn.textContent = 'Copied!';
    setTimeout(() => copyEncodedBtn.textContent = 'Copy', 2000);
});

// Initialize all components
document.addEventListener('DOMContentLoaded', () => {
    displayNotes();
    displayPhotos();
    displayBucketList();
    displaySongs();
    initMoodCalendar();
    updateAnniversaryCounter();
});
