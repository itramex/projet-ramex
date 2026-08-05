import uuid
from django.db import transaction
from tracabilite.models import (
    TracabiliteChain,
    BonCollecte,
    FicheCollecte,
    BonTransport,
    LotTraitement,
    Colis,
    CommandeExport
)


class TracabilityEngine:
    """
    Moteur de traçabilité ascendante et descendante
    
    Fonctionnalités :
    - Traçabilité ascendante : Producteur → Export
    - Traçabilité descendante : Export → Producteur
    - Génération de rapports PDF
    - QR Code pour chaque étape
    """
    
    def __init__(self):
        self.chain_data = {}
    
    def trace_ascendante(self, bon_collecte_id):
        """
        Traçabilité ascendante : Partir d'un bon de collecte et remonter jusqu'à l'export
        
        Args:
            bon_collecte_id: ID du bon de collecte
        
        Returns:
            dict: Chaîne complète de traçabilité
        """
        chain = {
            'type': 'ascendante',
            'bon_collecte': None,
            'fiche_collecte': None,
            'bon_transport': None,
            'lot_traitement': None,
            'colis': None,
            'commande_export': None,
            'producteurs': [],
            'parcelles': []
        }
        
        try:
            # 1. Bon de collecte
            bon_collecte = BonCollecte.objects.select_related(
                'producteur', 
                'cooperative', 
                'campagne'
            ).get(id=bon_collecte_id)
            
            chain['bon_collecte'] = self._serialize_bon_collecte(bon_collecte)
            chain['producteurs'].append(self._serialize_producteur(bon_collecte.producteur))
            
            # Si vente groupée, ajouter tous les producteurs
            if bon_collecte.est_vente_groupee:
                for prod in bon_collecte.producteurs_groupes.all():
                    chain['producteurs'].append(self._serialize_producteur(prod))
            
            # 2. Fiche de collecte
            fiche_collecte = bon_collecte.fiches_collecte.first()
            if fiche_collecte:
                chain['fiche_collecte'] = self._serialize_fiche_collecte(fiche_collecte)
                
                # 3. Bon de transport
                bon_transport = fiche_collecte.bons_transport.first()
                if bon_transport:
                    chain['bon_transport'] = self._serialize_bon_transport(bon_transport)
                    
                    # 4. Lot de traitement
                    lot_traitement = bon_transport.lots_traitement.first()
                    if lot_traitement:
                        chain['lot_traitement'] = self._serialize_lot_traitement(lot_traitement)
                        
                        # 5. Colis
                        colis = lot_traitement.colis.first()
                        if colis:
                            chain['colis'] = self._serialize_colis(colis)
                            
                            # 6. Commande d'export
                            commande_export = colis.commandes_export.first()
                            if commande_export:
                                chain['commande_export'] = self._serialize_commande_export(commande_export)
            
            # Sauvegarder la chaîne
            self._save_chain(chain, bon_collecte)
            
            return chain
        
        except BonCollecte.DoesNotExist:
            raise ValueError(f"Bon de collecte {bon_collecte_id} introuvable")
    
    def trace_descendante(self, commande_export_id):
        """
        Traçabilité descendante : Partir d'une commande d'export et descendre jusqu'au producteur
        
        Args:
            commande_export_id: ID de la commande d'export
        
        Returns:
            dict: Chaîne complète de traçabilité
        """
        chain = {
            'type': 'descendante',
            'commande_export': None,
            'colis': [],
            'lots_traitement': [],
            'bons_transport': [],
            'fiches_collecte': [],
            'bons_collecte': [],
            'producteurs': [],
            'parcelles': []
        }
        
        try:
            # 1. Commande d'export
            commande_export = CommandeExport.objects.prefetch_related('colis').get(id=commande_export_id)
            chain['commande_export'] = self._serialize_commande_export(commande_export)
            
            # 2. Pour chaque colis
            for colis in commande_export.colis.all():
                chain['colis'].append(self._serialize_colis(colis))
                
                # 3. Lot de traitement
                lot_traitement = colis.lot_traitement
                if lot_traitement and lot_traitement.id not in [l['id'] for l in chain['lots_traitement']]:
                    chain['lots_traitement'].append(self._serialize_lot_traitement(lot_traitement))
                    
                    # 4. Pour chaque bon de transport
                    for bon_transport in lot_traitement.bons_transport.all():
                        if bon_transport.id not in [bt['id'] for bt in chain['bons_transport']]:
                            chain['bons_transport'].append(self._serialize_bon_transport(bon_transport))
                            
                            # 5. Fiche de collecte
                            fiche_collecte = bon_transport.fiche_collecte
                            if fiche_collecte and fiche_collecte.id not in [fc['id'] for fc in chain['fiches_collecte']]:
                                chain['fiches_collecte'].append(self._serialize_fiche_collecte(fiche_collecte))
                                
                                # 6. Pour chaque bon de collecte
                                for bon_collecte in fiche_collecte.bons_collecte.all():
                                    if bon_collecte.id not in [bc['id'] for bc in chain['bons_collecte']]:
                                        chain['bons_collecte'].append(self._serialize_bon_collecte(bon_collecte))
                                        
                                        # 7. Producteur
                                        producteur = bon_collecte.producteur
                                        if producteur.id not in [p['id'] for p in chain['producteurs']]:
                                            chain['producteurs'].append(self._serialize_producteur(producteur))
            
            return chain
        
        except CommandeExport.DoesNotExist:
            raise ValueError(f"Commande d'export {commande_export_id} introuvable")
    
    def _serialize_bon_collecte(self, bc):
        """Sérialise un bon de collecte"""
        return {
            'id': bc.id,
            'numero_fabc': bc.numero_fabc,
            'date_marche': str(bc.date_marche),
            'producteur': bc.producteur.code,
            'poids_accepte': float(bc.poids_accepte),
            'montant_total': float(bc.montant_total_achat),
            'type_produit': bc.type_produit,
            'certification': bc.certification
        }
    
    def _serialize_fiche_collecte(self, fc):
        """Sérialise une fiche de collecte"""
        return {
            'id': fc.id,
            'numero_fc': fc.numero_fc,
            'date_marche': str(fc.date_marche),
            'poids_total_net': float(fc.poids_total_net)
        }
    
    def _serialize_bon_transport(self, bt):
        """Sérialise un bon de transport"""
        return {
            'id': bt.id,
            'numero_bt': bt.numero_bt,
            'date_chargement': str(bt.date_chargement),
            'lieu_depart': bt.lieu_depart,
            'lieu_destination': bt.lieu_destination,
            'poids_total_depart': float(bt.poids_total_depart)
        }
    
    def _serialize_lot_traitement(self, lt):
        """Sérialise un lot de traitement"""
        return {
            'id': lt.id,
            'numero_lot': lt.numero_lot,
            'type_traitement': lt.type_traitement,
            'date_debut': str(lt.date_debut),
            'poids_entree': float(lt.poids_entree),
            'poids_sortie': float(lt.poids_sortie) if lt.poids_sortie else None,
            'qualite': lt.qualite
        }
    
    def _serialize_colis(self, colis):
        """Sérialise un colis"""
        return {
            'id': colis.id,
            'numero_colis': colis.numero_colis,
            'poids_net': float(colis.poids_net),
            'qualite': colis.qualite,
            'qr_code': colis.qr_code
        }
    
    def _serialize_commande_export(self, ce):
        """Sérialise une commande d'export"""
        return {
            'id': ce.id,
            'numero_commande': ce.numero_commande,
            'nom_client': ce.nom_client,
            'pays_destination': ce.pays_destination,
            'date_expedition': str(ce.date_expedition) if ce.date_expedition else None,
            'poids_total_net': float(ce.poids_total_net)
        }
    
    def _serialize_producteur(self, prod):
        """Sérialise un producteur"""
        return {
            'id': prod.id,
            'code': prod.code,
            'nom': prod.nom,
            'prenom': prod.prenom,
            'village': prod.village,
            'fokontany': prod.fokontany
        }
    
    @transaction.atomic
    def _save_chain(self, chain_data, bon_collecte):
        """Sauvegarde la chaîne de traçabilité en base"""
        TracabiliteChain.objects.create(
            uuid=uuid.uuid4(),
            type_tracabilite=chain_data['type'],
            producteur=bon_collecte.producteur,
            bon_collecte_id=bon_collecte.id,
            chain_data=chain_data
        )
