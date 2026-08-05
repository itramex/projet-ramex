"""
Script d'initialisation des types de formations et certifications
Usage: python manage.py init_formations_certifications
"""
from django.core.management.base import BaseCommand
from formations.models import TypeFormation, TypeCertification


class Command(BaseCommand):
    help = 'Initialise les types de formations et certifications de base'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Initialisation des types de formations et certifications...\n')
        
        # ========== TYPES DE FORMATIONS ==========
        formations = [
            {
                'nom': 'Bonnes Pratiques Agricoles (BPA)',
                'description': 'Formation sur les bonnes pratiques agricoles pour la culture de vanille',
                'duree_jours': 3,
            },
            {
                'nom': 'Gestion de la Qualité',
                'description': 'Formation sur la gestion de la qualité des produits agricoles',
                'duree_jours': 2,
            },
            {
                'nom': 'Agroforesterie',
                'description': 'Formation sur l\'agroforesterie et la culture durable',
                'duree_jours': 5,
            },
            {
                'nom': 'Gestion de l\'Eau',
                'description': 'Formation sur la gestion de l\'eau et l\'irrigation',
                'duree_jours': 2,
            },
            {
                'nom': 'Protection de l\'Environnement',
                'description': 'Formation sur la protection de l\'environnement et la biodiversité',
                'duree_jours': 3,
            },
            {
                'nom': 'Séchage et Conservation de la Vanille',
                'description': 'Formation sur les techniques de séchage et conservation de la vanille',
                'duree_jours': 4,
            },
            {
                'nom': 'Fécondation Manuelle de la Vanille',
                'description': 'Formation sur les techniques de fécondation manuelle des fleurs de vanille',
                'duree_jours': 2,
            },
            {
                'nom': 'Gestion Financière et Comptabilité',
                'description': 'Formation sur la gestion financière de l\'exploitation agricole',
                'duree_jours': 3,
            },
            {
                'nom': 'Leadership et Gouvernance Coopérative',
                'description': 'Formation pour les responsables de coopératives',
                'duree_jours': 5,
            },
            {
                'nom': 'Santé et Sécurité au Travail',
                'description': 'Formation sur la santé et la sécurité dans les activités agricoles',
                'duree_jours': 1,
            },
        ]
        
        created_formations = 0
        for formation_data in formations:
            formation, created = TypeFormation.objects.get_or_create(
                nom=formation_data['nom'],
                defaults={
                    'description': formation_data['description'],
                    'duree_jours': formation_data['duree_jours'],
                }
            )
            if created:
                created_formations += 1
                self.stdout.write(f'  ✅ Type de formation créé: {formation.nom}')
            else:
                self.stdout.write(f'  ⏭️  Type de formation existe déjà: {formation.nom}')
        
        self.stdout.write(f'\n📚 {created_formations} types de formations créés\n')
        
        # ========== TYPES DE CERTIFICATIONS ==========
        certifications = [
            {
                'nom': 'Rainforest Alliance',
                'code': 'RA',
                'niveau': 'rainforest',
                'description': 'Certification Rainforest Alliance pour l\'agriculture durable',
                'organisme_certificateur': 'Rainforest Alliance',
                'duree_validite_ans': 3,
            },
            {
                'nom': 'Fair Trade (Commerce Équitable)',
                'code': 'FT',
                'niveau': 'fair_trade',
                'description': 'Certification Fair Trade pour le commerce équitable',
                'organisme_certificateur': 'Fairtrade International',
                'duree_validite_ans': 3,
            },
            {
                'nom': 'UEBT (Union for Ethical BioTrade)',
                'code': 'UEBT',
                'niveau': 'uebt',
                'description': 'Certification UEBT pour l\'approvisionnement éthique',
                'organisme_certificateur': 'Union for Ethical BioTrade',
                'duree_validite_ans': 2,
            },
            {
                'nom': 'Agriculture Biologique (BIO)',
                'code': 'BIO',
                'niveau': 'bio',
                'description': 'Certification agriculture biologique',
                'organisme_certificateur': 'Ecocert / AB',
                'duree_validite_ans': 1,
            },
            {
                'nom': 'Good4Good (G4G)',
                'code': 'G4G',
                'niveau': 'g4g',
                'description': 'Certification Good4Good pour les pratiques durables',
                'organisme_certificateur': 'Good4Good',
                'duree_validite_ans': 3,
            },
            {
                'nom': 'For Life (FFL)',
                'code': 'FFL',
                'niveau': 'ffl',
                'description': 'Certification For Life pour la responsabilité sociale',
                'organisme_certificateur': 'IMO',
                'duree_validite_ans': 3,
            },
            {
                'nom': 'PACT Madagascar',
                'code': 'PACT',
                'niveau': 'pact',
                'description': 'Certification PACT Madagascar pour la conservation',
                'organisme_certificateur': 'PACT',
                'duree_validite_ans': 2,
            },
        ]
        
        created_certifications = 0
        for cert_data in certifications:
            certification, created = TypeCertification.objects.get_or_create(
                code=cert_data['code'],
                defaults={
                    'nom': cert_data['nom'],
                    'niveau': cert_data['niveau'],
                    'description': cert_data['description'],
                    'organisme_certificateur': cert_data['organisme_certificateur'],
                    'duree_validite_ans': cert_data['duree_validite_ans'],
                }
            )
            if created:
                created_certifications += 1
                self.stdout.write(f'  ✅ Type de certification créé: {certification.nom} ({certification.code})')
            else:
                self.stdout.write(f'  ⏭️  Type de certification existe déjà: {certification.nom} ({certification.code})')
        
        self.stdout.write(f'\n✅ {created_certifications} types de certifications créés\n')
        
        # ========== RÉSUMÉ ==========
        total_formations = TypeFormation.objects.count()
        total_certifications = TypeCertification.objects.count()
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('🎉 INITIALISATION TERMINÉE'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'📚 Types de formations dans la base: {total_formations}')
        self.stdout.write(f'✅ Types de certifications dans la base: {total_certifications}')
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))
