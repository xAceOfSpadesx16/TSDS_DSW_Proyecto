// =============================================================================
// LandingPage (/)
//
// Equivalente al antiguo `index.html`: hero + grilla de cards con los 5
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
    title: 'Dados RPG',
    description:
      'Tiradas de dados RPG con caras de d4 a d20 y modificador opcional.',
  },
  {
    to: '/numbers',
    icon: '⁂',
    title: 'Números Aleatorios',
    description:
      'Genera una cantidad de números dentro de un rango, con o sin repetición. Ideal para sorteos de Lists, ordenamientos o sorteos numéricos.',
  },
];

export function LandingPage() {
  return (
    <main className="workspace">
      <section className="flex flex-col items-center justify-center px-4 py-10 text-center animate-fade-in sm:py-12">
        <h1
          tabIndex={-1}
          className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-primary-light to-secondary bg-clip-text text-transparent mb-4 leading-tight"
        >
          Thrive Randomizer
        </h1>
        <p className="text-lg text-light-muted max-w-2xl leading-relaxed">
          Suite de herramientas de aleatorización para equipos, sorteos
          ponderados, ruletas interactivas y tiradas de dados. Selecciona un
          módulo para comenzar.
        </p>
        <a
          href="#modulos"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
        >
          Empezar a sortear
        </a>
      </section>

      <section
        id="modulos"
        className="grid w-full scroll-mt-24 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in"
        aria-labelledby="modulos-heading"
      >
        <h2 id="modulos-heading" className="sr-only">
          Módulos disponibles
        </h2>
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="flex flex-col bg-dark-surface border border-dark-border rounded-2xl p-8 text-light-text transition-all duration-250 hover:border-primary hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light hover:no-underline hover:text-light-text sm:last:col-span-2 lg:last:col-span-1"
          >
            <i className="text-4xl mb-4 not-italic" aria-hidden="true">
              {m.icon}
            </i>
            <h3 className="text-xl font-bold mb-2">{m.title}</h3>
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