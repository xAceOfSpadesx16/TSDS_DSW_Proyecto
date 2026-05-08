/**
 * Thrive Randomizer — Application entry point.
 * Detects which page is loaded and only initializes the relevant components.
 */
import { NavigationUI } from './components/NavigationUI.js';

const PAGE_MAP = {
  'teams.html': async () => {
    const { TeamSplitterUI } = await import('./components/TeamSplitterUI.js');
    return new TeamSplitterUI();
  },
  'weighted.html': async () => {
    const { WeightedDrawUI } = await import('./components/WeightedDrawUI.js');
    return new WeightedDrawUI();
  },
  'roulette.html': async () => {
    const { RouletteUI } = await import('./components/RouletteUI.js');
    return new RouletteUI();
  },
  'dice.html': async () => {
    const { DiceRollerUI } = await import('./components/DiceRollerUI.js');
    return new DiceRollerUI();
  }
};

function getCurrentPage() {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  return filename;
}

document.addEventListener('DOMContentLoaded', async () => {
  const navigation = new NavigationUI();

  const currentPage = getCurrentPage();
  const initModule = PAGE_MAP[currentPage];

  if (initModule) {
    await initModule();

    const { HistoryUI } = await import('./components/HistoryUI.js');
    new HistoryUI();
  }
});
