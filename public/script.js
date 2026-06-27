// Global variables
let currentUser = null;
let isMobile = window.innerWidth <= 768;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization...');
    try {
        initializeApp();
        console.log('App initialized');
        setupEventListeners();
        console.log('Event listeners setup');
        checkAuthStatus();
        console.log('Auth status checked');
        setupMobileOptimizations();
        console.log('Mobile optimizations setup');
        console.log('Initialization complete!');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Handle window resize for mobile detection
window.addEventListener('resize', function() {
    isMobile = window.innerWidth <= 768;
});

// Setup mobile-specific optimizations
function setupMobileOptimizations() {
    // Prevent zoom on input focus for iOS
    if (isMobile) {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                // Add a small delay to prevent zoom
                setTimeout(() => {
                    this.style.fontSize = '16px';
                }, 100);
            });
        });
    }
    
    // Close modal when clicking outside on mobile
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModals();
            }
        });
    }
    
    // Handle mobile navigation toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }
}

// Initialize the application
function initializeApp() {
    const loadingSpinner = document.querySelector('.loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
    
    // Ensure all modals are hidden by default
    const authModal = document.getElementById('auth-modal');
    const journalModal = document.getElementById('journal-modal');
    if (authModal) authModal.style.display = 'none';
    if (journalModal) journalModal.style.display = 'none';
    
    // Force home page and clear any URL hash
    window.location.hash = '';
    showSection('home');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link, [data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    // Auth modal
    document.querySelectorAll('.auth-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = e.target.getAttribute('data-type');
            showAuthModal(type);
        });
    });

    // Logout button
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            // Close specific modal if it has an onclick, otherwise close all
            if (this.onclick) {
                // Let onclick handle it
                return;
            }
            closeModals();
        });
    });
    
    // Close emoji picker when clicking close button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || e.target.closest('.close-modal')) {
            const modal = e.target.closest('.modal') || e.target.closest('#emoji-picker-modal')?.parentElement;
            if (modal) {
                const modalId = modal.id;
                if (modalId) {
                    closeModal(modalId);
                } else {
                    modal.style.display = 'none';
                }
            }
        }
    });

    // Auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        // Add real-time validation
        loginForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        // Add real-time validation
        registerForm.querySelectorAll('input, select').forEach(field => {
            field.addEventListener('blur', validateField);
            field.addEventListener('input', clearFieldError);
            field.addEventListener('change', clearFieldError);
        });
    }

    // Additional event listeners
    const showJournalModalBtn = document.getElementById('show-journal-modal');
    if (showJournalModalBtn) {
        showJournalModalBtn.addEventListener('click', showJournalModal);
    }

    const sendMessageBtn = document.getElementById('send-message-btn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }

    const logMoodBtn = document.getElementById('log-mood-btn');
    if (logMoodBtn) {
        logMoodBtn.addEventListener('click', logMood);
    }

    // Admin tab buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            showAdminTab(tab);
        });
    });

    // Journal form
    const journalForm = document.getElementById('journal-entry-form');
    if (journalForm) {
        journalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                const response = await fetch('/api/journal', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: formData.get('content'),
                        mood: formData.get('mood'),
                        tags: formData.get('category') ? [formData.get('category')] : [],
                        isPublic: formData.get('isPublic') === 'on' || document.getElementById('journal-public')?.checked || false,
                        isAnonymous: true
                    })
                });

                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    closeModals();
                    // Prepend the new entry for immediate feedback (may be pending moderation)
                    try {
                        const entry = data.entry || data;
                        const entriesContainer = document.getElementById('journal-entries');
                        if (entriesContainer && entry) {
                            entriesContainer.insertAdjacentHTML('afterbegin', renderSingleJournalEntry(entry));
                            attachJournalEntryActions(entry._id || entry.id);
                        }
                    } catch (err) {
                        // Fallback: reload public entries
                        loadJournalEntries();
                    }
                    showSuccess('Journal entry created successfully!');
                    e.target.reset();
                } else {
                    showError(data.message || 'Failed to create journal entry');
                }
            } catch (error) {
                showError('Failed to create journal entry');
            }
        });
    }
}

// Render a single journal entry HTML snippet
function renderSingleJournalEntry(entry) {
    const id = entry._id || entry.id || '';
    const mood = entry.mood || 'No mood';
    const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    const reactionsLike = entry.reactions ? entry.reactions.filter(r => r.type === 'like').length : 0;
    const reactionsLove = entry.reactions ? entry.reactions.filter(r => r.type === 'love').length : 0;
    const reactionsSupport = entry.reactions ? entry.reactions.filter(r => r.type === 'support').length : 0;
    const reactionsHug = entry.reactions ? entry.reactions.filter(r => r.type === 'hug').length : 0;

    // Determine ownership
    let owner = false;
    try {
        if (entry.userId) {
            const uid = typeof entry.userId === 'object' ? (entry.userId._id || entry.userId.id) : entry.userId;
            const currentId = currentUser?._id || currentUser?.id || currentUser?.userId || currentUser?.user;
            owner = uid && currentId && uid.toString() === currentId.toString();
        }
    } catch (e) { owner = false; }

    const pendingBadge = entry.moderationStatus && entry.moderationStatus !== 'approved' ? '<span class="badge pending">Pending</span>' : '';

    return `
        <div class="journal-entry" id="journal-entry-${id}" data-entry-id="${id}">
            <div class="entry-content">${escapeHtml(entry.content || '')}</div>
            <div class="entry-meta">
                <span class="mood">${mood}</span>
                <span class="date">${date}</span>
                ${pendingBadge}
            </div>
            <div class="entry-actions">
                <button class="btn btn-sm" onclick="reactToEntry('${id}', 'like')">❤️ ${reactionsLike}</button>
                <button class="btn btn-sm" onclick="reactToEntry('${id}', 'love')">💕 ${reactionsLove}</button>
                <button class="btn btn-sm" onclick="reactToEntry('${id}', 'support')">💪 ${reactionsSupport}</button>
                <button class="btn btn-sm" onclick="reactToEntry('${id}', 'hug')">🤗 ${reactionsHug}</button>
                ${owner ? `<button class="btn btn-sm edit-entry" data-entry-id="${id}">Edit</button>` : ''}
            </div>
        </div>
    `;
}

function attachJournalEntryActions(entryId) {
    // Attach edit listener if present
    try {
        const el = document.querySelector(`#journal-entry-${entryId} .edit-entry`);
        if (el) {
            el.addEventListener('click', async () => {
                const entryEl = document.getElementById(`journal-entry-${entryId}`);
                const content = entryEl.querySelector('.entry-content')?.textContent || '';
                const newContent = prompt('Edit your journal entry:', content);
                if (newContent === null) return; // cancelled
                try {
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    const resp = await fetch(`/api/journal/${entryId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        credentials: 'include',
                        body: JSON.stringify({ content: newContent })
                    });
                    const result = await resp.json().catch(() => ({}));
                    if (resp.ok) {
                        // update DOM
                        entryEl.querySelector('.entry-content').textContent = newContent;
                        showSuccess('Entry updated');
                    } else {
                        showError(result.error || result.message || 'Failed to update entry');
                    }
                } catch (err) {
                    showError('Failed to update entry');
                }
            });
        }
    } catch (err) {
        console.warn('attachJournalEntryActions error', err);
    }
}

// Small helper to escape HTML when inserting user content
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`]/g, function (match) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[match];
    });
}

// Show/hide sections
function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // Hide all sections first and remove active class
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        console.log('Section displayed:', sectionName);
        // Load section-specific content
        loadSectionContent(sectionName);
    } else {
        console.error('Section not found:', sectionName);
        // Fallback to home if section not found
        const homeSection = document.getElementById('home');
        if (homeSection) {
            homeSection.style.display = 'block';
            homeSection.classList.add('active');
        }
    }

    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        console.log('Navigation updated for:', sectionName);
    }
}

// Load section-specific content
function loadSectionContent(sectionName) {
    switch(sectionName) {
        case 'resources':
            loadResources();
            break;
        case 'journal':
            // Don't load entries automatically - wait for user to click
            showJournalPlaceholder();
            break;
        case 'forum':
            loadForumTopics();
            break;
        case 'chat':
            initializeChat();
            break;
        case 'mood':
            loadMoodHistory();
            break;
        case 'admin':
            if (currentUser && currentUser.role === 'admin') {
                loadAdminDashboard();
            } else {
                showError('Access denied. Admin privileges required.');
            }
            break;
    }
}

// Authentication functions
async function checkAuthStatus() {
    try {
        // First try to check auth status
        const checkResponse = await fetch('/api/auth/check-auth', {
            credentials: 'include'
        });
        
        if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.authenticated) {
                // If authenticated, get full profile
                const profileResponse = await fetch('/api/auth/profile', {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    // Handle both { user: {...} } and direct user object
                    currentUser = profileData.user || profileData;
                    if (currentUser && typeof updateUIForUser === 'function') {
                        updateUIForUser();
                        return;
                    }
                }
            }
        }
        
        // If not authenticated or profile fetch failed, check for stored token
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            // Try to get profile with token
            try {
                const profileResponse = await fetch('/api/auth/profile', {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    // Handle both { user: {...} } and direct user object
                    currentUser = profileData.user || profileData;
                    if (currentUser && typeof updateUIForUser === 'function') {
                        updateUIForUser();
                        return;
                    }
                }
            } catch (e) {
                console.warn('Profile fetch with token failed:', e);
            }
        }
        
        if (typeof updateUIForGuest === 'function') {
            updateUIForGuest();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        updateUIForGuest();
    }
}

function showAuthModal(type = 'login') {
    const authModal = document.getElementById('auth-modal');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    
    if (authModal) {
        authModal.style.display = 'flex';
        
        if (type === 'login') {
            if (loginContainer) loginContainer.style.display = 'block';
            if (registerContainer) registerContainer.style.display = 'none';
        } else if (type === 'register') {
            if (loginContainer) loginContainer.style.display = 'none';
            if (registerContainer) registerContainer.style.display = 'block';
        }
    }
}

function closeModals() {
    const authModal = document.getElementById('auth-modal');
    const journalModal = document.getElementById('journal-modal');
    const emojiModal = document.getElementById('emoji-picker-modal');
    const fileModal = document.getElementById('file-upload-modal');
    
    if (authModal) authModal.style.display = 'none';
    if (journalModal) journalModal.style.display = 'none';
    if (emojiModal) emojiModal.style.display = 'none';
    if (fileModal) fileModal.style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing In...';
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    // Clear previous errors
    clearFormErrors(e.target);
    
    const formData = new FormData(e.target);
    
    // Client-side validation
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (!email || !password) {
        showError('Please fill in all fields');
        resetSubmitButton(submitBtn, originalText);
        return;
    }
    
    console.log('Login attempt:', { email: email });
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            }),
            credentials: 'include'
        });

        // Check if response is ok first
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const errorMsg = data.error || data.message || 'Invalid email or password';
            showError(errorMsg);
            resetSubmitButton(submitBtn, originalText);
            return;
        }
        
        const data = await response.json();
        console.log('Login response:', { status: response.status, data });
        
        if (data.user) {
            currentUser = data.user;
            // Store token if provided
            if (data.token) {
                localStorage.setItem('token', data.token);
                sessionStorage.setItem('token', data.token);
            }
            updateUIForUser();
            closeModals();
            showSuccess(`Welcome back, ${data.user.firstName || data.user.username}! 👋`);
            // Reload current section if needed
            const currentSection = document.querySelector('.section.active')?.id || 'home';
            if (currentSection === 'chat') {
                initializeChat();
            }
        } else {
            // Handle both 'error' and 'message' fields
            const errorMsg = data.error || data.message || 'Invalid email or password';
            showError(errorMsg);
        }
    } catch (error) {
        console.error('Login error:', error);
        // Only show error if it's a network error, not a parsing error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Login failed. Please check your connection and try again.');
        } else {
            showError('An error occurred. Please try again.');
        }
    } finally {
        resetSubmitButton(submitBtn, originalText);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    // Clear previous errors
    clearFormErrors(e.target);
    
    const formData = new FormData(e.target);
    
    const registrationData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        studentId: formData.get('studentId'),
        department: formData.get('department'),
        year: formData.get('year'),
        role: 'student'
    };
    
    // Client-side validation
    const validationErrors = validateRegistrationData(registrationData);
    if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
            showFieldError(error.field, error.message);
        });
        resetSubmitButton(submitBtn, originalText);
        return;
    }
    
    console.log('Registration attempt:', { ...registrationData, password: '[HIDDEN]' });
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Registration response:', { status: response.status, data });
        
        if (response.ok && data.user) {
            currentUser = data.user;
            // Store token if provided
            if (data.token) {
                localStorage.setItem('token', data.token);
                sessionStorage.setItem('token', data.token);
            }
            updateUIForUser();
            closeModals();
            showSuccess('🎉 Welcome to our community! Your account has been created successfully.');
            
            // Update progress indicator
            if (typeof updateProgressIndicator === 'function') {
                updateProgressIndicator(3);
            }
        } else {
            // Handle both 'error' and 'message' fields
            if (data.errors) {
                // Handle field-specific errors
                Object.keys(data.errors).forEach(field => {
                    showFieldError(field, data.errors[field]);
                });
            } else {
                const errorMsg = data.error || data.message || 'Registration failed';
                showError(errorMsg);
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please check your connection and try again.');
    } finally {
        resetSubmitButton(submitBtn, originalText);
    }
}

// Form validation helper
function validateRegistrationData(data) {
    const errors = [];
    
    // Username validation
    if (!data.username || data.username.length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters long' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    
    // Password validation
    if (!data.password || data.password.length < 6) {
        errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
    }
    
    // Name validation
    if (!data.firstName || data.firstName.trim().length < 2) {
        errors.push({ field: 'firstName', message: 'First name must be at least 2 characters' });
    }
    
    if (!data.lastName || data.lastName.trim().length < 2) {
        errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters' });
    }
    
    // Student ID validation
    if (!data.studentId || data.studentId.trim().length < 3) {
        errors.push({ field: 'studentId', message: 'Please enter a valid student ID' });
    }
    
    // Department validation
    if (!data.department) {
        errors.push({ field: 'department', message: 'Please select your department' });
    }
    
    // Year validation
    if (!data.year) {
        errors.push({ field: 'year', message: 'Please select your year' });
    }
    
    return errors;
}

// Show field-specific error
function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.add('error');
        
        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        formGroup.appendChild(errorElement);
        
        // Focus on the field with error
        field.focus();
    }
}

// Clear all form errors
function clearFormErrors(form) {
    form.querySelectorAll('.form-group.error').forEach(group => {
        group.classList.remove('error');
        const errorMessage = group.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    });
}

// Reset submit button
function resetSubmitButton(button, originalText) {
    button.textContent = originalText;
    button.classList.remove('loading');
    button.disabled = false;
}

// Update progress indicator
function updateProgressIndicator(step) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((stepElement, index) => {
        if (index < step) {
            stepElement.classList.add('active');
        } else {
            stepElement.classList.remove('active');
        }
    });
}

// Real-time field validation
function validateField(e) {
    const field = e.target;
    const fieldName = field.name;
    const value = field.value.trim();
    
    // Clear previous error
    clearFieldError(e);
    
    // Validate based on field type
    let isValid = true;
    let errorMessage = '';
    
    switch (fieldName) {
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value) {
                isValid = false;
                errorMessage = 'Email is required';
            } else if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;
            
        case 'password':
            if (!value) {
                isValid = false;
                errorMessage = 'Password is required';
            } else if (value.length < 6) {
                isValid = false;
                errorMessage = 'Password must be at least 6 characters';
            }
            break;
            
        case 'username':
            if (!value) {
                isValid = false;
                errorMessage = 'Username is required';
            } else if (value.length < 3) {
                isValid = false;
                errorMessage = 'Username must be at least 3 characters';
            }
            break;
            
        case 'firstName':
        case 'lastName':
            if (!value) {
                isValid = false;
                errorMessage = `${fieldName === 'firstName' ? 'First' : 'Last'} name is required`;
            } else if (value.length < 2) {
                isValid = false;
                errorMessage = `${fieldName === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters`;
            }
            break;
            
        case 'studentId':
            if (!value) {
                isValid = false;
                errorMessage = 'Student ID is required';
            } else if (value.length < 3) {
                isValid = false;
                errorMessage = 'Please enter a valid student ID';
            }
            break;
            
        case 'department':
        case 'year':
            if (!value) {
                isValid = false;
                errorMessage = `Please select your ${fieldName}`;
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(fieldName, errorMessage);
    } else {
        // Show success state
        const formGroup = field.closest('.form-group');
        formGroup.classList.add('success');
        setTimeout(() => {
            formGroup.classList.remove('success');
        }, 2000);
    }
}

// Clear field error
function clearFieldError(e) {
    const field = e.target;
    const formGroup = field.closest('.form-group');
    
    if (formGroup.classList.contains('error')) {
        formGroup.classList.remove('error');
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
}

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        updateUIForGuest();
        showSuccess('Logged out successfully');
    } catch (error) {
        showError('Logout failed');
    }
}

// UI update functions
function updateUIForUser() {
    console.log('updateUIForUser called, currentUser:', currentUser);
    
    // Hide auth buttons, show user info
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const userName = document.getElementById('user-name');
    
    if (navAuth) navAuth.style.display = 'none';
    if (navUser) navUser.style.display = 'flex';
    
    // Show admin elements if user is admin
    const adminElements = document.querySelectorAll('.admin-only');
    console.log('Found admin elements:', adminElements.length);
    console.log('Admin elements found:', Array.from(adminElements).map(el => el.className));
    
    if (currentUser && currentUser.role === 'admin') {
        console.log('User is admin, showing admin elements');
        adminElements.forEach(element => {
            element.style.display = 'block';
            console.log('Set display block for:', element.className, 'Current display:', element.style.display);
        });
        // Load admin dashboard data on home page
        console.log('Loading admin dashboard home...');
        loadAdminDashboardHome();
    } else {
        console.log('User is not admin or no currentUser. Role:', currentUser?.role);
    }
    
    if (userName) userName.textContent = currentUser.firstName;

    // Show admin link if user is admin
    const adminLink = document.querySelector('[data-section="admin"]');
    if (adminLink) {
        adminLink.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    }
}

function updateUIForGuest() {
    // Show auth buttons, hide user info
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    
    if (navAuth) navAuth.style.display = 'flex';
    if (navUser) navUser.style.display = 'none';

    // Hide admin link
    const adminLink = document.querySelector('[data-section="admin"]');
    if (adminLink) {
        adminLink.style.display = 'none';
    }
}

// Resource functions
async function loadResources() {
    try {
        const response = await fetch('/api/resources');
        const resources = await response.json();
        
        const container = document.querySelector('.resources-container');
        if (container) {
            container.innerHTML = `
                <div class="resources-header">
                    <h2>Mental Health Resources</h2>
                    ${currentUser && (currentUser.role === 'admin' || currentUser.role === 'counselor') ? 
                        '<button class="btn btn-primary" onclick="showAddResourceForm()">Add Resource</button>' : ''}
                </div>
                <div class="resources-grid">
                    ${resources.length > 0 ? resources.map(resource => `
                        <div class="resource-card">
                            <h3>${resource.title}</h3>
                            <p>${resource.description}</p>
                            <div class="resource-meta">
                                <span class="category">${resource.category}</span>
                                <span class="type">${resource.type}</span>
                            </div>
                            <div class="resource-actions">
                                <button class="btn btn-primary" onclick="viewResource('${resource._id}')">Read More</button>
                                <button class="btn btn-secondary" onclick="likeResource('${resource._id}')">
                                    ❤️ ${resource.likes || 0}
                                </button>
                            </div>
                        </div>
                    `).join('') : '<p>No resources available yet.</p>'}
                </div>
            `;
        }
    } catch (error) {
        showError('Failed to load resources');
    }
}

async function viewResource(id) {
    try {
        const response = await fetch(`/api/resources/${id}`);
        const resource = await response.json();
        
        // Show resource in modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>${resource.title}</h2>
                <div class="resource-content">
                    <p><strong>Category:</strong> ${resource.category}</p>
                    <p><strong>Type:</strong> ${resource.type}</p>
                    <div class="content-body">${resource.content}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    } catch (error) {
        showError('Failed to load resource');
    }
}

// Load admin dashboard data for home page
async function loadAdminDashboardHome() {
    console.log('loadAdminDashboardHome called');
    try {
        console.log('Fetching admin stats and users...');
        
        // Check if we have a token
        const token = localStorage.getItem('token');
        console.log('Token available:', !!token);
        
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const [statsResponse, usersResponse] = await Promise.all([
            fetch('/api/admin/stats', { headers }),
            fetch('/api/admin/users?limit=5', { headers })
        ]);
        
        console.log('Stats response status:', statsResponse.status);
        console.log('Users response status:', usersResponse.status);
        
        if (!statsResponse.ok) {
            console.error('Stats response not ok:', statsResponse.status, statsResponse.statusText);
        }
        if (!usersResponse.ok) {
            console.error('Users response not ok:', usersResponse.status, usersResponse.statusText);
        }
        
        const stats = await statsResponse.json();
        const users = await usersResponse.json();
        
        console.log('Stats data:', stats);
        console.log('Users data:', users);
        
        // Update stats cards
        const totalUsersCount = document.getElementById('total-users-count');
        const totalResourcesCount = document.getElementById('total-resources-count');
        const totalJournalEntries = document.getElementById('total-journal-entries');
        const flaggedEntriesCount = document.getElementById('flagged-entries-count');
        
        console.log('Found elements:', {
            totalUsersCount: !!totalUsersCount,
            totalResourcesCount: !!totalResourcesCount,
            totalJournalEntries: !!totalJournalEntries,
            flaggedEntriesCount: !!flaggedEntriesCount
        });
        
        if (totalUsersCount) totalUsersCount.textContent = stats.overview?.totalUsers || 0;
        if (totalResourcesCount) totalResourcesCount.textContent = stats.overview?.totalResources || 0;
        if (totalJournalEntries) totalJournalEntries.textContent = stats.overview?.totalJournalEntries || 0;
        if (flaggedEntriesCount) flaggedEntriesCount.textContent = stats.overview?.flaggedEntries || 0;
        
        // Update recent users
        const recentUsersList = document.getElementById('recent-users-list');
        if (recentUsersList && users.users) {
            recentUsersList.innerHTML = users.users.slice(0, 5).map(user => `
                <div class="user-item">
                    <div class="user-avatar">👤</div>
                    <div class="user-info">
                        <p>${user.firstName} ${user.lastName} (${user.role})</p>
                    </div>
                </div>
            `).join('');
        }
        
        // Update recent activity
        const recentActivityList = document.getElementById('recent-activity-list');
        if (recentActivityList) {
            const activities = [
                { icon: '👥', text: `${stats.overview?.totalUsers || 0} total users registered` },
                { icon: '📚', text: `${stats.overview?.totalResources || 0} resources available` },
                { icon: '📝', text: `${stats.overview?.totalJournalEntries || 0} journal entries shared` },
                { icon: '🚨', text: `${stats.overview?.flaggedEntries || 0} entries flagged for review` }
            ];
            
            recentActivityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">${activity.icon}</div>
                    <div class="activity-content">
                        <p>${activity.text}</p>
                    </div>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Failed to load admin dashboard home data:', error);
    }
}

async function likeResource(id) {
    if (!currentUser) {
        showError('Please login to like resources');
        return;
    }

    try {
        const response = await fetch(`/api/resources/${id}/like`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadResources();
            showSuccess('Resource liked!');
        }
    } catch (error) {
        showError('Failed to like resource');
    }
}

function showAddResourceForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Add New Resource</h2>
            <form id="add-resource-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="title" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" required></textarea>
                </div>
                <div class="form-group">
                    <label>Content</label>
                    <textarea name="content" rows="5" required></textarea>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" required>
                        <option value="stress-management">Stress Management</option>
                        <option value="anxiety">Anxiety</option>
                        <option value="motivation">Motivation</option>
                        <option value="depression">Depression</option>
                        <option value="self-care">Self Care</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select name="type" required>
                        <option value="article">Article</option>
                        <option value="video">Video</option>
                        <option value="guide">Guide</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Add Resource</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#add-resource-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/api/resources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    content: formData.get('content'),
                    category: formData.get('category'),
                    type: formData.get('type')
                })
            });
            
            if (response.ok) {
                document.body.removeChild(modal);
                loadResources();
                showSuccess('Resource added successfully!');
            } else {
                const data = await response.json();
                showError(data.message || 'Failed to add resource');
            }
        } catch (error) {
            showError('Failed to add resource');
        }
    });
}

// Journal functions
function showJournalPlaceholder() {
    const entriesContainer = document.getElementById('journal-entries');
    if (entriesContainer) {
        entriesContainer.innerHTML = `
            <div class="journal-placeholder">
                <div class="placeholder-content">
                    <i class="fas fa-book-open"></i>
                    <h3>Welcome to the Feelings Wall</h3>
                    <p>Click the button below to view journal entries from our community</p>
                    <button class="btn btn-primary" id="load-journal-entries-btn">
                        <i class="fas fa-eye"></i> View Journal Entries
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener to the button
        const loadBtn = document.getElementById('load-journal-entries-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', loadJournalEntries);
        }
    }
}

async function loadJournalEntries() {
    try {
        const entriesContainer = document.getElementById('journal-entries');
        if (!entriesContainer) {
            showError('Journal container not found');
            return;
        }
        
        // Show loading state
        entriesContainer.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Loading entries...</div>';
        
        const response = await fetch('/api/journal/public');
        if (!response.ok) {
            throw new Error('Failed to fetch entries');
        }
        
        const data = await response.json();
        const entries = data.entries || data || [];
        
        if (entries.length > 0) {
            entriesContainer.innerHTML = entries.map(entry => `
                <div class="journal-entry">
                    <div class="entry-content">${entry.content}</div>
                    <div class="entry-meta">
                        <span class="mood">${entry.mood || 'No mood'}</span>
                        <span class="date">${new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="entry-actions">
                        <button class="btn btn-sm" onclick="reactToEntry('${entry._id}', 'like')">❤️ ${entry.reactions?.filter(r => r.type === 'like').length || 0}</button>
                        <button class="btn btn-sm" onclick="reactToEntry('${entry._id}', 'love')">💕 ${entry.reactions?.filter(r => r.type === 'love').length || 0}</button>
                        <button class="btn btn-sm" onclick="reactToEntry('${entry._id}', 'support')">💪 ${entry.reactions?.filter(r => r.type === 'support').length || 0}</button>
                        <button class="btn btn-sm" onclick="reactToEntry('${entry._id}', 'hug')">🤗 ${entry.reactions?.filter(r => r.type === 'hug').length || 0}</button>
                    </div>
                </div>
            `).join('');
        } else {
            entriesContainer.innerHTML = '<div class="no-entries"><p>No journal entries yet. Be the first to share!</p></div>';
        }
    } catch (error) {
        const entriesContainer = document.getElementById('journal-entries');
        if (entriesContainer) {
            entriesContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load journal entries. Please try again.</p>
                    <button class="btn btn-primary" onclick="loadJournalEntries()">Retry</button>
                </div>
            `;
        }
        showError('Failed to load journal entries');
    }
}

async function reactToEntry(entryId, reactionType) {
    if (!currentUser) {
        showError('Please login to react to entries');
        return;
    }
    
    try {
        const response = await fetch(`/api/journal/${entryId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ type: reactionType })
        });
        
        if (response.ok) {
            // Reload entries to show updated reaction counts
            loadJournalEntries();
        } else {
            const data = await response.json();
            showError(data.error || 'Failed to add reaction');
        }
    } catch (error) {
        showError('Failed to add reaction');
    }
}

function showJournalModal() {
    const modal = document.getElementById('journal-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        // Fallback: create modal dynamically if HTML modal doesn't exist
        const newModal = document.createElement('div');
        newModal.className = 'modal';
        newModal.id = 'journal-modal';
        newModal.innerHTML = `
            <div class="modal-content">
                <span class="close close-modal">&times;</span>
                <h2>New Journal Entry</h2>
                <form id="journal-entry-form">
                    <div class="form-group">
                        <label for="journal-content">How are you feeling?</label>
                        <textarea id="journal-content" name="content" rows="4" placeholder="Share your thoughts, feelings, or experiences..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="journal-mood">Mood</label>
                        <select id="journal-mood" name="mood" required>
                            <option value="">Select your mood</option>
                            <option value="very-happy">Very Happy 😊</option>
                            <option value="happy">Happy 🙂</option>
                            <option value="neutral">Neutral 😐</option>
                            <option value="sad">Sad 😔</option>
                            <option value="very-sad">Very Sad 😢</option>
                            <option value="anxious">Anxious 😰</option>
                            <option value="stressed">Stressed 😤</option>
                            <option value="excited">Excited 🤩</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="journal-public" name="isPublic" checked>
                            Share publicly (anonymous)
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">Post Entry</button>
                </form>
            </div>
        `;
        document.body.appendChild(newModal);
        newModal.style.display = 'flex';
        
        newModal.querySelector('.close-modal').addEventListener('click', () => {
            newModal.style.display = 'none';
        });
    }
}

async function reactToEntry(entryId, reaction) {
    if (!currentUser) {
        showError('Please login to react to entries');
        return;
    }

    try {
        const response = await fetch(`/api/journal/${entryId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reaction })
        });

        if (response.ok) {
            loadJournalEntries();
        }
    } catch (error) {
        showError('Failed to react to entry');
    }
}

// Forum functions
async function loadForumTopics() {
    try {
        const response = await fetch('/api/forum/topics');
        const topics = await response.json();
        
        const container = document.querySelector('.forum-container');
        if (container) {
            container.innerHTML = `
                <div class="forum-header">
                    <h2>Peer Support Forum</h2>
                    ${currentUser ? '<button class="btn btn-primary" onclick="createTopic()">Create New Topic</button>' : ''}
                </div>
                <div class="forum-topics">
                    ${topics.length > 0 ? topics.map(topic => `
                        <div class="forum-topic">
                            <h3>${topic.title}</h3>
                            <p>${topic.description}</p>
                            <div class="topic-meta">
                                <span class="author">${topic.author}</span>
                                <span class="date">${new Date(topic.createdAt).toLocaleDateString()}</span>
                                <span class="replies">${topic.replies || 0} replies</span>
                            </div>
                        </div>
                    `).join('') : '<p>No topics yet. Start a discussion!</p>'}
                </div>
            `;
        }
    } catch (error) {
        showError('Failed to load forum topics');
    }
}

function createTopic() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Create New Topic</h2>
            <form id="topic-form">
                <div class="form-group">
                    <label>Topic Title</label>
                    <input type="text" name="title" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description" rows="4" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Create Topic</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#topic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/api/forum/topics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: formData.get('title'),
                    description: formData.get('description')
                })
            });
            
            if (response.ok) {
                document.body.removeChild(modal);
                loadForumTopics();
                showSuccess('Topic created successfully!');
            } else {
                const data = await response.json();
                showError(data.message || 'Failed to create topic');
            }
        } catch (error) {
            showError('Failed to create topic');
        }
    });
}

// Enhanced Chat Functions
let currentChatRoom = 'general';
let chatMessages = [];
let isTyping = false;
let selectedFiles = [];

function initializeChat() {
    console.log('Initializing chat...');
    
    // Get chat section and main container
    const chatSection = document.getElementById('chat');
    if (!chatSection) {
        console.error('Chat section not found');
        return;
    }
    
    const chatMain = chatSection.querySelector('.chat-main');
    if (!chatMain) {
        console.error('Chat main container not found');
        return;
    }
    
    if (!currentUser) {
        console.log('No current user found, showing login prompt');
        chatMain.innerHTML = `
            <div class="chat-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center; min-height: 400px;">
                <i class="fas fa-comments" style="font-size: 4rem; color: #6c63ff; margin-bottom: 1rem;"></i>
                <h3>Please Login to Access Chat</h3>
                <p style="margin: 1rem 0; color: #666;">You need to be logged in to chat with counselors and other users.</p>
                <button class="btn btn-primary" onclick="showAuthModal('login')">
                    <i class="fas fa-sign-in-alt"></i> Login Now
                </button>
            </div>
        `;
        return;
    }

    console.log('Chat initialization for user:', currentUser.username || currentUser.email);
    
    try {
        // Show loading state immediately
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="loading-message" style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading chat...</div>';
        }
        
        // Initialize chat components with fallbacks - don't wait for all to complete
        // Load chat rooms
        loadChatRooms().catch(err => {
            console.warn('Failed to load chat rooms, using defaults:', err);
            showDefaultChatRooms();
        });
        
        // Load counselors
        loadCounselors().catch(err => {
            console.warn('Failed to load counselors, using defaults:', err);
            showDefaultCounselors();
        });
        
        // Load chat history
        loadChatHistory().catch(err => {
            console.warn('Failed to load chat history, using defaults:', err);
            showDefaultChatMessages();
        });
        
        // Setup event listeners immediately
        setTimeout(() => {
            setupChatEventListeners();
            if (typeof setupEmojiPicker === 'function') {
                try {
                    setupEmojiPicker();
                } catch (e) {
                    console.warn('Emoji picker setup failed:', e);
                }
            }
            console.log('Chat initialization complete');
        }, 100);
        
    } catch (error) {
        console.error('Error initializing chat:', error);
        showDefaultChatInterface();
    }
}

function showDefaultChatRooms() {
    const roomsContainer = document.getElementById('chat-rooms');
    if (roomsContainer) {
        roomsContainer.innerHTML = `
            <div class="chat-room active" data-room-id="general">
                <div class="chat-room-header">
                    <span class="chat-room-name">General Support</span>
                </div>
                <div class="chat-room-desc">General mental health support</div>
                <div class="chat-room-meta">
                    <span>Online</span>
                </div>
            </div>
        `;
        document.querySelectorAll('.chat-room').forEach(room => {
            room.addEventListener('click', () => {
                currentChatRoom = room.dataset.roomId;
                loadChatHistory();
            });
        });
    }
}

function showDefaultCounselors() {
    const counselorsContainer = document.getElementById('counselors-list');
    if (counselorsContainer) {
        counselorsContainer.innerHTML = `
            <div class="counselor-item">
                <div class="counselor-avatar">👩‍⚕️</div>
                <div class="counselor-info">
                    <div class="counselor-name">Dr. Sarah Johnson</div>
                    <div class="counselor-status online">Online</div>
                </div>
            </div>
            <div class="counselor-item">
                <div class="counselor-avatar">👨‍⚕️</div>
                <div class="counselor-info">
                    <div class="counselor-name">Dr. Michael Chen</div>
                    <div class="counselor-status online">Online</div>
                </div>
            </div>
        `;
    }
}

function showDefaultChatMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        chatMessages = [
            {
                id: 1,
                sender: 'counselor',
                senderName: 'Dr. Sarah Johnson',
                senderAvatar: '👩‍⚕️',
                message: 'Hello! I\'m here to help. How are you feeling today?',
                timestamp: new Date(),
                type: 'text',
                isAI: true
            }
        ];
        renderChatMessages();
    }
}

function showDefaultChatInterface() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <i class="fas fa-comments" style="font-size: 3rem; color: #6c63ff; margin-bottom: 1rem;"></i>
                <h3>Welcome to Chat Support</h3>
                <p>Start a conversation by typing a message below.</p>
            </div>
        `;
    }
    showDefaultChatRooms();
    showDefaultCounselors();
}

async function loadChatRooms() {
    try {
        console.log('Loading chat rooms...');
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const roomsContainer = document.getElementById('chat-rooms');
        
        if (!roomsContainer) {
            console.warn('Chat rooms container not found');
            return;
        }
        
        const response = await fetch('/api/chat/rooms', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            // If API fails, show default rooms
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Chat rooms data:', data);
        
        const rooms = data.rooms || data || [];
        if (rooms.length > 0) {
            roomsContainer.innerHTML = rooms.map(room => `
                <div class="chat-room ${room.id === currentChatRoom ? 'active' : ''}" data-room-id="${room.id}">
                    <div class="chat-room-header">
                        <span class="chat-room-name">${room.name || 'Chat Room'}</span>
                        ${room.unreadCount > 0 ? `<span class="chat-room-unread">${room.unreadCount}</span>` : ''}
                    </div>
                    <div class="chat-room-desc">${room.description || 'General support chat'}</div>
                    <div class="chat-room-meta">
                        <span>${room.participants || 0} participants</span>
                        ${room.lastMessageTime ? `<span>${formatTime ? formatTime(room.lastMessageTime) : 'Recently'}</span>` : ''}
                    </div>
                </div>
            `).join('');
            
            // Add click listeners
            document.querySelectorAll('.chat-room').forEach(room => {
                room.addEventListener('click', () => {
                    if (typeof switchChatRoom === 'function') {
                        switchChatRoom(room.dataset.roomId);
                    } else {
                        currentChatRoom = room.dataset.roomId;
                        loadChatHistory();
                    }
                });
            });
            
            console.log(`Loaded ${rooms.length} chat rooms`);
        } else {
            showDefaultChatRooms();
        }
    } catch (error) {
        console.warn('Failed to load chat rooms, using defaults:', error);
        showDefaultChatRooms();
    }
}

async function loadCounselors() {
    try {
        console.log('Loading counselors...');
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const counselorsContainer = document.getElementById('counselors-list');
        
        if (!counselorsContainer) {
            console.warn('Counselors container not found');
            return;
        }
        
        const response = await fetch('/api/chat/counselors', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            // If API fails, show default counselors
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Counselors data:', data);
        
        const counselors = data.counselors || data || [];
        if (counselors.length > 0) {
            counselorsContainer.innerHTML = counselors.map(counselor => `
                <div class="counselor-item">
                    <div class="counselor-avatar">${counselor.avatar || '👨‍⚕️'}</div>
                    <div class="counselor-info">
                        <div class="counselor-name">${counselor.name || 'Counselor'}</div>
                        <div class="counselor-specialty">${counselor.specialty || 'Mental Health Support'}</div>
                    </div>
                    <div class="counselor-status ${counselor.status || 'online'}">${counselor.status || 'online'}</div>
                </div>
            `).join('');
            
            console.log(`Loaded ${counselors.length} counselors`);
        } else {
            showDefaultCounselors();
        }
    } catch (error) {
        console.warn('Failed to load counselors, using defaults:', error);
        showDefaultCounselors();
    }
}

async function loadChatHistory() {
    try {
        console.log('Loading chat history for room:', currentChatRoom);
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const messagesContainer = document.getElementById('chat-messages');
        
        if (!messagesContainer) {
            console.warn('Chat messages container not found');
            return;
        }
        
        if (!token) {
            console.warn('No token found, showing default messages');
            showDefaultChatMessages();
            return;
        }
        
        const response = await fetch(`/api/chat/history?roomId=${currentChatRoom}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Chat history response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Chat history data:', data);
        
        chatMessages = data.messages || data || [];
        if (chatMessages.length > 0) {
            renderChatMessages();
            if (typeof scrollToBottom === 'function') {
                scrollToBottom();
            }
            console.log(`Loaded ${chatMessages.length} messages`);
        } else {
            showDefaultChatMessages();
        }
    } catch (error) {
        console.warn('Failed to load chat history, showing defaults:', error);
        showDefaultChatMessages();
    }
}

// Format time helper function (if not already defined)
if (typeof formatTime === 'undefined') {
    function formatTime(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
}

function createMessageHTML(message) {
    const messageClass = message.sender === 'user' ? 'user' : 
                        message.isAI ? 'ai' : 'counselor';
    
    const reactionsHTML = message.reactions && message.reactions.length > 0 ? 
        `<div class="message-reactions">
            ${message.reactions.map(reaction => 
                `<button class="reaction-btn" onclick="addReaction(${message.id}, '${reaction.type}')">
                    ${reaction.type} ${reaction.count}
                </button>`
            ).join('')}
        </div>` : '';
    
    const timeStr = typeof formatTime === 'function' ? formatTime(message.timestamp) : 
                    (message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Just now');
    
    return `
        <div class="chat-message ${messageClass}" data-message-id="${message.id || Date.now()}">
            <div class="message-header">
                <div class="message-avatar">${message.senderAvatar || '👤'}</div>
                <span class="message-sender">${message.senderName || 'User'}</span>
                ${message.isAI ? '<span class="ai-badge">🤖 AI</span>' : ''}
            </div>
            <div class="message-content">${message.message || ''}</div>
            <div class="message-time">${timeStr}</div>
            ${reactionsHTML}
        </div>
    `;
}

// Render the chatMessages array into the DOM
function renderChatMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.warn('renderChatMessages: #chat-messages container not found');
        return;
    }

    // Build HTML for each message
    try {
        const html = (chatMessages || []).map(msg => createMessageHTML(msg)).join('');
        messagesContainer.innerHTML = html || `<div class="chat-welcome"><p>No messages yet. Start the conversation!</p></div>`;

        // Ensure typing indicator is last element
        const typing = document.getElementById('typing-indicator');
        if (typing) messagesContainer.appendChild(typing);
    } catch (err) {
        console.error('renderChatMessages error:', err);
        messagesContainer.innerHTML = `<div class="chat-error"><p>Unable to render messages.</p></div>`;
    }
}

async function sendMessage(message = null) {
    const input = document.getElementById('chat-input-field');
    const messageText = message || input.value.trim();
    
    if (!messageText) return;
    
    console.log('Sending message:', messageText);
    
    try {
        // Show typing indicator
        showTypingIndicator();
        
        // Add user message immediately for better UX
        const userMessage = {
            id: Date.now(),
            sender: 'user',
            senderName: currentUser?.username || 'You',
            senderAvatar: '👤',
            message: messageText,
            timestamp: new Date(),
            type: 'text',
            isAI: false,
            reactions: [],
            isRead: false
        };
        
        chatMessages.push(userMessage);
        renderChatMessages();
        scrollToBottom();
        
        // Clear input immediately
        if (!message) {
            input.value = '';
            input.style.height = 'auto';
        }
        
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                message: messageText,
                roomId: currentChatRoom,
                type: 'text'
            })
        });
        
        console.log('Chat API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Chat API response data:', data);
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add AI response with realistic delay
        setTimeout(() => {
            if (data.aiResponse) {
                chatMessages.push(data.aiResponse);
                renderChatMessages();
                scrollToBottom();
                
                // Show notification for new message
                showNotification('New message received', 'info');
            }
        }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5 seconds
        
    } catch (error) {
        console.error('Failed to send message:', error);
        hideTypingIndicator();
        
        // Show error message to user
        showError(`Failed to send message: ${error.message}`);
        
        // Remove the user message if it failed to send
        chatMessages.pop();
        renderChatMessages();
    }
}

function showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    indicator.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    indicator.style.display = 'none';
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function switchChatRoom(roomId) {
    currentChatRoom = roomId;
    
    // Update active room in UI
    document.querySelectorAll('.chat-room').forEach(room => {
        room.classList.remove('active');
    });
    document.querySelector(`[data-room-id="${roomId}"]`).classList.add('active');
    
    // Update room name in header
    const roomElement = document.querySelector(`[data-room-id="${roomId}"]`);
    const roomName = roomElement.querySelector('.chat-room-name').textContent;
    document.getElementById('current-room-name').textContent = roomName;
    
    // Load messages for new room
    loadChatHistory();
}

function setupChatEventListeners() {
    console.log('Setting up chat event listeners...');
    
    const input = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('send-message-btn');
    
    if (!input || !sendBtn) {
        console.error('Chat input elements not found:', { input: !!input, sendBtn: !!sendBtn });
        return;
    }
    
    // Send message on Enter
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('Enter key pressed, sending message');
            sendMessage();
        }
    });
    
    // Send message on button click
    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Send button clicked');
        sendMessage();
    });
    
    // Auto-resize textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Quick action buttons
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            console.log('Quick action clicked:', action);
            
            switch(action) {
                case 'greeting':
                    sendMessage('Hello! How are you today?');
                    break;
                case 'stress':
                    sendMessage('I\'m feeling stressed about my studies.');
                    break;
                case 'anxiety':
                    sendMessage('I\'ve been feeling anxious lately.');
                    break;
                case 'depression':
                    sendMessage('I\'ve been feeling down and hopeless.');
                    break;
                default:
                    console.log('Unknown quick action:', action);
            }
        });
    });
    
    // Toolbar buttons
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            console.log('Toolbar action clicked:', action);
            
            switch(action) {
                case 'emoji':
                    showEmojiPicker();
                    break;
                case 'file':
                    showFileUpload();
                    break;
                case 'voice':
                    startVoiceRecording();
                    break;
                case 'gif':
                    showGifPicker();
                    break;
                default:
                    console.log('Unknown toolbar action:', action);
            }
        });
    });
    
    // File upload modal event listeners
    const fileInput = document.getElementById('file-input');
    const sendFilesBtn = document.getElementById('send-files');
    const cancelUploadBtn = document.getElementById('cancel-upload');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (sendFilesBtn) {
        sendFilesBtn.addEventListener('click', sendFiles);
    }
    
    if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener('click', () => closeModal('file-upload-modal'));
    }
    
    console.log('Chat event listeners setup complete');
}

function setupEmojiPicker() {
    const emojiGrid = document.getElementById('emoji-grid');
    const emojis = ['😊', '😂', '❤️', '👍', '😢', '😰', '😡', '🤔', '😴', '😎', '🥳', '😍', '🤗', '🙏', '💪', '🎉', '✨', '🔥', '💯', '👏', '🙌', '🤝', '💖', '💙', '💚', '💛', '💜', '🧡', '🖤', '🤍', '🤎'];
    
    emojiGrid.innerHTML = emojis.map(emoji => 
        `<button class="emoji-item" onclick="insertEmoji('${emoji}')">${emoji}</button>`
    ).join('');
}

function showEmojiPicker() {
    const modal = document.getElementById('emoji-picker-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Close when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal('emoji-picker-modal');
            }
        });
        // Close on Escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal('emoji-picker-modal');
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function insertEmoji(emoji) {
    const input = document.getElementById('chat-input-field');
    if (input) {
        const cursorPos = input.selectionStart;
        const textBefore = input.value.substring(0, cursorPos);
        const textAfter = input.value.substring(cursorPos);
        
        input.value = textBefore + emoji + textAfter;
        input.selectionStart = input.selectionEnd = cursorPos + emoji.length;
        input.focus();
    }
    
    closeModal('emoji-picker-modal');
}

function showFileUpload() {
    document.getElementById('file-upload-modal').style.display = 'flex';
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = files;
    
    const preview = document.getElementById('file-preview');
    preview.innerHTML = files.map(file => `
        <div class="file-preview-item">
            ${file.type.startsWith('image/') ? 
                `<img src="${URL.createObjectURL(file)}" alt="${file.name}">` : 
                `<i class="fas fa-file"></i>`
            }
            <div class="file-name">${file.name}</div>
        </div>
    `).join('');
}

async function sendFiles() {
    if (selectedFiles.length === 0) return;
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('file', file);
    });
    
    try {
        const response = await fetch('/api/chat/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        // Add file message to chat
        const fileMessage = {
            id: Date.now(),
            sender: 'user',
            senderName: currentUser.username || 'You',
            senderAvatar: '👤',
            message: `Sent ${selectedFiles.length} file(s)`,
            timestamp: new Date(),
            type: 'file',
            files: data.file,
            isAI: false,
            reactions: [],
            isRead: false
        };
        
        chatMessages.push(fileMessage);
        renderChatMessages();
        scrollToBottom();
        
        // Clear selected files
        selectedFiles = [];
        document.getElementById('file-preview').innerHTML = '';
        closeModal('file-upload-modal');
        
    } catch (error) {
        console.error('Failed to upload files:', error);
        showError('Failed to upload files');
    }
}

function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Voice recording not supported in this browser');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // Implement voice recording logic here
            showNotification('Voice recording started', 'info');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            showError('Failed to access microphone');
        });
}

function showGifPicker() {
    // Implement GIF picker logic here
    showNotification('GIF picker coming soon!', 'info');
}

async function addReaction(messageId, reaction) {
    try {
        await fetch('/api/chat/reaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ messageId, reaction })
        });
        
        // Update message reactions in UI
        const message = chatMessages.find(m => m.id === messageId);
        if (message) {
            const existingReaction = message.reactions.find(r => r.type === reaction);
            if (existingReaction) {
                existingReaction.count++;
            } else {
                message.reactions.push({ type: reaction, count: 1 });
            }
            renderChatMessages();
        }
    } catch (error) {
        console.error('Failed to add reaction:', error);
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Mood tracking functions
async function loadMoodHistory() {
    if (!currentUser) {
        showError('Please login to view mood history');
        return;
    }

    try {
        const [historyResponse, statsResponse, todayResponse] = await Promise.all([
            fetch('/api/mood/history'),
            fetch('/api/mood/stats'),
            fetch('/api/mood/today')
        ]);
        
        const historyData = await historyResponse.json();
        const statsData = await statsResponse.json();
        const todayData = await todayResponse.json();
        
        const container = document.querySelector('.mood-container');
        if (container) {
            container.innerHTML = `
                <div class="mood-dashboard">
                    <!-- Mood Overview Cards -->
                    <div class="mood-overview">
                        <div class="mood-card mood-quick-log">
                            <div class="card-header">
                                <h3>Quick Mood Log</h3>
                                <span class="card-subtitle">How are you feeling right now?</span>
                            </div>
                            <div class="mood-emoji-grid">
                                <div class="mood-emoji-btn" data-mood="very-happy" data-emoji="😄">
                                    <span class="emoji">😄</span>
                                    <span class="label">Very Happy</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="happy" data-emoji="😊">
                                    <span class="emoji">😊</span>
                                    <span class="label">Happy</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="excited" data-emoji="🤩">
                                    <span class="emoji">🤩</span>
                                    <span class="label">Excited</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="neutral" data-emoji="😐">
                                    <span class="emoji">😐</span>
                                    <span class="label">Neutral</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="tired" data-emoji="😴">
                                    <span class="emoji">😴</span>
                                    <span class="label">Tired</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="sad" data-emoji="😢">
                                    <span class="emoji">😢</span>
                                    <span class="label">Sad</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="anxious" data-emoji="😰">
                                    <span class="emoji">😰</span>
                                    <span class="label">Anxious</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="stressed" data-emoji="😤">
                                    <span class="emoji">😤</span>
                                    <span class="label">Stressed</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="angry" data-emoji="😠">
                                    <span class="emoji">😠</span>
                                    <span class="label">Angry</span>
                                </div>
                                <div class="mood-emoji-btn" data-mood="very-sad" data-emoji="😭">
                                    <span class="emoji">😭</span>
                                    <span class="label">Very Sad</span>
                                </div>
                            </div>
                            <button class="btn btn-primary btn-full" onclick="showDetailedMoodForm()">
                                <i class="fas fa-plus"></i> Detailed Log
                            </button>
                        </div>

                        <div class="mood-card mood-stats">
                            <div class="card-header">
                                <h3>Your Mood Stats</h3>
                                <span class="card-subtitle">Last 30 days</span>
                            </div>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-icon">📊</div>
                                    <div class="stat-content">
                                        <div class="stat-number">${statsData.stats?.length || 0}</div>
                                        <div class="stat-label">Entries</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">📈</div>
                                    <div class="stat-content">
                                        <div class="stat-number">${calculateAverageMood(statsData.stats)}</div>
                                        <div class="stat-label">Avg Mood</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">🔥</div>
                                    <div class="stat-content">
                                        <div class="stat-number">${calculateStreak(historyData.moods)}</div>
                                        <div class="stat-label">Day Streak</div>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">🎯</div>
                                    <div class="stat-content">
                                        <div class="stat-number">${getMostFrequentMood(statsData.stats)}</div>
                                        <div class="stat-label">Most Common</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mood-card mood-today">
                            <div class="card-header">
                                <h3>Today's Mood</h3>
                                <span class="card-subtitle">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div class="today-content">
                                ${todayData.todayMoods && todayData.todayMoods.length > 0 ? 
                                    todayData.todayMoods.map(mood => `
                                        <div class="today-mood">
                                            <div class="mood-display">
                                                <span class="mood-emoji-large">${getMoodEmoji(mood.mood)}</span>
                                                <div class="mood-info">
                                                    <div class="mood-text">${mood.mood.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                                                    <div class="mood-time">${new Date(mood.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                            <div class="mood-intensity-bar">
                                                <div class="intensity-fill" style="width: ${mood.intensity * 10}%"></div>
                                                <span class="intensity-text">${mood.intensity}/10</span>
                                            </div>
                                        </div>
                                    `).join('') : 
                                    '<div class="no-mood-today"><p>No mood logged today</p><button class="btn btn-outline" onclick="showDetailedMoodForm()">Log Your Mood</button></div>'
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Mood Charts and Analytics -->
                    <div class="mood-analytics">
                        <div class="mood-card mood-chart">
                            <div class="card-header">
                                <h3>Mood Trends</h3>
                                <div class="chart-controls">
                                    <button class="btn btn-sm btn-outline active" data-period="7">7 Days</button>
                                    <button class="btn btn-sm btn-outline" data-period="30">30 Days</button>
                                    <button class="btn btn-sm btn-outline" data-period="90">90 Days</button>
                                </div>
                            </div>
                            <div class="chart-container">
                                ${generateAdvancedMoodChart(historyData.moods, 7)}
                            </div>
                        </div>

                        <div class="mood-card mood-insights">
                            <div class="card-header">
                                <h3>Mood Insights</h3>
                                <span class="card-subtitle">AI-powered analysis</span>
                            </div>
                            <div class="insights-content">
                                ${generateMoodInsights(statsData.stats, historyData.moods)}
                            </div>
                        </div>
                    </div>

                    <!-- Mood History -->
                    <div class="mood-card mood-history">
                        <div class="card-header">
                            <h3>Mood History</h3>
                            <div class="history-controls">
                                <button class="btn btn-sm btn-outline" onclick="exportMoodData()">
                                    <i class="fas fa-download"></i> Export
                                </button>
                                <button class="btn btn-sm btn-outline" onclick="showMoodFilters()">
                                    <i class="fas fa-filter"></i> Filter
                                </button>
                            </div>
                        </div>
                        <div class="history-content">
                            ${generateMoodHistoryList(historyData.moods)}
                        </div>
                    </div>
                </div>
            `;
        }

        // Setup event listeners for mood emoji buttons
        setupMoodEmojiListeners();
        setupChartControls();

    } catch (error) {
        console.error('Failed to load mood data:', error);
        showError('Failed to load mood data');
    }
}

function setupMoodEmojiListeners() {
    const emojiButtons = document.querySelectorAll('.mood-emoji-btn');
    emojiButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const mood = btn.dataset.mood;
            const emoji = btn.dataset.emoji;
            
            // Show quick mood confirmation
            const confirmed = await showQuickMoodConfirmation(mood, emoji);
            if (confirmed) {
                await logQuickMood(mood);
            }
        });
    });
}

function setupChartControls() {
    const chartControls = document.querySelectorAll('.chart-controls .btn');
    chartControls.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            chartControls.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Update chart based on period
            const period = parseInt(btn.dataset.period);
            updateMoodChart(period);
        });
    });
}

async function showQuickMoodConfirmation(mood, emoji) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content quick-mood-modal">
                <div class="quick-mood-content">
                    <div class="quick-mood-emoji">${emoji}</div>
                    <h3>Log ${mood.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}?</h3>
                    <p>Are you sure you want to log this mood?</p>
                    <div class="quick-mood-actions">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove(); resolve(false);">Cancel</button>
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove(); resolve(true);">Yes, Log It</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    });
}

async function logQuickMood(mood) {
    try {
        const response = await fetch('/api/mood', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mood: mood,
                intensity: 5,
                timeOfDay: getCurrentTimeOfDay(),
                notes: 'Quick mood log'
            })
        });

        if (response.ok) {
            showSuccess('Mood logged successfully!');
            loadMoodHistory(); // Refresh the mood dashboard
        } else {
            const data = await response.json();
            showError(data.message || 'Failed to log mood');
        }
    } catch (error) {
        showError('Failed to log mood');
    }
}

function getCurrentTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function calculateAverageMood(stats) {
    if (!stats || stats.length === 0) return 'N/A';
    
    const moodScores = {
        'very-happy': 10, 'happy': 8, 'excited': 9, 'neutral': 5,
        'tired': 4, 'sad': 3, 'anxious': 2, 'stressed': 2,
        'angry': 1, 'very-sad': 0
    };
    
    let totalScore = 0;
    let totalCount = 0;
    
    stats.forEach(stat => {
        const score = moodScores[stat._id] || 5;
        totalScore += score * stat.count;
        totalCount += stat.count;
    });
    
    return totalCount > 0 ? (totalScore / totalCount).toFixed(1) : 'N/A';
}

function calculateStreak(moods) {
    if (!moods || moods.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        
        const hasMoodForDate = moods.some(mood => {
            const moodDate = new Date(mood.date);
            moodDate.setHours(0, 0, 0, 0);
            return moodDate.getTime() === checkDate.getTime();
        });
        
        if (hasMoodForDate) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

function getMostFrequentMood(stats) {
    if (!stats || stats.length === 0) return 'N/A';
    
    const mostFrequent = stats.reduce((prev, current) => 
        (prev.count > current.count) ? prev : current
    );
    
    return mostFrequent._id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function generateAdvancedMoodChart(moods, days = 7) {
    const recentMoods = moods.slice(-days);
    if (recentMoods.length === 0) return '<p class="no-data">No mood data to display</p>';
    
    const moodScores = {
        'very-happy': 10, 'happy': 8, 'excited': 9, 'neutral': 5,
        'tired': 4, 'sad': 3, 'anxious': 2, 'stressed': 2,
        'angry': 1, 'very-sad': 0
    };
    
    return `
        <div class="advanced-chart">
            <div class="chart-bars">
                ${recentMoods.map(mood => {
                    const score = moodScores[mood.mood] || 5;
                    const height = (score / 10) * 100;
                    return `
                        <div class="chart-bar">
                            <div class="bar-fill" style="height: ${height}%">
                                <span class="bar-emoji">${getMoodEmoji(mood.mood)}</span>
                            </div>
                            <div class="bar-label">${new Date(mood.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="chart-legend">
                <div class="legend-item">
                    <span class="legend-color high"></span>
                    <span>High (8-10)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color medium"></span>
                    <span>Medium (4-7)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color low"></span>
                    <span>Low (1-3)</span>
                </div>
            </div>
        </div>
    `;
}

function generateMoodInsights(stats, moods) {
    if (!stats || stats.length === 0) {
        return '<p class="no-data">Not enough data for insights yet. Keep logging your mood!</p>';
    }
    
    const insights = [];
    
    // Most common mood
    const mostCommon = stats.reduce((prev, current) => 
        (prev.count > current.count) ? prev : current
    );
    insights.push(`Your most common mood is <strong>${mostCommon._id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong> (${mostCommon.count} times)`);
    
    // Mood improvement trend
    if (moods.length >= 7) {
        const recentWeek = moods.slice(-7);
        const previousWeek = moods.slice(-14, -7);
        
        if (recentWeek.length >= 3 && previousWeek.length >= 3) {
            const recentAvg = recentWeek.reduce((sum, mood) => sum + (mood.intensity || 5), 0) / recentWeek.length;
            const previousAvg = previousWeek.reduce((sum, mood) => sum + (mood.intensity || 5), 0) / previousWeek.length;
            
            if (recentAvg > previousAvg) {
                insights.push('🎉 Your mood has been improving over the last week!');
            } else if (recentAvg < previousAvg) {
                insights.push('📉 Your mood has been declining. Consider talking to someone or trying some self-care activities.');
            }
        }
    }
    
    // Streak encouragement
    const streak = calculateStreak(moods);
    if (streak >= 7) {
        insights.push(`🔥 Amazing! You've logged your mood for ${streak} consecutive days. Keep up the great work!`);
    } else if (streak >= 3) {
        insights.push(`📝 Good job! You've logged your mood for ${streak} days in a row.`);
    }
    
    return `
        <div class="insights-list">
            ${insights.map(insight => `<div class="insight-item">${insight}</div>`).join('')}
        </div>
    `;
}

function generateMoodHistoryList(moods) {
    if (!moods || moods.length === 0) {
        return '<p class="no-data">No mood entries yet. Start tracking your mood!</p>';
    }
    
    return `
        <div class="mood-entries">
            ${moods.map(mood => `
                <div class="mood-entry" data-id="${mood._id}">
                    <div class="entry-emoji">${getMoodEmoji(mood.mood)}</div>
                    <div class="entry-details">
                        <div class="entry-mood">${mood.mood.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                        <div class="entry-meta">
                            <span class="entry-date">${new Date(mood.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</span>
                            ${mood.notes ? `<span class="entry-notes">"${mood.notes}"</span>` : ''}
                        </div>
                    </div>
                    <div class="entry-intensity">
                        <div class="intensity-dots">
                            ${Array.from({length: 10}, (_, i) => 
                                `<span class="dot ${i < mood.intensity ? 'filled' : ''}"></span>`
                            ).join('')}
                        </div>
                        <span class="intensity-text">${mood.intensity}/10</span>
                    </div>
                    <div class="entry-actions">
                        <button class="btn btn-sm btn-outline" onclick="editMoodEntry('${mood._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline btn-danger" onclick="deleteMoodEntry('${mood._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showDetailedMoodForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content detailed-mood-modal">
            <span class="close-modal">&times;</span>
            <div class="modal-header">
                <h2>Detailed Mood Log</h2>
                <p>Take a moment to reflect on your day</p>
            </div>
            <form id="detailed-mood-form">
                <div class="form-section">
                    <h3>How are you feeling?</h3>
                    <div class="form-group">
                        <label>Primary Mood</label>
                        <select name="mood" required>
                            <option value="">Select your mood...</option>
                            <option value="very-happy">Very Happy 😄</option>
                            <option value="happy">Happy 😊</option>
                            <option value="excited">Excited 🤩</option>
                            <option value="neutral">Neutral 😐</option>
                            <option value="tired">Tired 😴</option>
                            <option value="sad">Sad 😢</option>
                            <option value="anxious">Anxious 😰</option>
                            <option value="stressed">Stressed 😤</option>
                            <option value="angry">Angry 😠</option>
                            <option value="very-sad">Very Sad 😭</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Intensity Level (1-10)</label>
                        <div class="intensity-slider-container">
                            <input type="range" name="intensity" min="1" max="10" value="5" required>
                            <span class="intensity-value">5</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Time of Day</label>
                        <select name="timeOfDay" required>
                            <option value="">Select time...</option>
                            <option value="morning">Morning (5 AM - 12 PM)</option>
                            <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                            <option value="evening">Evening (5 PM - 9 PM)</option>
                            <option value="night">Night (9 PM - 5 AM)</option>
                        </select>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Daily Factors</h3>
                    <div class="form-group">
                        <label>Activities Today</label>
                        <div class="checkbox-grid">
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="study">
                                <span>Study</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="exercise">
                                <span>Exercise</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="social">
                                <span>Social</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="work">
                                <span>Work</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="rest">
                                <span>Rest</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="hobby">
                                <span>Hobby</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="family">
                                <span>Family</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="activities" value="eating">
                                <span>Eating</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Sleep Hours</label>
                            <input type="number" name="sleepHours" min="0" max="24" placeholder="Hours slept">
                        </div>
                        <div class="form-group">
                            <label>Stress Level (1-10)</label>
                            <input type="range" name="stressLevel" min="1" max="10" value="5">
                            <span class="range-value">5</span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Energy Level (1-10)</label>
                            <input type="range" name="energyLevel" min="1" max="10" value="5">
                            <span class="range-value">5</span>
                        </div>
                        <div class="form-group">
                            <label>Academic Pressure (1-10)</label>
                            <input type="range" name="academicPressure" min="1" max="10" value="5">
                            <span class="range-value">5</span>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>Additional Context</h3>
                    <div class="form-group">
                        <label>Social Interaction Level</label>
                        <select name="socialInteraction">
                            <option value="">Select level...</option>
                            <option value="none">None</option>
                            <option value="minimal">Minimal</option>
                            <option value="moderate">Moderate</option>
                            <option value="high">High</option>
                            <option value="excessive">Excessive</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Triggers (if any)</label>
                        <div class="checkbox-grid">
                            <label class="checkbox-item">
                                <input type="checkbox" name="triggers" value="academic">
                                <span>Academic</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="triggers" value="social">
                                <span>Social</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="triggers" value="family">
                                <span>Family</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="triggers" value="health">
                                <span>Health</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="triggers" value="financial">
                                <span>Financial</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="triggers" value="relationship">
                                <span>Relationship</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Coping Strategies Used</label>
                        <div class="checkbox-grid">
                            <label class="checkbox-item">
                                <input type="checkbox" name="copingStrategies" value="exercise">
                                <span>Exercise</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="copingStrategies" value="meditation">
                                <span>Meditation</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="copingStrategies" value="talking">
                                <span>Talking</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="copingStrategies" value="music">
                                <span>Music</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="copingStrategies" value="reading">
                                <span>Reading</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="copingStrategies" value="sleeping">
                                <span>Sleeping</span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>How effective were your coping strategies? (1-10)</label>
                        <input type="range" name="effectiveness" min="1" max="10" value="5">
                        <span class="range-value">5</span>
                    </div>
                    <div class="form-group">
                        <label>Notes (optional)</label>
                        <textarea name="notes" rows="3" placeholder="Any additional thoughts or feelings..."></textarea>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Log Mood</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Setup form interactions
    setupDetailedMoodForm(modal);
}

function setupDetailedMoodForm(modal) {
    // Intensity slider
    const intensitySlider = modal.querySelector('input[name="intensity"]');
    const intensityValue = modal.querySelector('.intensity-value');
    intensitySlider.addEventListener('input', (e) => {
        intensityValue.textContent = e.target.value;
    });
    
    // Range sliders
    const rangeSliders = modal.querySelectorAll('input[type="range"]');
    rangeSliders.forEach(slider => {
        const valueSpan = slider.nextElementSibling;
        if (valueSpan && valueSpan.classList.contains('range-value')) {
            slider.addEventListener('input', (e) => {
                valueSpan.textContent = e.target.value;
            });
        }
    });
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Form submission
    modal.querySelector('#detailed-mood-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Collect checkbox values
        const activities = Array.from(formData.getAll('activities'));
        const triggers = Array.from(formData.getAll('triggers'));
        const copingStrategies = Array.from(formData.getAll('copingStrategies'));
        
        try {
            const response = await fetch('/api/mood', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mood: formData.get('mood'),
                    intensity: parseInt(formData.get('intensity')),
                    timeOfDay: formData.get('timeOfDay'),
                    activities: activities,
                    sleepHours: formData.get('sleepHours') ? parseInt(formData.get('sleepHours')) : undefined,
                    stressLevel: parseInt(formData.get('stressLevel')),
                    energyLevel: parseInt(formData.get('energyLevel')),
                    socialInteraction: formData.get('socialInteraction'),
                    academicPressure: parseInt(formData.get('academicPressure')),
                    notes: formData.get('notes'),
                    triggers: triggers,
                    copingStrategies: copingStrategies,
                    effectiveness: parseInt(formData.get('effectiveness'))
                })
            });

            if (response.ok) {
                document.body.removeChild(modal);
                loadMoodHistory();
                showSuccess('Mood logged successfully!');
            } else {
                const data = await response.json();
                showError(data.message || 'Failed to log mood');
            }
        } catch (error) {
            showError('Failed to log mood');
        }
    });
}

function closeModal(modalId = null) {
    if (modalId) {
        document.getElementById(modalId).style.display = 'none';
    } else {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
}

async function editMoodEntry(moodId) {
    // Implementation for editing mood entries
    showError('Edit functionality coming soon!');
}

async function deleteMoodEntry(moodId) {
    if (!confirm('Are you sure you want to delete this mood entry?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/mood/${moodId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Mood entry deleted successfully');
            loadMoodHistory();
        } else {
            const data = await response.json();
            showError(data.message || 'Failed to delete mood entry');
        }
    } catch (error) {
        showError('Failed to delete mood entry');
    }
}

function exportMoodData() {
    // Implementation for exporting mood data
    showError('Export functionality coming soon!');
}

function showMoodFilters() {
    // Implementation for mood filters
    showError('Filter functionality coming soon!');
}

function updateMoodChart(period) {
    // Implementation for updating chart based on period
    console.log('Updating chart for period:', period);
}

function getMoodEmoji(mood) {
    const emojiMap = {
        'very-happy': '😄',
        'happy': '😊',
        'excited': '🤩',
        'neutral': '😐',
        'tired': '😴',
        'sad': '😢',
        'anxious': '😰',
        'stressed': '😤',
        'angry': '😠',
        'very-sad': '😭'
    };
    return emojiMap[mood] || '😐';
}

// Admin functions
async function loadAdminDashboard() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        
        const container = document.querySelector('#admin-overview');
        if (container) {
            container.innerHTML = `
                <div class="admin-header">
                    <h2>Platform Overview</h2>
                    <p>Welcome back, Admin! Here's what's happening on the platform.</p>
                </div>
                
                <div class="admin-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <h3>${stats.overview?.totalUsers || 0}</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎓</div>
                        <div class="stat-content">
                            <h3>${stats.overview?.totalStudents || 0}</h3>
                            <p>Students</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-content">
                            <h3>${stats.overview?.totalResources || 0}</h3>
                            <p>Resources</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📝</div>
                        <div class="stat-content">
                            <h3>${stats.overview?.totalJournalEntries || 0}</h3>
                            <p>Journal Entries</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🚩</div>
                        <div class="stat-content">
                            <h3>${stats.overview?.flaggedEntries || 0}</h3>
                            <p>Flagged Content</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💬</div>
                        <div class="stat-content">
                            <h3>${stats.overview?.activeChats || 0}</h3>
                            <p>Active Chats</p>
                        </div>
                    </div>
                </div>
                
                <div class="admin-recent-activity">
                    <h3>Recent Activity</h3>
                    <div class="activity-grid">
                        <div class="activity-section">
                            <h4>Recent Users</h4>
                            <div class="activity-list">
                                ${stats.recentActivity?.users?.map(user => `
                                    <div class="activity-item">
                                        <div class="activity-avatar">${user.firstName.charAt(0)}${user.lastName.charAt(0)}</div>
                                        <div class="activity-details">
                                            <span class="activity-name">${user.firstName} ${user.lastName}</span>
                                            <span class="role-badge ${user.role}">${user.role}</span>
                                        </div>
                                        <span class="activity-time">${new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                `).join('') || '<p class="no-activity">No recent users</p>'}
                            </div>
                        </div>
                        <div class="activity-section">
                            <h4>Recent Journal Entries</h4>
                            <div class="activity-list">
                                ${stats.recentActivity?.entries?.map(entry => `
                                    <div class="activity-item">
                                        <div class="activity-avatar">📝</div>
                                        <div class="activity-details">
                                            <span class="activity-name">${entry.author?.firstName || 'Anonymous'} ${entry.author?.lastName || ''}</span>
                                            <span class="mood-badge">${entry.mood}</span>
                                        </div>
                                        <span class="activity-time">${new Date(entry.createdAt).toLocaleDateString()}</span>
                                    </div>
                                `).join('') || '<p class="no-activity">No recent entries</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Set up admin tab navigation
        setupAdminTabs();
        
    } catch (error) {
        console.error('Admin dashboard error:', error);
        showError('Failed to load admin dashboard');
    }
}

function setupAdminTabs() {
    const tabButtons = document.querySelectorAll('.admin-nav-btn');
    const tabContents = document.querySelectorAll('.admin-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding tab content
            const targetTab = document.getElementById(`admin-${tabName}`);
            if (targetTab) {
                targetTab.classList.add('active');
                
                // Load content based on tab
                switch(tabName) {
                    case 'users':
                        loadUserManagement();
                        break;
                    case 'resources':
                        loadResourceManagement();
                        break;
                    case 'moderation':
                        loadFlaggedEntries();
                        break;
                }
            }
        });
    });
}

// Utility functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Additional functions for missing references
function logMood() {
    showMoodForm();
}

function showAdminTab(tabName) {
    // Hide all admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all admin nav buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`admin-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
}

// Admin management functions
async function loadUserManagement() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        const container = document.querySelector('#admin-users');
        if (container) {
            container.innerHTML = `
                <div class="admin-header">
                    <h2>User Management</h2>
                    <p>Manage all platform users, their roles, and account status</p>
                    <button class="btn btn-primary" id="add-user-btn">
                        <i class="fas fa-plus"></i> Add New User
                    </button>
                </div>
                
                <div class="admin-controls">
                    <div class="search-filters">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="user-search" placeholder="Search users by name or email..." class="form-control">
                        </div>
                        <select id="role-filter" class="form-control">
                            <option value="">All Roles</option>
                            <option value="student">Student</option>
                            <option value="counselor">Counselor</option>
                            <option value="admin">Admin</option>
                        </select>
                        <select id="status-filter" class="form-control">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div class="users-table-container">
                    <div class="table-header">
                        <span>Showing ${data.users.length} users</span>
                    </div>
                    <div class="users-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Contact</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.users.map(user => `
                                    <tr>
                                        <td>
                                            <div class="user-info">
                                                <div class="user-avatar">${user.firstName.charAt(0)}${user.lastName.charAt(0)}</div>
                                                <div class="user-details">
                                                    <span class="user-name">${user.firstName} ${user.lastName}</span>
                                                    <span class="user-id">${user.studentId || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="contact-info">
                                                <span class="email">${user.email}</span>
                                                <span class="username">@${user.username}</span>
                                            </div>
                                        </td>
                                        <td><span class="role-badge ${user.role}">${user.role}</span></td>
                                        <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                                        <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="btn btn-sm btn-primary" onclick="editUser('${user._id}')" title="Edit User">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-warning" onclick="toggleUserStatus('${user._id}', ${!user.isActive})" title="${user.isActive ? 'Deactivate' : 'Activate'} User">
                                                    <i class="fas fa-${user.isActive ? 'pause' : 'play'}"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')" title="Delete User">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Add event listeners
            document.getElementById('add-user-btn')?.addEventListener('click', showAddUserForm);
            document.getElementById('user-search')?.addEventListener('input', filterUsers);
            document.getElementById('role-filter')?.addEventListener('change', filterUsers);
        }
    } catch (error) {
        showError('Failed to load users');
    }
}

async function loadResourceManagement() {
    try {
        const response = await fetch('/api/admin/resources/manage');
        const data = await response.json();
        
        const container = document.querySelector('#admin-resources');
        if (container) {
            container.innerHTML = `
                <div class="admin-header">
                    <h2>Resource Management</h2>
                    <p>Manage mental health resources, articles, and guides</p>
                    <button class="btn btn-primary" id="add-resource-btn">
                        <i class="fas fa-plus"></i> Add New Resource
                    </button>
                </div>
                
                <div class="admin-controls">
                    <div class="search-filters">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="resource-search" placeholder="Search resources..." class="form-control">
                        </div>
                        <select id="category-filter" class="form-control">
                            <option value="">All Categories</option>
                            <option value="stress-management">Stress Management</option>
                            <option value="anxiety">Anxiety</option>
                            <option value="depression">Depression</option>
                            <option value="motivation">Motivation</option>
                            <option value="mindfulness">Mindfulness</option>
                            <option value="self-care">Self Care</option>
                        </select>
                        <select id="status-filter" class="form-control">
                            <option value="">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>
                </div>
                
                <div class="resources-table-container">
                    <div class="table-header">
                        <span>Showing ${data.resources.length} resources</span>
                    </div>
                    <div class="resources-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>Category</th>
                                    <th>Author</th>
                                    <th>Status</th>
                                    <th>Views</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.resources.map(resource => `
                                    <tr>
                                        <td>
                                            <div class="resource-info">
                                                <div class="resource-title">${resource.title}</div>
                                                <div class="resource-desc">${resource.description?.substring(0, 60)}${resource.description?.length > 60 ? '...' : ''}</div>
                                            </div>
                                        </td>
                                        <td><span class="category-badge">${resource.category}</span></td>
                                        <td>${resource.author?.firstName || 'Unknown'} ${resource.author?.lastName || ''}</td>
                                        <td>
                                            <span class="status-badge ${resource.isPublished ? 'published' : 'draft'}">${resource.isPublished ? 'Published' : 'Draft'}</span>
                                        </td>
                                        <td>${resource.views || 0}</td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="btn btn-sm btn-primary" onclick="editResource('${resource._id}')" title="Edit Resource">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm ${resource.isPublished ? 'btn-warning' : 'btn-success'}" onclick="togglePublish('${resource._id}', ${!resource.isPublished})" title="${resource.isPublished ? 'Unpublish' : 'Publish'}">
                                                    <i class="fas fa-${resource.isPublished ? 'eye-slash' : 'eye'}"></i>
                                                </button>
                                                <button class="btn btn-sm btn-info" onclick="viewResource('${resource._id}')" title="View Resource">
                                                    <i class="fas fa-external-link-alt"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="deleteResource('${resource._id}')" title="Delete Resource">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Add event listeners
            document.getElementById('add-resource-btn')?.addEventListener('click', showAddResourceForm);
            document.getElementById('status-filter')?.addEventListener('change', filterResources);
        }
    } catch (error) {
        showError('Failed to load resources');
    }
}

async function loadFlaggedEntries() {
    try {
        const response = await fetch('/api/admin/flagged-entries');
        const data = await response.json();
        
        const container = document.querySelector('#admin-moderation');
        if (container) {
            container.innerHTML = `
                <div class="admin-header">
                    <h2>Content Moderation</h2>
                    <p>Review and moderate flagged journal entries and user content</p>
                </div>
                
                <div class="moderation-stats">
                    <div class="stat-item">
                        <span class="stat-number">${data.entries.length}</span>
                        <span class="stat-label">Flagged Entries</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${data.entries.filter(e => e.isModerated).length}</span>
                        <span class="stat-label">Reviewed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${data.entries.filter(e => !e.isModerated).length}</span>
                        <span class="stat-label">Pending Review</span>
                    </div>
                </div>
                
                <div class="flagged-entries">
                    ${data.entries.length > 0 ? data.entries.map(entry => `
                        <div class="flagged-entry ${entry.isModerated ? 'moderated' : ''}">
                            <div class="entry-header">
                                <div class="entry-author">
                                    <div class="author-avatar">${entry.author?.firstName?.charAt(0) || 'A'}${entry.author?.lastName?.charAt(0) || ''}</div>
                                    <div class="author-info">
                                        <span class="author-name">${entry.author?.firstName || 'Anonymous'} ${entry.author?.lastName || ''}</span>
                                        <span class="entry-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div class="entry-meta">
                                    <span class="mood-badge">${entry.mood}</span>
                                    <span class="flag-reason">${entry.flagReason || 'Inappropriate content'}</span>
                                </div>
                            </div>
                            <div class="entry-content">
                                <p>${entry.content}</p>
                            </div>
                            <div class="entry-actions">
                                <button class="btn btn-sm btn-success" onclick="moderateEntry('${entry._id}', 'approved')" title="Approve Entry">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-warning" onclick="moderateEntry('${entry._id}', 'warned')" title="Warn User">
                                    <i class="fas fa-exclamation-triangle"></i> Warn
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="moderateEntry('${entry._id}', 'deleted')" title="Delete Entry">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                            ${entry.isModerated ? `
                                <div class="moderation-status">
                                    <span class="status-badge ${entry.moderationAction}">${entry.moderationAction}</span>
                                    <span class="moderated-by">by ${entry.moderatedBy?.firstName || 'Admin'}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : `
                        <div class="no-flagged-content">
                            <i class="fas fa-check-circle"></i>
                            <h3>No Flagged Content</h3>
                            <p>All content is currently clean and doesn't require moderation.</p>
                        </div>
                    `}
                </div>
            `;
        }
    } catch (error) {
        showError('Failed to load flagged entries');
    }
}

// User management functions
function showAddUserForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close close-modal">&times;</span>
            <h2>Add New User</h2>
            <form id="add-user-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" name="firstName" required>
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" name="lastName" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select name="role" required>
                        <option value="student">Student</option>
                        <option value="counselor">Counselor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Student ID</label>
                    <input type="text" name="studentId">
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" name="department">
                </div>
                <div class="form-group">
                    <label>Year</label>
                    <select name="year">
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5">5th Year</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Add User</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    username: formData.get('username'),
                    password: formData.get('password'),
                    role: formData.get('role'),
                    studentId: formData.get('studentId'),
                    department: formData.get('department'),
                    year: formData.get('year')
                })
            });
            
            if (response.ok) {
                document.body.removeChild(modal);
                loadUserManagement();
                showSuccess('User added successfully!');
            } else {
                const data = await response.json();
                showError(data.message || 'Failed to add user');
            }
        } catch (error) {
            showError('Failed to add user');
        }
    });
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadUserManagement();
            showSuccess('User deleted successfully!');
        } else {
            showError('Failed to delete user');
        }
    } catch (error) {
        showError('Failed to delete user');
    }
}

async function togglePublish(resourceId, isPublished) {
    try {
        const response = await fetch(`/api/admin/resources/${resourceId}/publish`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPublished })
        });
        
        if (response.ok) {
            loadResourceManagement();
            showSuccess(`Resource ${isPublished ? 'published' : 'unpublished'} successfully!`);
        } else {
            showError('Failed to update resource status');
        }
    } catch (error) {
        showError('Failed to update resource status');
    }
}

async function moderateEntry(entryId, action) {
    try {
        const response = await fetch(`/api/admin/moderate-entry/${entryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });
        
        if (response.ok) {
            loadFlaggedEntries();
            showSuccess(`Entry ${action} successfully!`);
        } else {
            showError('Failed to moderate entry');
        }
    } catch (error) {
        showError('Failed to moderate entry');
    }
}

// Filter functions
function filterUsers() {
    // Implementation for filtering users
    console.log('Filtering users...');
}

function filterResources() {
    // Implementation for filtering resources
    console.log('Filtering resources...');
}

// Enhanced admin functions
async function toggleUserStatus(userId, isActive) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive })
        });
        
        if (response.ok) {
            loadUserManagement();
            showSuccess(`User ${isActive ? 'activated' : 'deactivated'} successfully!`);
        } else {
            showError('Failed to update user status');
        }
    } catch (error) {
        showError('Failed to update user status');
    }
}

async function editUser(userId) {
    // Implementation for editing user
    showError('Edit user functionality coming soon!');
}

async function editResource(resourceId) {
    // Implementation for editing resource
    showError('Edit resource functionality coming soon!');
}

async function deleteResource(resourceId) {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/admin/resources/${resourceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadResourceManagement();
            showSuccess('Resource deleted successfully!');
        } else {
            showError('Failed to delete resource');
        }
    } catch (error) {
        showError('Failed to delete resource');
    }
}

async function viewResource(resourceId) {
    try {
        const response = await fetch(`/api/resources/${resourceId}`);
        const resource = await response.json();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content resource-view-modal">
                <span class="close close-modal">&times;</span>
                <div class="resource-view">
                    <h2>${resource.title}</h2>
                    <div class="resource-meta">
                        <span class="category-badge">${resource.category}</span>
                        <span class="author">by ${resource.author?.firstName || 'Unknown'} ${resource.author?.lastName || ''}</span>
                        <span class="views">${resource.views || 0} views</span>
                    </div>
                    <div class="resource-content">
                        ${resource.content}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
    } catch (error) {
        showError('Failed to load resource');
    }
}

// Notification functions - show error and success messages
function showError(message) {
    // Remove any existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #e74c3c; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10001; max-width: 400px; animation: slideIn 0.3s ease;';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-circle"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.closest('.notification').remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function showSuccess(message) {
    // Remove any existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #27ae60; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10001; max-width: 400px; animation: slideIn 0.3s ease;';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.closest('.notification').remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Add CSS animations for notifications
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
} 