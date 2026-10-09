export const authService = {
  login(email, password) {
    return new Promise((resolve, reject) => {
      // Mock network delay
      setTimeout(() => {
        if (password === 'password123') {
          const user = { id: 1, name: email.split('@')[0], email };
          localStorage.setItem('fitbuddy_token', 'mock-jwt-token-12345');
          localStorage.setItem('fitbuddy_user', JSON.stringify(user));
          resolve({ data: { user, token: 'mock-jwt-token-12345' } });
        } else {
          reject({ response: { data: { message: 'Invalid credentials. Try password123' } } });
        }
      }, 500);
    });
  },

  signup(userData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = { id: Math.floor(Math.random() * 1000), name: userData.name, email: userData.email };
        resolve({ data: { user, message: 'Signup successful' } });
      }, 500);
    });
  },

  logout() {
    localStorage.removeItem('fitbuddy_token');
    localStorage.removeItem('fitbuddy_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('fitbuddy_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('fitbuddy_token');
  }
};

