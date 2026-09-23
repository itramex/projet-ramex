# -*- coding: utf-8 -*-
"""
Commande : simuler_annee_archive
================================
Clone les archives de l'annee source vers une annee cible pour rendre
demontrables les comparaisons pluriannuelles (#5) tant que la base ne
contient qu'une seule campagne reelle.

Donnees clonees (toutes marquees "SIMULATION" dans notes/description) :
  - ProducteurSnapshot        (variation : ~ -5 % d'enfants scolarises)
  - ProductionHistory         (variation : quantites x 0,85-0,94)
  - AGRHistory                (variation : quantites x 0,88, revenu recalcule)
  - SocialIndicatorHistory    (variation : taux de scolarisation x 0,96)
  - AnnualSnapshot            (agregats recalcules depuis les clones)

Utilisation :
  python manage.py simuler_annee_archive --cible 2025 [--source 2026]
  python manage.py simuler_annee_archive --cible 2025 --clean   # annule

Les variations sont DETERMINISTES (basees sur l'index de ligne) pour
garantir la reproductibilite — pas d'aleatoire.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from decimal import Decimal, ROUND_HALF_UP

from history.models import (
    ProductionHistory,
    AGRHistory,
    SocialIndicatorHistory,
    AnnualSnapshot,
    ProducteurSnapshot,
)

MARQUEUR = 'SIMULATION'


def _facteur(index, base, amplitude=0.09):
    """Facteur deterministe entre base et base - amplitude selon l'index."""
    pas = amplitude / 4.0
    return base - ((index % 5) * pas)


def _d(val, facteur=1.0, quant='0.01'):
    """Multiplication sur d'une valeur decimale/nulle par un facteur."""
    if val is None:
        return None
    try:
        return (Decimal(str(val)) * Decimal(str(facteur))).quantize(
            Decimal(quant), rounding=ROUND_HALF_UP)
    except Exception:
        return val


def _cloner(src, Model, exclude=('id', 'date_enregistrement'), **overrides):
    """Clone une instance (copie des champs concrets) avec overrides."""
    obj = Model()
    for f in Model._meta.concrete_fields:
        if f.primary_key or f.name in exclude:
            continue
        setattr(obj, f.name, getattr(src, f.name))
    for k, v in overrides.items():
        setattr(obj, k, v)
    obj.save()
    return obj


class Command(BaseCommand):
    help = (
        "Clone les archives d'une annee source vers une annee cible "
        "(simulation deterministe) pour les comparaisons pluriannuelles."
    )

    def add_arguments(self, parser):
        parser.add_argument('--cible', type=int, required=True,
                            help='Annee cible a creer (ex: 2025)')
        parser.add_argument('--source', type=int, default=None,
                            help='Annee source a cloner (defaut : derniere archivee)')
        parser.add_argument('--clean', action='store_true',
                            help="Supprime les donnees simulees de l'annee cible")
        parser.add_argument('--dry-run', action='store_true',
                            help='Affiche ce qui serait fait sans ecrire')

    def handle(self, *args, **options):
        cible = options['cible']
        source = options['source']
        dry_run = options['dry_run']

        if source is None:
            source = (ProducteurSnapshot.objects
                      .order_by('-annee').values_list('annee', flat=True).first())
            if source is None:
                raise CommandError('Aucune annee archivee dans la base.')

        if cible == source:
            raise CommandError("L'annee cible doit differer de la source.")

        if options['clean']:
            self._nettoyer(cible, dry_run)
            return

        # Garde-fou : refuser si la cible contient deja des donnees
        existants = (ProducteurSnapshot.objects.filter(annee=cible).count()
                     + ProductionHistory.objects.filter(annee=cible).count()
                     + AGRHistory.objects.filter(annee=cible).count()
                     + SocialIndicatorHistory.objects.filter(annee=cible).count())
        if existants:
            raise CommandError(
                f"L'annee {cible} contient deja {existants} enregistrements. "
                f"Utiliser --clean pour la purger avant simulation.")

        src_snaps = list(ProducteurSnapshot.objects.filter(annee=source))
        src_prods = list(ProductionHistory.objects.filter(annee=source))
        src_agr = list(AGRHistory.objects.filter(annee=source))
        src_soc = list(SocialIndicatorHistory.objects.filter(annee=source))

        self.stdout.write(
            f'Source {source} : {len(src_snaps)} snapshots, {len(src_prods)} '
            f'productions, {len(src_agr)} AGR, {len(src_soc)} indicateurs sociaux.')
        if dry_run:
            self.stdout.write(f"[DRY-RUN] Creerait l'annee {cible} (clone).")
            return

        note = f'{MARQUEUR} {cible} (clone depuis {source}, variations deterministes)'

        with transaction.atomic():
            # 1) Snapshots producteurs : -5 % de scolarises en cible
            #    Correctif : si la source a nb_enfants_scolarises = 0 alors que
            #    des enfants existent (anciens imports ne remplissaient pas ce
            #    champ), on derive un taux cible plausible (~92 %) du total.
            #    Un accumulateur de reste evite l'effet d'arrondi qui
            #    donnerait 100 % aux familles de 1-2 enfants.
            retenue = 0.0
            for snap in src_snaps:
                total = (snap.nb_enfants_garcons or 0) + (snap.nb_enfants_filles or 0)
                if total <= 0:
                    # Aucun enfant declare : rien a simuler, on clone tel quel.
                    _cloner(snap, ProducteurSnapshot, annee=cible, notes=note)
                    continue
                src_scol = snap.nb_enfants_scolarises or 0
                if src_scol == 0 and total > 0:
                    # Source non renseignee : on vise ~92 % de scolarises.
                    # Le plancher + report de reste evite les 100 % mecaniques
                    # sur les petits effectifs (ex: 1 enfant x 0,92 = 0,92).
                    brut = total * 0.92 + retenue
                    scolarises = int(brut)  # plancher
                    retenue = brut - scolarises
                else:
                    scolarises = int(round(src_scol * 0.95))
                scolarises = min(scolarises, total)
                non_scolarises = max(0, total - scolarises)
                taux = (scolarises / total * 100) if total else 0
                _cloner(
                    snap, ProducteurSnapshot,
                    annee=cible,
                    nb_enfants_scolarises=scolarises,
                    nb_enfants_non_scolarises=non_scolarises,
                    taux_scolarisation=Decimal(str(round(taux, 2))),
                    notes=note,
                )

            # 2) Productions : quantites x 0,85-0,94 (prix inchanges)
            for i, prod in enumerate(src_prods):
                f = _facteur(i, base=0.94)
                _cloner(
                    prod, ProductionHistory,
                    annee=cible,
                    quantite_kg=_d(prod.quantite_kg, f) or Decimal('0'),
                    revenu_total=None,  # recalcule dans save()
                    notes=note,
                )

            # 3) AGR : quantites x 0,88-0,92, revenu recalcule explicitement
            for i, agr in enumerate(src_agr):
                f = _facteur(i, base=0.92)
                q_vendue = _d(agr.quantite_vendue, f)
                prix = agr.prix_vente_unitaire
                revenu = (q_vendue * prix) if (q_vendue is not None and prix) else None
                _cloner(
                    agr, AGRHistory,
                    annee=cible,
                    quantite_produite=_d(agr.quantite_produite, f),
                    quantite_vendue=q_vendue,
                    quantite_consommee=_d(agr.quantite_consommee, f),
                    revenu_annuel=revenu if revenu is not None else agr.revenu_annuel,
                    notes=note,
                )

            # 4) Indicateurs sociaux : taux de scolarisation x 0,96
            for soc in src_soc:
                over = {'annee': cible, 'notes': note}
                if soc.type_indicateur == 'scolarisation' and soc.valeur_numerique is not None:
                    over['valeur_numerique'] = _d(soc.valeur_numerique, 0.96)
                _cloner(soc, SocialIndicatorHistory, **over)

            # 5) Snapshot annuel agrege
            agg_prod = (ProductionHistory.objects.filter(annee=cible)
                        .aggregate(t=Sum('quantite_kg')))
            agg_agr = (AGRHistory.objects.filter(annee=cible)
                       .aggregate(t=Sum('revenu_annuel')))
            nb_parcelles = (ProductionHistory.objects.filter(annee=cible)
                            .values('parcelle').distinct().count())
            AnnualSnapshot.objects.create(
                annee=cible,
                nb_producteurs=ProducteurSnapshot.objects.filter(annee=cible).count(),
                nb_parcelles=nb_parcelles,
                production_totale_kg=agg_prod['t'] or Decimal('0'),
                revenu_total_agr=agg_agr['t'] or Decimal('0'),
                description=f'{note} — usage demonstration pluriannuel (#5)',
            )

        self.stdout.write(self.style.SUCCESS(
            f"OK Annee {cible} simulee depuis {source} : "
            f"{len(src_snaps)} snapshots, {len(src_prods)} productions, "
            f"{len(src_agr)} AGR, {len(src_soc)} indicateurs, 1 snapshot annuel."))
        self.stdout.write(self.style.NOTICE(
            f"Pour annuler : python manage.py simuler_annee_archive "
            f"--cible {cible} --clean"))

    def _nettoyer(self, cible, dry_run):
        qs_snap = ProducteurSnapshot.objects.filter(annee=cible)
        qs_prod = ProductionHistory.objects.filter(annee=cible)
        qs_agr = AGRHistory.objects.filter(annee=cible)
        qs_soc = SocialIndicatorHistory.objects.filter(annee=cible)
        qs_ann = AnnualSnapshot.objects.filter(annee=cible)

        counts = (qs_snap.count(), qs_prod.count(), qs_agr.count(),
                  qs_soc.count(), qs_ann.count())
        if dry_run:
            self.stdout.write(f'[DRY-RUN] Suppression : {counts}')
            return
        with transaction.atomic():
            for qs in (qs_prod, qs_agr, qs_soc, qs_snap):
                qs.delete()
            qs_ann.delete()
        self.stdout.write(self.style.WARNING(
            f'Nettoye annee {cible} : snapshots={counts[0]}, '
            f'productions={counts[1]}, agr={counts[2]}, '
            f'social={counts[3]}, annual={counts[4]}'))
