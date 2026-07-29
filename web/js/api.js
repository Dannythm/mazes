// REST API Client for Go Backend Server
export class APIClient {
  static baseUrl = '/api';

  static async getProfiles() {
    try {
      const res = await fetch(`${this.baseUrl}/profiles`);
      if (!res.ok) throw new Error('Failed to fetch profiles');
      return await res.json();
    } catch (e) {
      console.warn('API fetch profiles fallback to local state:', e);
      return [];
    }
  }

  static async createProfile(name, avatar, theme) {
    try {
      const res = await fetch(`${this.baseUrl}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, theme })
      });
      if (!res.ok) throw new Error('Failed to create profile');
      return await res.json();
    } catch (e) {
      console.warn('API create profile error:', e);
      return null;
    }
  }

  static async updateProfile(id, name, avatar, theme) {
    try {
      const res = await fetch(`${this.baseUrl}/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, theme })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return await res.json();
    } catch (e) {
      console.warn('API update profile error:', e);
      return null;
    }
  }

  static async recordSolve(payload) {
    try {
      const res = await fetch(`${this.baseUrl}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to record solve');
      return await res.json();
    } catch (e) {
      console.warn('API record solve error:', e);
      return null;
    }
  }
}
