// =============================================================================
// LandingPage (/)
//
// Equivalente al antiguo `index.html`: hero + grilla de cards con los 5
// módulos. No usa el aside de historial (mantiene la decisión original).
// =============================================================================

import { Link } from 'react-router-dom';

import { ModuleIcon, type ModuleIconName } from '../components/ModuleIcon';

interface ModuleCard {
  to: string;
  icon: ModuleIconName;
  title: string;
  description: string;
}

const MODULES: ModuleCard[] = [
  {
    to: '/teams',
    icon: 'teams',
    title: 'Generador de Equipos',
    description:
      'Ingresá participantes y dividí automáticamente en equipos equilibrados. Configurá cantidad de grupos o tamaño deseado.',
  },
  {
    to: '/weighted',
    icon: 'weighted',
    title: 'Sorteo con Pesos',
    description:
      'Realizá sorteos donde cada participante tiene una probabilidad proporcional a su peso asignado.',
  },
  {
    to: '/roulette',
    icon: 'roulette',
    title: 'Ruleta de Decisiones',
    description:
      'Agregá opciones personalizadas y girá la ruleta para tomar decisiones al azar de forma visual.',
  },
  {
    to: '/dice',
    icon: 'dice',
    title: 'Dados RPG',
    description:
      'Tiradas de dados RPG con caras de d4 a d20 y modificador opcional.',
  },
  {
    to: '/numbers',
    icon: 'numbers',
    title: 'Números Aleatorios',
    description:
      'Generá una cantidad de números dentro de un rango, con o sin repetición. Ideal para sorteos, ordenamientos o elecciones numéricas.',
  },
];

export function LandingPage() {
  return (
    <main className="workspace">
      <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-control bg-surface px-4 py-10 text-center shadow-raised animate-fade-in sm:py-14">
        <h1 tabIndex={-1} className="mb-4 font-bold text-ink">
          Thrive Randomizer
        </h1>
        <p className="text-lg text-muted max-w-2xl leading-relaxed">
          Suite de herramientas de aleatorización para equipos, sorteos
          ponderados, ruletas interactivas y tiradas de dados. Seleccioná un
          módulo para comenzar.
        </p>
        <a
          href="#modulos"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action shadow-low transition-colors hover:bg-action-hover active:bg-action-active focus-visible:outline focus-visible:outline-focus active:shadow-pressed"
        >
          Empezar a sortear
        </a>
      </section>

      <section
        id="modulos"
        className="mt-6 grid w-full scroll-mt-24 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in"
        aria-labelledby="modulos-heading"
      >
        <h2 id="modulos-heading" className="sr-only">
          Módulos disponibles
        </h2>
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="flex flex-col rounded-2xl border border-control bg-surface p-6 text-ink shadow-raised transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-action hover:shadow-high focus-visible:outline focus-visible:outline-focus hover:no-underline hover:text-ink sm:last:col-span-2 lg:last:col-span-1"
          >
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-md bg-surface-sunken text-ink shadow-pressed">
              <ModuleIcon name={m.icon} className="h-6 w-6" />
            </span>
            <h3 className="text-xl font-bold mb-2">{m.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{m.description}</p>
            <span className="mt-auto pt-4 text-sm font-semibold text-action">
              Abrir <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
