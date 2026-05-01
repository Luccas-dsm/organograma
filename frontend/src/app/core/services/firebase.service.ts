import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp;
  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.app = getApps().length
      ? getApps()[0]
      : initializeApp(environment.firebase);

    const auth = getAuth(this.app);
    onAuthStateChanged(auth, (user) => this.currentUser.set(user));
  }

  async signIn(email: string, password: string): Promise<User> {
    const auth = getAuth(this.app);
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  async signOut(): Promise<void> {
    const auth = getAuth(this.app);
    await signOut(auth);
  }

  async getIdToken(): Promise<string | null> {
    const auth = getAuth(this.app);
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }
}
