// =============================================================================
// LandingPage (/)
//
// Equivalente al antiguo `index.html`: hero + grilla de cards con los 4
// módulos. No usa el aside de historial (mantiene la decisión original).
// =============================================================================

import { Link } from 'react-router-dom';

interface ModuleCard {
  to: string;
  icon: string;
  title: string;
  description: string;
}

const MODULES: ModuleCard[] = [
  {
    to: '/teams',
    icon: '♘',
    title: 'Generador de Equipos',
    description:
      'Ingresa participantes y divide automáticamente en equipos equilibrados. Configura cantidad de grupos o tamaño deseado.',
  },
  {
    to: '/weighted',
    icon: '♙',
    title: 'Sorteo con Pesos',
    description:
      'Realiza sorteos donde cada participante tiene una probabilidad proporcional a su peso asignado.',
  },
  {
    to: '/roulette',
    icon: '⚙',
    title: 'Ruleta de Decisiones',
    description:
      'Agrega opciones personalizadas y gira la ruleta para tomar decisiones al azar de forma visual.',
  },
  {
    to: '/dice',
    icon: '⚄',
    title: 'Dados y Números',
    description:
      'Tiradas de dados RPG con modificador y generador de números aleatorios con opciones de rango y unicidad.',
  },
];

export function LandingPage() {
  return (
    <main className="p-6 w-full mx-auto" role="main">
      <section className="flex flex-col items-center justify-center text-center py-12 px-4 min-h-[40vh] animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-primary-light to-secondary bg-clip-text text-transparent mb-4 leading-tight">
          Thrive Randomizer
        </h1>
        <p className="text-lg text-light-muted max-w-2xl leading-relaxed">
          Suite de herramientas de aleatorización para equipos, sorteos
          ponderados, ruletas interactivas y tiradas de dados. Selecciona un
          módulo para comenzar.
        </p>
      </section>

      <section
        className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 max-w-[1200px] mx-auto p-6 sm:grid-cols-1 md:grid-cols-2 animate-fade-in"
        aria-label="Módulos disponibles"
      >
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="flex flex-col bg-dark-surface border border-dark-border rounded-2xl p-8 text-light-text transition-all duration-250 hover:border-primary hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light hover:no-underline hover:text-light-text"
          >
            <i className="text-4xl mb-4 not-italic" aria-hidden="true">
              {m.icon}
            </i>
            <h2 className="text-xl font-bold mb-2">{m.title}</h2>
            <p className="text-sm text-light-muted leading-relaxed">{m.description}</p>
            <i className="mt-auto pt-4 text-sm font-semibold text-primary-light not-italic" aria-hidden="true">
              Abrir →
            </i>
          </Link>
        ))}
      </section>
    </main>
  );
}