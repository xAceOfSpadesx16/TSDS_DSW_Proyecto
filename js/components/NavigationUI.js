/**
 * NavigationUI — Page-based navigation with active link highlighting.
 * Marks the current page's nav link as active and provides keyboard navigation.
 */
export class NavigationUI {
  constructor() {
    this.navLinks = document.querySelectorAll('.nav-link');

    this._highlightActive();
    this._bindKeyboardNav();
  }

  _highlightActive() {
    const currentPath = window.location.pathname;
    this.navLinks.forEach((link) => {
      const linkPath = new URL(link.href, window.location.origin).pathname;
      const isActive = currentPath === linkPath || (currentPath.endsWith('/') && linkPath.endsWith('index.html'));
      
      const activeClasses = ['text-light-inverse', 'bg-primary', 'hover:text-light-inverse', 'hover:bg-primary-dark'];
      const inactiveClasses = ['text-light-muted', 'hover:text-light-text', 'hover:bg-dark-surface', 'hover:no-underline'];
      
      if (isActive) {
        link.classList.remove(...inactiveClasses);
        link.classList.add(...activeClasses);
      } else {
        link.classList.remove(...activeClasses);
        link.classList.add(...inactiveClasses);
      }
    });
  }

  _bindKeyboardNav() {
    const nav = document.querySelector('.app-nav');
    if (!nav) return;

    nav.addEventListener('keydown', (e) => {
      const focused = document.activeElement;
      if (!focused || !focused.classList.contains('nav-link')) return;

      const linkList = [...this.navLinks];
      const idx = linkList.indexOf(focused);

      let next = null;
      if (e.key === 'ArrowRight') {
        next = linkList[(idx + 1) % linkList.length];
      } else if (e.key === 'ArrowLeft') {
        next = linkList[(idx - 1 + linkList.length) % linkList.length];
      }

      if (next) {
        e.preventDefault();
        next.focus();
      }
    });
  }
}
