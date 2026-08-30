import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Download, HandHeart, Heart, Sparkles, Unlock } from 'lucide-react';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const pageTitle = '¿Por qué Jireh?';
const pageDescription =
  'Conoce qué significa Jireh, “el Señor proveerá”, y el propósito de Jireh Finanzas: organizar tus recursos con fe, sabiduría y libertad.';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    'qué significa Jireh',
    'Jireh significado',
    'Jehová Jireh',
    'Dios proveerá',
    'Génesis 22:14',
    'finanzas cristianas',
    'finanzas personales con fe',
    'administración financiera cristiana',
    'Jireh Finanzas',
  ],
  alternates: {
    canonical: '/sobre-jireh',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: SITE_NAME,
    title: `${pageTitle} | ${SITE_NAME}`,
    description: pageDescription,
    url: '/sobre-jireh',
    images: [
      {
        url: '/sobre-jireh/opengraph-image',
        width: 1200,
        height: 630,
        alt: '¿Por qué Jireh? Dios provee; administra con sabiduría.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageTitle} | ${SITE_NAME}`,
    description: pageDescription,
    images: ['/sobre-jireh/opengraph-image'],
  },
};

const principles = [
  {
    icon: Heart,
    title: 'Confianza',
    description: 'Confiamos en que Dios conoce nuestras necesidades y provee con fidelidad.',
  },
  {
    icon: HandHeart,
    title: 'Mayordomía',
    description: 'Administramos con sabiduría, intención y gratitud los recursos que recibimos.',
  },
  {
    icon: Sparkles,
    title: 'Propósito',
    description: 'Cada decisión financiera puede acercarnos a una vida más ordenada y generosa.',
  },
];

export default function AboutJirehPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE_URL}/sobre-jireh#webpage`,
    url: `${SITE_URL}/sobre-jireh`,
    name: `${pageTitle} | ${SITE_NAME}`,
    description: pageDescription,
    inLanguage: 'es-CO',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    about: [
      {
        '@type': 'Thing',
        name: 'Jireh',
        description: 'Jireh significa “el Señor proveerá” y se relaciona con Génesis 22:14.',
      },
      {
        '@type': 'Thing',
        name: 'Finanzas personales con fe',
      },
    ],
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-7 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <header className="mb-7 flex items-center px-1 sm:mb-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Ir al inicio de Jireh Finanzas">
          <Image src="/logo.png" alt="" width={34} height={34} className="object-contain" priority />
          <span className="font-display text-lg font-semibold tracking-tight">Jireh Finanzas</span>
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card px-6 py-10 text-center shadow-lg shadow-primary/5 sm:px-10 sm:py-14">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-income/10 blur-2xl" />
        <div className="relative">
          <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Heart className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Nuestra historia</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Por qué Jireh?
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Porque cada detalle de esta app nace de una convicción: Dios provee y nosotros
            administramos con amor los recursos que Él nos ha confiado.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="meaning-title">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">El significado del nombre</p>
            <h2 id="meaning-title" className="mt-1 text-2xl font-bold">
              Jireh: “El Señor proveerá”
            </h2>
          </div>
        </div>
        <div className="mt-5 space-y-4 text-[15px] leading-7 text-muted-foreground">
          <p>
            <strong className="font-semibold text-foreground">Jireh</strong>, también escrito
            <strong className="font-semibold text-foreground"> Yireh</strong>, procede de la
            expresión hebrea <em>YHWH-Yireh</em>, tradicionalmente conocida como Jehová-Jireh.
            Se traduce como “el Señor proveerá” o “el Señor provee”.
          </p>
          <p>
            El nombre aparece en <strong className="font-semibold text-foreground">Génesis 22:14</strong>,
            cuando Abraham llama así al lugar donde Dios proveyó lo necesario. Es un recordatorio
            de que la provisión de Dios llega con propósito y cuidado.
          </p>
          <Link
            href="https://www.biblegateway.com/resources/encyclopedia-of-the-bible/Jehovah-Jireh"
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Conocer la referencia bíblica
          </Link>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="purpose-title">
        <div className="px-1">
          <p className="text-sm font-semibold text-primary">Nuestro propósito</p>
          <h2 id="purpose-title" className="mt-1 text-2xl font-bold">
            Finanzas organizadas, de la mano de Dios
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
            {SITE_NAME} existe para ayudarte a organizar tus finanzas sin perder de vista lo más
            importante: puedes confiar en que Dios provee, mientras administras responsablemente
            los recursos que nuestro Creador te ha dado.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.title} className="rounded-2xl border border-border bg-card p-5">
              <principle.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">{principle.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="freedom-title">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <Unlock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Una herramienta más abierta</p>
            <h2 id="freedom-title" className="mt-1 text-2xl font-bold">
              Tus finanzas y tus datos te pertenecen
            </h2>
          </div>
        </div>
        <div className="mt-5 space-y-4 text-[15px] leading-7 text-muted-foreground">
          <p>
            Jireh también fue creada porque muchas apps de finanzas limitan la descarga de los
            datos propios o reservan funciones importantes para planes de pago. Creemos que tener
            claridad sobre tu dinero no debería sentirse inaccesible.
          </p>
          <p>
            Por eso diseñamos una app generosa: para que aproveches al máximo sus funcionalidades,
            conserves el control de tu información y puedas llevar tus finanzas con libertad,
            responsabilidad y propósito.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-primary/10 p-4 text-sm text-foreground">
          <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Tu información financiera es tuya: la organización y las decisiones siempre permanecen
            en tus manos.
          </p>
        </div>
      </section>

      <blockquote className="mt-6 rounded-2xl border-l-4 border-primary bg-primary/10 px-5 py-4 text-[15px] leading-7 text-foreground">
        “Dios provee; tú administras los recursos que Él te ha dado.”
      </blockquote>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="founder-title">
        <p className="text-sm font-semibold text-primary">Las personas detrás de la app</p>
        <h2 id="founder-title" className="mt-1 text-2xl font-bold">
          Conoce a nuestro fundador y su familia
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          Te compartimos quiénes somos, el corazón con el que creamos Jireh Finanzas y cómo puedes
          comunicarte directamente con nosotros.
        </p>
        <Link
          href="/fundador"
          className="mt-5 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Conocer nuestra historia
        </Link>
      </section>
    </div>
  );
}
