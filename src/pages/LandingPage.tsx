import { Home, CalendarDays, BookOpen, Users, Shield, FileText, Heart, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";
import { Link } from "react-router-dom";
import heroHouse from "@/assets/hero-house.png";

// Reusable scroll-triggered wrapper
const Reveal = ({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } },
  item: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  },
};

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      >
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="font-display text-xl text-foreground">Maison Commune</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Créer mon espace</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl md:text-5xl lg:text-6xl font-display leading-tight text-foreground"
              >
                Gérez votre maison familiale{" "}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-primary"
                >
                  sans conflits.
                </motion.span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-lg md:text-xl text-muted-foreground max-w-lg"
              >
                Planning partagé, réservations, règles de la maison et souvenirs de famille.
                Maison Commune centralise tout pour organiser votre maison de famille.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button size="lg" className="text-base group" asChild>
                  <Link to="/signup">
                    Créer mon espace familial
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base" asChild>
                  <a href="#solution">Découvrir l'application</a>
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.img
                src={heroHouse}
                alt="Illustration d'une maison familiale de campagne"
                className="w-full max-w-md mx-auto drop-shadow-xl"
                loading="eager"
                whileHover={{ scale: 1.03, rotate: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-display text-foreground mb-4">
                Pourquoi les maisons familiales deviennent difficiles à organiser ?
              </h2>
              <p className="text-muted-foreground text-lg">
                Quand une maison est partagée entre plusieurs membres d'une famille, l'organisation devient vite compliquée.
              </p>
            </div>
          </Reveal>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {[
              { icon: CalendarDays, text: "Qui vient quand ?" },
              { icon: FileText, text: "Où sont les règles de la maison ?" },
              { icon: Users, text: "Comment partager les infos importantes ?" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={stagger.item}
                whileHover={{ y: -4, boxShadow: "0 8px 30px -12px hsl(var(--primary) / 0.2)" }}
                className="bg-background rounded-lg p-6 text-center space-y-3 border border-border cursor-default"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-terracotta-light"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <item.icon className="h-6 w-6 text-primary" />
                </motion.div>
                <p className="font-body font-medium text-foreground">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>

          <Reveal delay={0.3}>
            <p className="text-center text-muted-foreground mt-8 max-w-xl mx-auto">
              Maison Commune centralise tout dans un seul espace.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="py-16 md:py-24">
        <div className="container">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-display text-foreground text-center mb-12">
              Une seule application pour gérer la maison familiale.
            </h2>
          </Reveal>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {[
              { icon: CalendarDays, title: "Planning partagé", desc: "Visualisez les disponibilités d'un coup d'œil." },
              { icon: BookOpen, title: "Réservations", desc: "Réservez vos séjours en quelques clics." },
              { icon: FileText, title: "Fiches pratiques", desc: "Consignes d'arrivée, départ, règles de la maison." },
              { icon: Heart, title: "Journal de la maison", desc: "Photos, souvenirs et anecdotes de chaque séjour." },
              { icon: Shield, title: "Gestion des dépenses", desc: "Suivez qui a payé quoi, et qui doit combien." },
              { icon: Users, title: "Espace familial", desc: "Invitez les membres de la famille en un clic." },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={stagger.item}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group rounded-xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 hover:shadow-lg transition-colors"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"
                  whileHover={{ scale: 1.15, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <f.icon className="h-5 w-5 text-primary" />
                </motion.div>
                <h3 className="font-display text-lg text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-display text-foreground text-center mb-12">
              Comment ça marche ?
            </h2>
          </Reveal>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            {[
              { step: "1", title: "Créer votre maison familiale", desc: "Ajoutez les informations de base de votre maison." },
              { step: "2", title: "Inviter les membres", desc: "Partagez un lien d'invitation avec votre famille." },
              { step: "3", title: "Organiser les séjours", desc: "Réservez, planifiez et partagez vos souvenirs." },
            ].map((s, i) => (
              <motion.div key={i} variants={stagger.item} className="text-center space-y-4">
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground font-display text-2xl"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  {s.step}
                </motion.div>
                <h3 className="font-display text-xl text-foreground">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto space-y-6">
            {[
              "Moins de conflits entre les membres de la famille",
              "Plus de visibilité sur l'occupation de la maison",
              "Une mémoire familiale préservée pour les générations futures",
            ].map((b, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <motion.div
                  className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border"
                  whileHover={{ x: 6, borderColor: "hsl(var(--primary) / 0.3)" }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle2 className="h-6 w-6 text-sage flex-shrink-0 mt-0.5" />
                  </motion.div>
                  <p className="text-foreground font-medium">{b}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-primary overflow-hidden">
        <Reveal>
          <div className="container text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-display text-primary-foreground">
              Créer votre maison familiale gratuitement.
            </h2>
            <p className="text-primary-foreground/80 max-w-md mx-auto">
              Rejoignez les familles qui organisent leur maison en toute sérénité.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="secondary" className="text-base group" asChild>
                <Link to="/signup">
                  Créer mon espace familial
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <span className="font-display text-foreground">Maison Commune</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Maison Commune. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
