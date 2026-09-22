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

from .models import Producteur


def _f(value):
    """Decimal/None -> float sûr pour sérialisation JSON."""
    return float(value) if value is not None else 0.0


def build_cumuls(p):
    """Construit le dictionnaire de cumuls d'un producteur (réutilisé par
    l'endpoint producteur et par la vue agrégée village)."""
    from history.models import AGRHistory, ProductionHistory, SocialIndicatorHistory
    from tracabilite.models import BonCollecte
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
    return {
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
    }


class ProducteurCumulsMixin:
    """Mixin ajouté au ProducteurViewSet (#8) : cumuls d'un producteur et
    vision agrégée par village."""

    @action(detail=True, methods=['get'], url_path='cumuls')
    def cumuls(self, request, pk=None):
        """GET /api/producteurs/{id}/cumuls/ — cumuls multi-années d'un
        producteur (estimations, dotations, AGR, réalisations)."""
        return Response(build_cumuls(self.get_object()), status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='cumuls-village')
    def cumuls_village(self, request):
        """GET /api/producteurs/cumuls-village/?village=X — cumuls agrégés
        par producteur pour un village (filtres optionnels : commune,
        cooperative). Réutilise build_cumuls() pour chaque producteur."""
        village = request.query_params.get('village')
        commune = request.query_params.get('commune')
        cooperative = request.query_params.get('cooperative')
        qs = Producteur.objects.filter(actif=True)
        # #29 — Confidentialité par agence : cumuls limités aux producteurs
        # visibles par l'utilisateur (édition non-responsable → son agence).
        from users.permissions import scope_par_agence
        qs, _ = scope_par_agence(request.user, qs)
        if village:
            qs = qs.filter(village__iexact=village)
        if commune:
            qs = qs.filter(commune__iexact=commune)
        if cooperative:
            qs = qs.filter(cooperative_id=cooperative)
        producteurs = []
        totaux = {'estimations_kg': 0.0, 'estimations_revenu': 0.0,
                  'dotations': 0, 'agr_revenu': 0.0,
                  'realisations_kg': 0.0, 'realisations_montant': 0.0}
        for p in qs:
            c = build_cumuls(p)
            producteurs.append(c)
            totaux['estimations_kg'] += c['estimations']['total_kg']
            totaux['estimations_revenu'] += c['estimations']['total_revenu']
            totaux['dotations'] += c['dotations']['total']
            totaux['agr_revenu'] += c['agr']['revenu_total']
            totaux['realisations_kg'] += c['realisations']['total_kg']
            totaux['realisations_montant'] += c['realisations']['total_montant']
        producteurs.sort(key=lambda c: c['producteur']['code'])
        return Response({
            'filtres': {'village': village, 'commune': commune,
                        'cooperative': cooperative},
            'nb_producteurs': len(producteurs),
            'totaux': {k: round(v, 2) for k, v in totaux.items()},
            'producteurs': producteurs,
        }, status=status.HTTP_200_OK)

