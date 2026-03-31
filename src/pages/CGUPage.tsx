import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoCasaCircle from "@/assets/logo-casacircle.png";

const CGUPage = () => {
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
        <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2 tracking-tight">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : 25 mars 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-display text-foreground">1. Objet</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les conditions d'accès et d'utilisation de la plateforme CasaCircle, éditée par la société STACKEASY (ci-après « l'Éditeur »). En accédant à la plateforme, l'utilisateur accepte sans réserve les présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">2. Description du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CasaCircle est une plateforme SaaS dédiée à la gestion partagée de maisons familiales. Elle permet notamment :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>La création et la gestion de maisons familiales partagées</li>
              <li>La gestion des réservations et du planning partagé</li>
              <li>La gestion des dépenses et leur répartition entre membres</li>
              <li>La création de fiches pratiques (arrivée, départ, règles)</li>
              <li>Le journal de souvenirs et photos de famille</li>
              <li>La gestion de la maintenance et des tickets</li>
              <li>Le système de votes et sondages familiaux</li>
              <li>Le stockage sécurisé de documents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">3. Inscription et compte utilisateur</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'accès aux fonctionnalités de CasaCircle nécessite la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes et à jour lors de son inscription. Il est responsable de la confidentialité de ses identifiants de connexion et de toute activité réalisée depuis son compte.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU, d'utilisation frauduleuse ou de comportement portant atteinte au bon fonctionnement du service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">4. Familles et rôles</h2>
            <p className="text-muted-foreground leading-relaxed">
              CasaCircle fonctionne sur un modèle multi-famille. Chaque utilisateur peut créer ou rejoindre une ou plusieurs familles et maisons. Les rôles disponibles sont :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Administrateur :</strong> accès complet, gestion des membres, approbation des réservations et gestion de la maison</li>
              <li><strong>Membre :</strong> accès aux fonctionnalités de réservation, dépenses, journal et consultation</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              L'administrateur de la famille est responsable de la gestion des accès et des données au sein de son espace familial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">5. Abonnements et facturation</h2>
            <p className="text-muted-foreground leading-relaxed">
              CasaCircle propose différentes formules d'utilisation. Les tarifs en vigueur sont affichés sur la page de tarification du site. L'Éditeur se réserve le droit de modifier ses tarifs à tout moment, sous réserve d'en informer les utilisateurs au moins 30 jours avant l'entrée en vigueur des nouveaux tarifs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les abonnements sont facturés mensuellement ou annuellement selon le choix de l'utilisateur. Sauf résiliation avant la date de renouvellement, l'abonnement est reconduit automatiquement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">6. Obligations de l'utilisateur</h2>
            <p className="text-muted-foreground leading-relaxed">L'utilisateur s'engage à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Utiliser le service conformément à sa destination et aux lois en vigueur</li>
              <li>Ne pas tenter de contourner les mesures de sécurité de la plateforme</li>
              <li>Ne pas utiliser le service pour stocker ou diffuser des contenus illicites</li>
              <li>Respecter les droits de propriété intellectuelle de l'Éditeur et des tiers</li>
              <li>Ne pas partager ses identifiants de connexion avec des tiers non autorisés</li>
              <li>S'assurer de la licéité et de la conformité des données personnelles qu'il saisit dans la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">7. Données et documents</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur reste propriétaire de l'ensemble des données et documents qu'il saisit ou téléverse sur la plateforme. L'Éditeur s'engage à ne pas utiliser ces données à des fins autres que la fourniture du service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur est seul responsable de la conformité juridique des informations et documents qu'il partage via la plateforme. CasaCircle fournit des outils de gestion à titre indicatif qui ne constituent pas un conseil juridique.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">8. Disponibilité du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Éditeur s'efforce d'assurer la disponibilité du service 24h/24, 7j/7. Toutefois, il ne peut garantir une disponibilité absolue et ne saurait être tenu responsable des interruptions temporaires liées à la maintenance, aux mises à jour ou à des circonstances indépendantes de sa volonté (force majeure, panne d'infrastructure tierce).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">9. Limitation de responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Éditeur met en œuvre tous les moyens raisonnables pour assurer la fiabilité du service. Cependant, CasaCircle est fourni « en l'état ». L'Éditeur ne saurait être tenu responsable :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Des dommages directs ou indirects résultant de l'utilisation du service</li>
              <li>De la perte de données consécutive à un cas de force majeure</li>
              <li>De l'inexactitude des informations saisies par l'utilisateur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">10. Résiliation</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres de son compte. En cas de résiliation, les données seront conservées pendant une durée de 30 jours, après quoi elles seront définitivement supprimées, sauf obligation légale de conservation.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Éditeur peut résilier l'accès d'un utilisateur en cas de manquement aux présentes CGU, après notification préalable par email, sauf en cas de manquement grave justifiant une suspension immédiate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">11. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble des éléments constituant la plateforme CasaCircle (logiciel, interface, textes, logos, icônes, base de données) sont la propriété exclusive de STACKEASY et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est strictement interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">12. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes CGU sont régies par le droit français. En cas de litige relatif à l'interprétation ou à l'exécution des présentes, les parties s'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents de Bordeaux.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">13. Modification des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par email ou notification dans l'application. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display text-foreground">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter par email à{" "}
              <a href="mailto:contact@stackeasy.io" className="text-primary hover:underline">contact@stackeasy.io</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CGUPage;
