import { Home, CalendarDays, BookOpen, Users, Shield, FileText, Heart, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroHouse from "@/assets/hero-house.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="font-display text-xl text-foreground">Maison Commune</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Connexion
            </Button>
            <Button size="sm">Créer mon espace</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display leading-tight text-foreground">
                Gérez votre maison familiale{" "}
                <span className="text-primary">sans conflits.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Planning partagé, réservations, règles de la maison et souvenirs de famille.
                Maison Commune centralise tout pour organiser votre maison de famille.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="text-base">
                  Créer mon espace familial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="text-base">
                  Découvrir l'application
                </Button>
              </div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <img
                src={heroHouse}
                alt="Illustration d'une maison familiale de campagne"
                className="w-full max-w-md mx-auto drop-shadow-xl"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display text-foreground mb-4">
              Pourquoi les maisons familiales deviennent difficiles à organiser ?
            </h2>
            <p className="text-muted-foreground text-lg">
              Quand une maison est partagée entre plusieurs membres d'une famille, l'organisation devient vite compliquée.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: CalendarDays, text: "Qui vient quand ?" },
              { icon: FileText, text: "Où sont les règles de la maison ?" },
              { icon: Users, text: "Comment partager les infos importantes ?" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-background rounded-lg p-6 text-center space-y-3 border border-border hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-terracotta-light">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-body font-medium text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground mt-8 max-w-xl mx-auto">
            Maison Commune centralise tout dans un seul espace.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-display text-foreground text-center mb-12">
            Une seule application pour gérer la maison familiale.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: CalendarDays, title: "Planning partagé", desc: "Visualisez les disponibilités d'un coup d'œil." },
              { icon: BookOpen, title: "Réservations", desc: "Réservez vos séjours en quelques clics." },
              { icon: FileText, title: "Fiches pratiques", desc: "Consignes d'arrivée, départ, règles de la maison." },
              { icon: Heart, title: "Journal de la maison", desc: "Photos, souvenirs et anecdotes de chaque séjour." },
              { icon: Shield, title: "Gestion des dépenses", desc: "Suivez qui a payé quoi, et qui doit combien." },
              { icon: Users, title: "Espace familial", desc: "Invitez les membres de la famille en un clic." },
            ].map((f, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-display text-foreground text-center mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Créer votre maison familiale", desc: "Ajoutez les informations de base de votre maison." },
              { step: "2", title: "Inviter les membres", desc: "Partagez un lien d'invitation avec votre famille." },
              { step: "3", title: "Organiser les séjours", desc: "Réservez, planifiez et partagez vos souvenirs." },
            ].map((s, i) => (
              <div key={i} className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground font-display text-2xl">
                  {s.step}
                </div>
                <h3 className="font-display text-xl text-foreground">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
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
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
                <CheckCircle2 className="h-6 w-6 text-sage flex-shrink-0 mt-0.5" />
                <p className="text-foreground font-medium">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-display text-primary-foreground">
            Créer votre maison familiale gratuitement.
          </h2>
          <p className="text-primary-foreground/80 max-w-md mx-auto">
            Rejoignez les familles qui organisent leur maison en toute sérénité.
          </p>
          <Button size="lg" variant="secondary" className="text-base">
            Créer mon espace familial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
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
