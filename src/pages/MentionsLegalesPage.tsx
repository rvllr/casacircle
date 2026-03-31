import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoCasaCircle from "@/assets/logo-casacircle.png";

const MentionsLegalesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoCasaCircle} alt="CasaCircle" className="h-9 w-auto" />
          </Link>
          <Button variant="ghost" size="sm" className="rounded-xl" asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
          </Button>
        </div>
      </nav>

      <main className="container max-w-3xl py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-display text-foreground mb-10 tracking-tight">
          Mentions légales
        </h1>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-display text-foreground mb-3">1. Éditeur du site</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Le site CasaCircle est édité par la société STACKEASY, SAS (Société par Actions Simplifiée) au capital social variable.
            </p>
            <ul className="text-muted-foreground space-y-1.5 text-sm">
              <li><strong className="text-foreground/80">Dénomination sociale :</strong> STACKEASY</li>
              <li><strong className="text-foreground/80">SIREN :</strong> 935 391 292</li>
              <li><strong className="text-foreground/80">SIRET (siège) :</strong> 935 391 292 00015</li>
              <li><strong className="text-foreground/80">Numéro de TVA :</strong> FR69935391292</li>
              <li><strong className="text-foreground/80">Siège social :</strong> 1 Cours Xavier Arnozan, 33000 Bordeaux, France</li>
              <li><strong className="text-foreground/80">Code APE :</strong> 6201Z — Programmation informatique</li>
              <li><strong className="text-foreground/80">RCS :</strong> Bordeaux</li>
              <li><strong className="text-foreground/80">Date de création :</strong> 07/11/2024</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground mb-3">2. Directeur de la publication</h2>
            <p className="text-muted-foreground leading-relaxed">Raphael VUILLIER</p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground mb-3">3. Hébergement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le site est hébergé par Lovable (infrastructure cloud). Les données sont stockées sur des serveurs sécurisés au sein de l'Union Européenne.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground mb-3">4. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble des contenus présents sur le site CasaCircle (textes, images, logos, icônes, logiciels, base de données) sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, est strictement interdite sans l'accord préalable écrit de STACKEASY.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground mb-3">5. Données personnelles</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles. Vous pouvez exercer ces droits en nous contactant à l'adresse :{" "}
              <a href="mailto:contact@stackeasy.io" className="text-primary hover:underline">contact@stackeasy.io</a>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Pour plus de détails, consultez notre politique de confidentialité.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le site utilise des cookies strictement nécessaires au bon fonctionnement du service (authentification, préférences utilisateur). Aucun cookie publicitaire ou de tracking n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter par email à{" "}
              <a href="mailto:contact@stackeasy.io" className="text-primary hover:underline">contact@stackeasy.io</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MentionsLegalesPage;
