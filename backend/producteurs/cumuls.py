"""#8 — Vision cumulée multi-années d'un producteur.

Endpoint : GET /api/producteurs/{id}/cumuls/
Mixin branché sur ProducteurViewSet (aucune nouvelle table).
Ventile : estimations (parcelles), dotations, AGR, réalisations (bons
de collecte), scolarisation — par année et par type, avec totaux.
"""
from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response


def _f(value):
    """Decimal/None -> float sûr pour sérialisation JSON."""
    return float(value) if value is not None else 0.0


class ProducteurCumulsMixin:
    """Mixin ajouté au ProducteurViewSet : cumuls estimations / dotations /
    AGR / réalisations par année et par type (checklist #8)."""

    @action(detail=True, methods=['get'], url_path='cumuls')
    def cumuls(self, request, pk=None):
        from history.models import AGRHistory, ProductionHistory, SocialIndicatorHistory
        from tracabilite.models import BonCollecte
        p = self.get_object()
        productions = (ProductionHistory.objects.filter(parcelle__producteur=p)
                       .values('annee', 'culture')
                       .annotate(quantite_kg=Sum('quantite_kg'), revenu=Sum('revenu_total'))
                       .order_by('annee', 'culture'))
        estimations_par_annee = {}
        estimations_par_culture = {}
        total_kg = 0.0
        total_revenu = 0.0
        for row in productions:
            kg, rev = _f(row['quantite_kg']), _f(row['revenu'])
            total_kg += kg
            total_revenu += rev
            a = estimations_par_annee.setdefault(row['annee'], {'quantite_kg': 0, 'revenu': 0})
            a['quantite_kg'] += kg
            a['revenu'] += rev
            c = estimations_par_culture.setdefault(row['culture'], {'quantite_kg': 0, 'revenu': 0})
            c['quantite_kg'] += kg
            c['revenu'] += rev
        dotations_par_annee = {}
        dotations_par_type = {}
        dotations_total = 0
        for d in p.dotations.all().order_by('annee'):
            q = d.quantite or 0
            dotations_total += q
            a = dotations_par_annee.setdefault(d.annee, {'total': 0, 'par_type': {}})
            a['total'] += q
            a['par_type'][d.type_dotation] = a['par_type'].get(d.type_dotation, 0) + q
            dotations_par_type[d.type_dotation] = dotations_par_type.get(d.type_dotation, 0) + q
        agr_rows = (AGRHistory.objects.filter(producteur=p).values('annee', 'type_agr')
                    .annotate(revenu=Sum('revenu_annuel')).order_by('annee', 'type_agr'))
        agr_par_annee = {}
        agr_par_type = {}
        agr_total = 0.0
        for row in agr_rows:
            rev = _f(row['revenu'])
            agr_total += rev
            a = agr_par_annee.setdefault(row['annee'], {'revenu': 0, 'par_type': {}})
            a['revenu'] += rev
            a['par_type'][row['type_agr']] = a['par_type'].get(row['type_agr'], 0) + rev
            agr_par_type[row['type_agr']] = agr_par_type.get(row['type_agr'], 0) + rev
        # Bons où le producteur participe (direct OU vente groupée), sans doublon (#8).
        # Vente groupée : montant/kg réparti au prorata (1/N participants).
        bons = list(BonCollecte.objects.filter(
            Q(producteur=p) | Q(producteurs_groupes=p)).distinct())
        nb_bons = len(bons)
        real_par_annee = {}
        real_kg = 0.0
        real_montant = 0.0
        for bon in bons:
            nb_participants = bon.producteurs_groupes.count() if bon.est_vente_groupee else 0
            part = (1.0 / nb_participants) if nb_participants > 0 else 1.0
            kg = _f(bon.poids_accepte) * part
            montant = _f(bon.montant_total_achat) * part
            real_kg += kg
            real_montant += montant
            if bon.date_marche is not None:
                a = real_par_annee.setdefault(bon.date_marche.year, {'poids_kg': 0, 'montant': 0, 'nb_bons': 0})
                a['poids_kg'] += kg
                a['montant'] += montant
                a['nb_bons'] += 1
        social_par_annee = {r['annee']: {'enfants_scolarises': int(r['scolarises'] or 0)}
                            for r in SocialIndicatorHistory.objects.filter(
                                producteur=p, type_indicateur='scolarisation')
                            .values('annee').annotate(scolarises=Sum('valeur_numerique')).order_by('annee')}
        annees = sorted(set(estimations_par_annee) | set(dotations_par_annee)
                        | set(agr_par_annee) | set(real_par_annee) | set(social_par_annee))
        return Response({
            'producteur': {'id': p.id, 'code': p.code, 'nom_complet': p.nom_complet,
                           'village': p.village, 'commune': p.commune},
            'annees': annees,
            'estimations': {'total_kg': round(total_kg, 2), 'total_revenu': round(total_revenu, 2),
                            'par_annee': estimations_par_annee, 'par_culture': estimations_par_culture},
            'dotations': {'total': dotations_total, 'par_annee': dotations_par_annee,
                          'par_type': dotations_par_type},
            'agr': {'revenu_total': round(agr_total, 2), 'par_annee': agr_par_annee,
                    'par_type': agr_par_type},
            'realisations': {'total_kg': round(real_kg, 3),
                             'total_montant': round(real_montant, 2),
                             'nb_bons': nb_bons,
                             'par_annee': real_par_annee},
            'social_par_annee': social_par_annee,
        }, status=status.HTTP_200_OK)

