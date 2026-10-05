// =============================================================================
// AuthPage — Page Object de login/registro y del estado de autenticación
// (Header). No necesita backend para la UI, pero los flujos reales sí lo
// hacen; por eso los specs combinan esta clase con `mockBackend`.
// =============================================================================

import type { Page } from '@playwright/test';

export interface Credentials {
  name: string;
  email: string;
  password: string;
}

export class AuthPage {
  constructor(private readonly page: Page) {}

  // ---- Login (/login) -----------------------------------------------------
  async gotoLogin(): Promise<void> {
    await this.page.goto('/login');
    await this.page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor();
  }

  async login(creds: Pick<Credentials, 'email' | 'password'>): Promise<void> {
    await this.page.getByLabel('Email').fill(creds.email);
    await this.page.getByLabel('Contraseña').fill(creds.password);
    await this.page.getByRole('button', { name: 'Entrar' }).click();
    // El botón entra en carga (`disabled`) mientras se resuelve la petición.
    // Esperamos reactivamente a que deje de estar deshabilitado: tanto si la
    // redirección desmonta el form (éxito) como si el botón vuelve a 'Entrar'
    // (fallo 422). Evita depender de `networkidle`, que puede resolver antes
    // de que React re-renderize el estado autenticado.
    await this.page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return !btn || !btn.disabled;
    });
  }

  // ---- Register (/register) ----------------------------------------------
  async gotoRegister(): Promise<void> {
    await this.page.goto('/register');
    await this.page.getByRole('heading', { name: 'Registro' }).waitFor();
  }

  async register(creds: Credentials): Promise<void> {
    await this.page.getByLabel('Nombre').fill(creds.name);
    await this.page.getByLabel('Email').fill(creds.email);
    await this.page.getByLabel('Contraseña').fill(creds.password);
    await this.page.getByRole('button', { name: 'Crear cuenta' }).click();
    // Igual que login: esperamos a que el botón deje de estar en carga
    // (`disabled`), tanto si la redirección desmonta el form (éxito) como si
    // el botón vuelve a 'Crear cuenta' (fallo). Sin `networkidle`.
    await this.page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return !btn || !btn.disabled;
    });
  }

  /** Link "Registrate" que lleva al registro. */
  async goToRegister(): Promise<void> {
    await this.page.getByRole('link', { name: 'Registrate' }).click();
    await this.page.getByRole('heading', { name: 'Registro' }).waitFor();
  }

  // ---- Header / estado de sesión -----------------------------------------
  async isLoggedIn(): Promise<boolean> {
    // El re-render asíncrono de React puede llegar después de `networkidle`
    // (sobre todo en modo headed, más lento). En vez de leer el DOM una sola
    // vez, esperamos a que el botón Salir aparezca: si todavía no está, la
    // lectura devolvería false aunque la sesión ya se esté activando.
    const salir = this.page.getByRole('button', { name: 'Salir' }).first();
    try {
      await salir.waitFor({ state: 'visible', timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  async loggedOut(): Promise<boolean> {
    // Lo mismo que isLoggedIn: esperar el re-render en vez de leer el DOM una
    // sola vez, para no depender del timing de `networkidle`.
    const entrar = this.page.getByRole('link', { name: 'Entrar' }).first();
    try {
      await entrar.waitFor({ state: 'visible', timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Muestra el nombre de usuario en el Header cuando hay sesión. */
  async currentUserName(): Promise<string | null> {
    const btn = this.page.getByRole('button', { name: 'Salir' });
    const scope = btn.locator('..');
    const name = await scope.locator('span').first().textContent();
    return name?.trim() ?? null;
  }

  async logout(): Promise<void> {
    await this.page.getByRole('button', { name: 'Salir' }).click();
    // Esperar a que el Header refleje el logout en la UI, no solo en la red:
    // el `set()` de zustand que re-renderiza puede llegar después de
    // `networkidle`. Si el botón "Salir" sigue en el DOM, "Entrar" todavía no
    // existe y `isVisible()` devolvería false al instante (0 elementos).
    await this.page
      .getByRole('button', { name: 'Salir' })
      .waitFor({ state: 'hidden' });
  }

  /** Error global del form (role=alert). */
  async globalError(): Promise<string | null> {
    const el = this.page.getByRole('alert').first();
    if (await el.count() === 0) return null;
    return el.textContent();
  }
}
