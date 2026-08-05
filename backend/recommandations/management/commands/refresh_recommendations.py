from django.core.management.base import BaseCommand
from recommandations.engine.recommendation_engine import RecommendationEngine


class Command(BaseCommand):
    help = 'Régénère les recommandations IA pour tous les producteurs'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--producteur',
            type=int,
            help='ID du producteur spécifique (optionnel)'
        )
        
        parser.add_argument(
            '--top-n',
            type=int,
            default=5,
            help='Nombre de recommandations par producteur'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Démarrage du refresh des recommandations...'))
        
        engine = RecommendationEngine()
        
        # Si un producteur spécifique est demandé
        if options['producteur']:
            producteur_id = options['producteur']
            top_n = options['top_n']
            
            self.stdout.write(f"🔄 Génération pour le producteur {producteur_id}...")
            
            try:
                recommendations = engine.get_recommendations(producteur_id, top_n=top_n)
                engine.save_recommendations(producteur_id, recommendations)
                
                self.stdout.write(self.style.SUCCESS(
                    f'✅ {len(recommendations)} recommandations générées'
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Erreur: {str(e)}'))
        
        # Sinon, tous les producteurs
        else:
            result = engine.refresh_all_recommendations()
            
            self.stdout.write(self.style.SUCCESS(
                f"✅ Terminé : {result['success']}/{result['total']} producteurs traités"
            ))
            
            if result['failed'] > 0:
                self.stdout.write(self.style.WARNING(
                    f"⚠️ {result['failed']} échecs"
                ))
