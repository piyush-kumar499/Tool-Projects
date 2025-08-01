import {
    auth,
    db,
    googleProvider,
    facebookProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    updateProfile,
    setDoc,
    doc,
    getDoc,
    serverTimestamp
} from './firebase-config.js';

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const registerContainer = document.getElementById('registerContainer');
const forgotPasswordContainer = document.getElementById('forgotPasswordContainer');
const mainContent = document.getElementById('mainContent');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');

const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginBtn = document.getElementById('backToLoginBtn');

const googleLoginBtn = document.getElementById('googleLoginBtn');
const facebookLoginBtn = document.getElementById('facebookLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Utility Functions
function showMessage(message, containerId, type = 'info') {
    const messageDiv = document.getElementById(containerId);
    messageDiv.className = `message-div ${type}`;
    messageDiv.innerHTML = message;
    messageDiv.style.display = 'block';
    
    // Auto-hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function showLoading(button, show = true) {
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.loading-spinner');
    
    if (show) {
        buttonText.style.display = 'none';
        spinner.style.display = 'block';
        button.disabled = true;
    } else {
        buttonText.style.display = 'inline';
        spinner.style.display = 'none';
        button.disabled = false;
    }
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function checkPasswordStrength(password) {
    const strengthIndicator = document.getElementById('passwordStrength');
    let strength = 0;
    let feedback = '';

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch (strength) {
        case 0:
        case 1:
            feedback = 'Weak password';
            strengthIndicator.className = 'password-strength weak';
            break;
        case 2:
        case 3:
            feedback = 'Medium password';
            strengthIndicator.className = 'password-strength medium';
            break;
        case 4:
            feedback = 'Strong password';
            strengthIndicator.className = 'password-strength strong';
            break;
    }

    strengthIndicator.textContent = password.length > 0 ? feedback : '';
}

function showContainer(containerToShow) {
    // Hide all containers
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'none';
    forgotPasswordContainer.style.display = 'none';
    mainContent.style.display = 'none';
    
    // Show the specified container
    containerToShow.style.display = 'block';
}

// Authentication Functions
async function registerUser(email, password, firstName, lastName) {
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user profile
        await updateProfile(user, {
            displayName: `${firstName} ${lastName}`
        });

        // Save user data to Firestore
        const userData = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            displayName: `${firstName} ${lastName}`,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        };

        await setDoc(doc(db, "users", user.uid), userData);
        
        showMessage('Account created successfully! Welcome!', 'registerMessage', 'success');
        
        // Auto-login after registration
        setTimeout(() => {
            showMainContent(user);
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
        }
        
        showMessage(errorMessage, 'registerMessage', 'error');
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update last login time
        await setDoc(doc(db, "users", user.uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });

        showMessage('Login successful! Redirecting...', 'loginMessage', 'success');
        
        setTimeout(() => {
            showMainContent(user);
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please check your credentials.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
        }
        
        showMessage(errorMessage, 'loginMessage', 'error');
    }
}

async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent! Check your inbox.', 'forgotPasswordMessage', 'success');
        
        setTimeout(() => {
            showContainer(loginContainer);
        }, 2000);

    } catch (error) {
        console.error('Password reset error:', error);
        
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
        }
        
        showMessage(errorMessage, 'forgotPasswordMessage', 'error');
    }
}

async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Save/update user data in Firestore
        const userData = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider: 'google',
            lastLogin: serverTimestamp()
        };

        await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        
        showMessage('Google login successful!', 'loginMessage', 'success');
        showMainContent(user);

    } catch (error) {
        console.error('Google login error:', error);
        showMessage('Google login failed. Please try again.', 'loginMessage', 'error');
    }
}

async function signInWithFacebook() {
    try {
        const result = await signInWithPopup(auth, facebookProvider);
        const user = result.user;

        // Save/update user data in Firestore
        const userData = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider: 'facebook',
            lastLogin: serverTimestamp()
        };

        await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        
        showMessage('Facebook login successful!', 'loginMessage', 'success');
        showMainContent(user);

    } catch (error) {
        console.error('Facebook login error:', error);
        showMessage('Facebook login failed. Please try again.', 'loginMessage', 'error');
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        showMessage('Logged out successfully!', 'loginMessage', 'success');
        showContainer(loginContainer);
        
        // Clear form data
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Logout failed. Please try again.', 'loginMessage', 'error');
    }
}

async function showMainContent(user) {
    try {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Update UI with user information
        document.getElementById('userDisplayName').textContent = 
            userData.displayName || user.displayName || user.email;
        document.getElementById('profileName').textContent = 
            userData.displayName || user.displayName || 'Not provided';
        document.getElementById('profileEmail').textContent = user.email;
        
        // Format creation date
        const createdDate = userData.createdAt 
            ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString()
            : 'Not available';
        document.getElementById('accountCreated').textContent = createdDate;
        
        showContainer(mainContent);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showContainer(mainContent);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Navigation between forms
    showRegisterBtn.addEventListener('click', () => {
        showContainer(registerContainer);
    });

    showLoginBtn.addEventListener('click', () => {
        showContainer(loginContainer);
    });

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showContainer(forgotPasswordContainer);
    });

    backToLoginBtn.addEventListener('click', () => {
        showContainer(loginContainer);
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // Validation
        if (!validateEmail(email)) {
            showMessage('Please enter a valid email address.', 'loginMessage', 'error');
            return;
        }
        
        if (!validatePassword(password)) {
            showMessage('Password must be at least 6 characters long.', 'loginMessage', 'error');
            return;
        }
        
        showLoading(submitButton, true);
        await loginUser(email, password);
        showLoading(submitButton, false);
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // Validation
        if (!firstName || !lastName) {
            showMessage('Please enter your first and last name.', 'registerMessage', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            showMessage('Please enter a valid email address.', 'registerMessage', 'error');
            return;
        }
        
        if (!validatePassword(password)) {
            showMessage('Password must be at least 6 characters long.', 'registerMessage', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match.', 'registerMessage', 'error');
            return;
        }
        
        showLoading(submitButton, true);
        await registerUser(email, password, firstName, lastName);
        showLoading(submitButton, false);
    });

    // Forgot password form submission
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('forgotEmail').value.trim();
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        if (!validateEmail(email)) {
            showMessage('Please enter a valid email address.', 'forgotPasswordMessage', 'error');
            return;
        }
        
        showLoading(submitButton, true);
        await resetPassword(email);
        showLoading(submitButton, false);
    });

    // Social login buttons
    googleLoginBtn.addEventListener('click', signInWithGoogle);
    facebookLoginBtn.addEventListener('click', signInWithFacebook);
    
    // Logout button
    logoutBtn.addEventListener('click', logoutUser);

    // Password strength checker
    document.getElementById('registerPassword').addEventListener('input', (e) => {
        checkPasswordStrength(e.target.value);
    });

    // Real-time password confirmation
    document.getElementById('confirmPassword').addEventListener('input', (e) => {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = e.target.value;
        
        if (confirmPassword && password !== confirmPassword) {
            e.target.style.borderColor = '#e74c3c';
        } else {
            e.target.style.borderColor = '#e1e5e9';
        }
    });
});

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.email);
        showMainContent(user);
    } else {
        // User is signed out
        console.log('User is signed out');
        showContainer(loginContainer);
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    if (auth.currentUser) {
        showMainContent(auth.currentUser);
    } else {
        showContainer(loginContainer);
    }
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}
